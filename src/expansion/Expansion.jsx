// Owner-only expansion: the larger project management app that BOXGO's
// equipment list composer is one part of. Everything in src/expansion/ is
// loaded only when the owner is signed in (see EquipmentManifest.jsx), as
// its own download — other accounts never fetch or run it.
//
// `app` gives the expansion what it needs from BOXGO (the equipment lists,
// catalog, houses, and ways to open / create / update a list). Add fields
// there rather than reaching into BOXGO's internals from here.
//
// BOXGO renders this under its own header, in two places:
//   <Expansion part="crumb">  the project's name in the breadcrumb
//                             (PROJECTS / HONDA TVC)
//   <Expansion part="screen"> the Projects home (calendar + projects) and
//                             each Project page

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useXStore, load, refresh, putProject, setStepTypes, getState } from "./store.js";
import { projectActions } from "./projects/actions.js";
import { projectFromList } from "./projects/sync.js";
import { ProjectsHome } from "./projects/ProjectsHome.jsx";
import { ProjectPage } from "./projects/ProjectPage.jsx";
import { StepTypesModal } from "./schedule/StepTypesModal.jsx";

export default function Expansion({ app, part }) {
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

function Screen({ app }) {
  const x = useXStore();
  const [showTypes, setShowTypes] = useState(false);
  const types = x.settings.stepTypes;
  const actions = useMemo(() => projectActions(app, types), [app, types]);
  const { screen, projectId, intent } = app.route;

  useEffect(() => {
    if (getState().status === "idle") load();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Every equipment list gets a Project: lists made before Projects
  // existed (or duplicated in the equipment list screens) become Projects
  // with their shoot days as Shooting steps. Only after a successful load,
  // so a failed load can never write over real Projects.
  useEffect(() => {
    if (x.status !== "ready") return;
    for (const list of app.projects) {
      if (!getState().projects[list.id]) putProject(list.id, projectFromList(list, types));
    }
  }, [x.status, app.projects, types]);

  useEffect(() => { window.scrollTo(0, 0); }, [screen, projectId]);

  // BOXGO's header shows one save indicator for everything.
  useEffect(() => { app.reportSaveState(x.saveState); }, [x.saveState]); // eslint-disable-line react-hooks/exhaustive-deps

  const usage = useMemo(() => {
    const u = {};
    for (const p of Object.values(x.projects)) for (const s of p.steps || []) u[s.typeId] = (u[s.typeId] || 0) + 1;
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
    body = <ProjectsHome app={app} projects={x.projects} types={types} actions={actions} intent={screen === "projects" ? intent : null} onManageTypes={() => setShowTypes(true)} />;
  }

  return (
    <>
      <main className="x-main" style={{ padding: "18px 22px 60px", maxWidth: screen === "project" ? 920 : 1280, width: "100%", margin: "0 auto" }}>
        <style>{"@media (max-width: 600px) { .x-main { padding: 16px 14px 60px !important; } }"}</style>
        {body}
      </main>
      {showTypes && (
        <StepTypesModal types={types} usage={usage} onChange={setStepTypes} onClose={() => setShowTypes(false)} />
      )}
    </>
  );
}
