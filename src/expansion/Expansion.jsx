// Owner-only expansion: the larger project management app that BOXGO's
// equipment list composer is one part of. Everything in src/expansion/ is
// loaded only when the owner is signed in (see EquipmentManifest.jsx), as
// its own download — other accounts never fetch or run it.
//
// `app` gives the expansion what it needs from BOXGO (the equipment lists,
// catalog, houses, and ways to open / create / update a list). Add fields
// there rather than reaching into BOXGO's internals from here.
//
// BOXGO renders this in two places:
//   <Expansion part="nav">    the Projects · Calendar · Equipment bar, on
//                             top of the equipment list screens
//   <Expansion part="screen"> the Projects and Calendar screens

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import Nav from "./Nav.jsx";
import { useXStore, load, refresh, putProject, setStepTypes, getState } from "./store.js";
import { projectActions } from "./projects/actions.js";
import { projectFromList } from "./projects/sync.js";
import { ProjectsHome } from "./projects/ProjectsHome.jsx";
import { ProjectPage } from "./projects/ProjectPage.jsx";
import { CalendarScreen } from "./calendar/CalendarScreen.jsx";
import { StepTypesModal } from "./schedule/StepTypesModal.jsx";

export default function Expansion({ app, part }) {
  if (part === "nav") return <Nav app={app} />;
  return <Screen app={app} />;
}

function SaveState({ saveState }) {
  if (saveState === "saving") return <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Loader2 size={12} className="spin" /> saving</span>;
  if (saveState === "saved") return <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Check size={12} /> saved</span>;
  if (saveState === "error") return <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--danger)" }}><X size={12} /> couldn't save — check your connection</span>;
  return null;
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
  } else if (screen === "calendar") {
    body = <CalendarScreen app={app} projects={x.projects} types={types} onManageTypes={() => setShowTypes(true)} />;
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
    body = <ProjectsHome app={app} projects={x.projects} types={types} actions={actions} intent={screen === "projects" ? intent : null} />;
  }

  return (
    <>
      <Nav app={app} />
      <main style={{ padding: "16px 16px 60px", maxWidth: 920, width: "100%", margin: "0 auto" }}>
        <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", justifyContent: "flex-end", minHeight: 14, marginTop: -6, marginBottom: 2 }}>
          <SaveState saveState={x.saveState} />
        </div>
        {body}
      </main>
      {showTypes && (
        <StepTypesModal types={types} usage={usage} onChange={setStepTypes} onClose={() => setShowTypes(false)} />
      )}
    </>
  );
}
