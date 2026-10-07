// Owner-only expansion: the larger project management app that BOXGO's
// equipment list composer is one part of. Everything in src/expansion/ is
// loaded only when the owner is signed in (see EquipmentManifest.jsx), as
// its own download — other accounts never fetch or run it.
//
// `app` gives the expansion what it needs from BOXGO (the equipment lists,
// catalog, houses, and ways to open / create / update a list). Add fields
// there rather than reaching into BOXGO's internals from here.
//
// BOXGO renders this in these places:
//   <Expansion part="sync">   always (owner signed in), renders nothing:
//                             loads Projects and keeps each Project and its
//                             equipment lists (versions) in step
//                             (projects/sync.js)
//   <Expansion part="crumb">  the project's name in the breadcrumb
//                             (PROJECTS / HONDA TVC)
//   <Expansion part="settings"> Settings → Preferences → Event Types
//   <Expansion part="target">  "where does this list go?" (Duplicate,
//                             Create New, Add to project… in the equipment
//                             list composer)
//   <Expansion part="screen"> under BOXGO's header, by app.route.screen:
//                             "projects" the Projects home (every project
//                             by status), "calendar" the Calendar (every
//                             project's events), "project" a Project page
//                             (route.from = "calendar" when opened there)

import { useEffect, useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useXStore, load, refresh, putProject, setEventTypes, getState, exportBackup, restoreBackup, wipeAll, removeProjects, projectIds } from "./store.js";
import { projectActions } from "./projects/actions.js";
import { currentLink, equipmentPatch, fitList, linksOf, listLike, listNoteOf, mergedNotes, ownersOf, projectWithList, shootDaysOf, splitShootRanges } from "./projects/sync.js";
import { shootDates, statusOf } from "./projects/status.js";
import { todayStr } from "./shared/dates.js";
import { ProjectsHome } from "./projects/ProjectsHome.jsx";
import { ProjectPage } from "./projects/ProjectPage.jsx";
import { CalendarHome } from "./calendar/CalendarHome.jsx";
import { ListTarget } from "./projects/ListTarget.jsx";
import { EventTypesEditor } from "./schedule/EventTypesEditor.jsx";

export default function Expansion({ app, part, request }) {
  if (part === "sync") return <Sync app={app} />;
  if (part === "target") return <Target app={app} request={request} />;
  if (part === "crumb") return <Crumb app={app} />;
  if (part === "settings") return <CalendarSettings />;
  return <Screen app={app} />;
}

function Crumb({ app }) {
  const x = useXStore();
  const p = x.projects[app.route.projectId];
  return (
    <span className="stencil" style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", minWidth: 0 }}>
      {p?.tag && <span style={{ fontSize: 11, flexShrink: 0, color: "var(--muted)" }}>{p.tag}</span>}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", color: "var(--accent)" }}>{p?.name || "Project"}</span>
    </span>
  );
}

// Settings → Preferences → Event Types (owner only): the event types, their colours /
// order. Shown inside BOXGO's Settings window.
// The equipment list composer's "where does this list go?" window
// (Duplicate, Create New, Add to project…): `request` = { mode, listId,
// onPick, onClose } (see projects/ListTarget.jsx).
function Target({ app, request }) {
  const x = useXStore();
  const types = x.settings.eventTypes;
  const actions = useMemo(() => projectActions(app, types), [app, types]);
  if (x.status !== "ready" || !request) return null;
  return <ListTarget mode={request.mode} listId={request.listId} projects={x.projects} types={types} actions={actions} onPick={request.onPick} onClose={request.onClose} />;
}

function CalendarSettings() {
  const x = useXStore();
  const types = x.settings.eventTypes;
  const usage = useMemo(() => {
    const u = {};
    for (const p of Object.values(x.projects)) for (const s of p.events || []) u[s.typeId] = (u[s.typeId] || 0) + 1;
    return u;
  }, [x.projects]);
  if (x.status !== "ready") return <div style={{ fontSize: 12, color: "var(--muted)" }}>Loading…</div>;
  return <EventTypesEditor types={types} usage={usage} onChange={setEventTypes} />;
}

