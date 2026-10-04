// Owner-only expansion: the larger project management app that BOXGO's
// equipment list composer is one part of. Everything in src/expansion/ is
// loaded only when the owner is signed in (see EquipmentManifest.jsx), as
// its own download — other accounts never fetch or run it.
//
// `app` gives the expansion what it needs from BOXGO (the equipment lists,
// catalog, houses, and ways to open / create / update a list). Add fields
// there rather than reaching into BOXGO's internals from here.
//
// BOXGO renders this in three places:
//   <Expansion part="sync">   always (owner signed in), renders nothing:
//                             loads Projects and keeps each Project and its
//                             equipment list in step (projects/sync.js)
//   <Expansion part="crumb">  the project's name in the breadcrumb
//                             (PROJECTS / HONDA TVC)
//   <Expansion part="screen"> under BOXGO's header: the Projects home
//                             (calendar + projects) and each Project page

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useXStore, load, refresh, putProject, setEventTypes, getState } from "./store.js";
import { projectActions } from "./projects/actions.js";
import { listLike, projectFromList, projectWithList, splitShootRanges } from "./projects/sync.js";
import { ProjectsHome } from "./projects/ProjectsHome.jsx";
import { ProjectPage } from "./projects/ProjectPage.jsx";
import { EventTypesModal } from "./schedule/EventTypesModal.jsx";

export default function Expansion({ app, part }) {
  if (part === "sync") return <Sync app={app} />;
  if (part === "crumb") return <Crumb app={app} />;
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

function Sync({ app }) {
  const x = useXStore();
  const types = x.settings.eventTypes;
  const checked = useRef(new Map()); // list id -> [list, project] last compared

  useEffect(() => {
    if (getState().status === "idle") load();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // BOXGO's header shows one save indicator for everything.
  useEffect(() => { app.reportSaveState(x.saveState); }, [x.saveState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Whenever an equipment list changes (edited in the equipment list
  // composer, or loaded), bring its Project in line: lists without one
  // get a Project; otherwise the list's name, houses, Producer, Gaffer and
  // shoot days are copied over. Project edits reach the list straight away
  // (projects/actions.js), so here they already agree. Only after a
  // successful load, so a failed load can never write over real Projects.
  useEffect(() => {
    if (x.status !== "ready") return;
    for (const list of app.projects) {
      const cur = getState().projects[list.id];
      const seen = checked.current.get(list.id);
      if (seen && seen[0] === list && seen[1] === cur) continue;
      if (!cur) putProject(list.id, projectFromList(list, types));
      else {
        const next = projectWithList(cur, list, types);
        if (next) putProject(list.id, next);
      }
      checked.current.set(list.id, [list, getState().projects[list.id]]);
    }
  }, [x.status, app.projects, types]); // eslint-disable-line react-hooks/exhaustive-deps

  // Older Projects could have a multi-day Shooting event: split it into one
  // Shooting event per day (lists' day ids are unchanged by this).
  useEffect(() => {
    if (x.status !== "ready") return;
    for (const [id, p] of Object.entries(x.projects)) {
      const events = splitShootRanges(p.events, types);
      if (events) putProject(id, { ...p, events });
    }
  }, [x.status, x.projects, types]); // eslint-disable-line react-hooks/exhaustive-deps

  // Projects with no equipment list show greyed in the equipment list
  // composer's project list.
  useEffect(() => {
    if (x.status !== "ready") return;
    const lists = new Set(app.projects.map((p) => p.id));
    app.reportGhosts(Object.entries(x.projects)
      .filter(([id]) => !lists.has(id))
      .map(([id, p]) => ({ ...listLike(id, p, types), ghost: true })));
  }, [x.status, x.projects, app.projects, types]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function Screen({ app }) {
  const x = useXStore();
  const [showTypes, setShowTypes] = useState(false);
  const types = x.settings.eventTypes;
  const actions = useMemo(() => projectActions(app, types), [app, types]);
  const { screen, projectId, intent } = app.route;

  useEffect(() => { window.scrollTo(0, 0); }, [screen, projectId]);

  const usage = useMemo(() => {
    const u = {};
    for (const p of Object.values(x.projects)) for (const s of p.events || []) u[s.typeId] = (u[s.typeId] || 0) + 1;
    return u;
  }, [x.projects]);

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
        onManageTypes={() => setShowTypes(true)}
      />
    );
  } else {
    body = <ProjectsHome app={app} projects={x.projects} types={types} actions={actions} onManageTypes={() => setShowTypes(true)} />;
  }

  return (
    <>
      <main className="x-main" style={{ padding: "18px 22px 60px", maxWidth: screen === "project" ? 920 : 1280, width: "100%", margin: "0 auto" }}>
        <style>{"@media (max-width: 600px) { .x-main { padding: 16px 14px 60px !important; } }"}</style>
        {body}
      </main>
      {showTypes && (
        <EventTypesModal types={types} usage={usage} onChange={setEventTypes} onClose={() => setShowTypes(false)} />
      )}
    </>
  );
}