function Sync({ app }) {
  const x = useXStore();
  const types = x.settings.eventTypes;
  const checked = useRef(new Map()); // list id -> list object last compared
  const live = useRef({ app, types });
  live.current = { app, types };

  useEffect(() => {
    if (getState().status === "idle") load();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // BOXGO's Backup / Restore (Settings) carries the Projects and Calendar
  // data too, for the owner. And the equipment list composer links lists
  // to Projects through these (Create New, Duplicate, Add to project…).
  useEffect(() => {
    app.registerBackup({ export: exportBackup, restore: restoreBackup, wipe: wipeAll, remove: removeProjects, ids: projectIds });
    const acts = () => projectActions(live.current.app, live.current.types);
    app.registerLinks({
      link: (list, target) => acts().link(list, target),
      attach: (listId, target) => acts().attach(listId, target),
      unlink: (listId) => acts().unlink(listId),
    });
    return () => { app.registerBackup(null); app.registerLinks(null); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // BOXGO's header shows one save indicator for everything.
  useEffect(() => { app.reportSaveState(x.saveState); }, [x.saveState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Whenever an equipment list changes (edited in the equipment list
  // composer, or loaded), bring its Project in line — the list's name,
  // houses, Producer, Gaffer and shoot days are copied over — and from
  // there its other versions. Lists in no Project (drafts) are left alone.
  // Project edits reach the lists straight away (projects/actions.js), so
  // here they already agree. Per Project, only one changed list is read
  // per pass (the current version first); its other versions are brought
  // in line with it rather than read, so two versions can never undo each
  // other. Only after a successful load, so a failed load can never write
  // over real Projects.
  useEffect(() => {
    if (x.status !== "ready") return;
    const listIds = new Set(app.projects.map((p) => p.id));
    const byId = new Map(app.projects.map((l) => [l.id, l]));
    const done = new Set();
    for (const [pid, p0] of Object.entries(getState().projects)) {
      const links = linksOf(pid, p0, listIds);
      if (!links.length) continue;
      const cur = currentLink(links, p0);
      // Once: the Project's note and its lists' notes become one shared
      // project note (lists keep a different note of their own).
      if (!p0.notesShared) {
        const versions = links.map((l) => { const list = byId.get(l.id); return { id: l.id, note: list.note, listNote: listNoteOf(list, l) }; });
        const merged = mergedNotes(p0, versions, cur.id);
        putProject(pid, { ...p0, notes: merged.notes, notesShared: true });
        for (const [id, patch] of Object.entries(merged.lists)) app.updateEquipmentList(id, patch);
        links.forEach((l) => checked.current.set(l.id, byId.get(l.id)));
        continue;
      }
      const ordered = [cur, ...links.filter((l) => l !== cur)];
      for (const l of ordered) {
        const list = byId.get(l.id);
        if (checked.current.get(l.id) === list) continue;
        checked.current.set(l.id, list);
        if (done.has(pid)) continue;
        const project = getState().projects[pid];
        // A list that has just joined and doesn't have the Project's shoot
        // days yet is brought to the Project, never read into it.
        const shootIds = new Set(shootDaysOf(project, types).map((d) => d.id));
        if (shootIds.size && !(list.days || []).some((d) => shootIds.has(d.id))) {
          const { id: _id, ...patch } = fitList(list, project, types); // eslint-disable-line no-unused-vars
          app.updateEquipmentList(l.id, patch);
          continue;
        }
        const next = projectWithList(project, list, types);
        if (!next) continue;
        done.add(pid);
        putProject(pid, next);
        for (const o of links) {
          if (o.id === l.id) continue;
          const patch = equipmentPatch(next, types, byId.get(o.id));
          if (patch) app.updateEquipmentList(o.id, patch);
        }
      }
    }
  }, [x.status, app.projects, types]); // eslint-disable-line react-hooks/exhaustive-deps

  // A draft list (in no project) has no project note: a note it still has
  // (it left a project, or was made before drafts were bare-bone) becomes
  // its list note.
  useEffect(() => {
    if (x.status !== "ready") return;
    const owners = ownersOf(x.projects, new Set(app.projects.map((l) => l.id)));
    for (const l of app.projects) {
      const own = (l.note || "").trim();
      if (!own || owners.has(l.id)) continue;
      const listNote = (l.listNote || "").includes(own) ? l.listNote : [l.listNote, own].filter(Boolean).join("\n");
      app.updateEquipmentList(l.id, { note: "", listNote });
    }
  }, [x.status, x.projects, app.projects]); // eslint-disable-line react-hooks/exhaustive-deps

  // Older Projects could have a multi-day Shooting event: split it into one
  // Shooting event per day (lists' day ids are unchanged by this).
  // Projects from before statuses existed whose shoot days are all past
  // (jobs that happened, mostly made in the equipment list) become
  // Confirmed (so they show Done), instead of looking like a Soft lock.
  useEffect(() => {
    if (x.status !== "ready") return;
    const today = todayStr();
    for (const [id, p] of Object.entries(x.projects)) {
      const events = splitShootRanges(p.events, types);
      if (events) { putProject(id, { ...p, events }); continue; }
      if (!p.status && shootDates(p, types).length && statusOf(p, types, today) === "done") {
        putProject(id, { ...p, status: "confirmed" });
      }
    }
  }, [x.status, x.projects, types]); // eslint-disable-line react-hooks/exhaustive-deps

  // What the equipment list composer's project list needs: each list's
  // Project and version (only current versions get a card), greyed cards
  // for Projects with no list, and a "Cancelled" mark for cancelled jobs'
  // lists (owner's project list and crumb only — never the preview, PDF or
  // share page).
  useEffect(() => {
    if (x.status !== "ready") return;
    const listIds = new Set(app.projects.map((p) => p.id));
    const today = todayStr();
    const byId = new Map(app.projects.map((l) => [l.id, l]));
    const meta = {};
    const ghosts = [];
    const cancelled = [];
    for (const [pid, p] of Object.entries(x.projects)) {
      const links = linksOf(pid, p, listIds);
      const isCancelled = statusOf(p, types, today) === "cancelled";
      if (!links.length) {
        if (!isCancelled) ghosts.push({ ...listLike(pid, p, types), ghost: true });
        continue;
      }
      const cur = currentLink(links, p);
      const versions = [...links].sort((a, b) => a.v - b.v).map((l) => ({ id: l.id, v: l.v, note: listNoteOf(byId.get(l.id), l) }));
      for (const l of links) {
        meta[l.id] = { projectId: pid, v: l.v, note: listNoteOf(byId.get(l.id), l), count: links.length, current: l === cur, versions };
        if (isCancelled) cancelled.push(l.id);
      }
    }
    app.reportGhosts(ghosts);
    app.reportCancelled(cancelled);
    app.reportListMeta(meta);
  }, [x.status, x.projects, app.projects, types]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function Screen({ app }) {
  const x = useXStore();
  const types = x.settings.eventTypes;
  const actions = useMemo(() => projectActions(app, types), [app, types]);
  const { screen, projectId, intent } = app.route;

  useEffect(() => { window.scrollTo(0, 0); }, [screen, projectId]);


  let body;
  if (x.status === "error") {
    body = (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)", fontSize: 13 }}>
        <div style={{ marginBottom: 12 }}>{x.error}</div>
        <button className="btn btn-primary" onClick={load}>Retry</button>
      </div>
    );
  } else if (x.status !== "ready") {
    body = <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: 60, color: "var(--muted)", fontSize: 13 }}><Loader2 size={16} className="spin" /> Loading…</div>;
  } else if (screen === "project" && x.projects[projectId]) {
    body = (
      <ProjectPage
        key={projectId}
        app={app}
        id={projectId}
        project={x.projects[projectId]}
        allProjects={x.projects}
        types={types}
        actions={actions}
        intent={intent}
      />
    );
  } else if (screen === "calendar") {
    body = <CalendarHome app={app} projects={x.projects} types={types} actions={actions} />;
  } else {
    body = <ProjectsHome app={app} projects={x.projects} types={types} actions={actions} />;
  }

  return (
    <>
      {/* The Projects home keeps the equipment list's page margins (22px) on a
          phone too, so its cards are the same size; the Calendar and Project
          pages use narrower phone margins to give the month grid more room. */}
      <main className={screen === "project" || screen === "calendar" ? "x-main x-tight" : "x-main"} style={{ padding: "18px 22px 60px", maxWidth: screen === "project" ? 920 : 1280, width: "100%", margin: "0 auto" }}>
        <style>{`
          .x-jump { margin-left: -22px; margin-right: -22px; padding: 8px 22px; border-bottom: 1px solid var(--border); }
          @media (max-width: 600px) {
            .x-tight { padding: 16px 14px 60px !important; }
            .x-tight .x-jump { margin-left: -14px; margin-right: -14px; padding: 8px 14px; }
          }
        `}</style>
        {body}
      </main>
    </>
  );
}
