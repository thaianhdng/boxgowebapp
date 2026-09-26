import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Logo } from "../../components/Logo.jsx";
import { dm, todayStr, wdm } from "../shared/dates.js";
import { typeOf } from "../schedule/stepTypes.js";
import { sortSteps, projectSpan } from "../schedule/steps.js";
import { ProjectInfoModal } from "./ProjectInfoModal.jsx";

function nextStep(project, today) {
  return sortSteps(project.steps).find((s) => s.start && (s.end || s.start) >= today);
}

function ProjectCard({ project, types, today, hasList, onOpen }) {
  const next = nextStep(project, today);
  const nextType = next && typeOf(types, next.typeId);
  const span = projectSpan(project);
  const tentative = (project.steps || []).filter((s) => !s.confirmed && s.start).length;
  const typeIds = [...new Set(sortSteps(project.steps).map((s) => s.typeId))];
  return (
    <div
      onClick={onOpen}
      style={{
        minWidth: 0, border: "1px solid var(--border)", borderLeft: `3px solid ${nextType ? nextType.color : "var(--border2)"}`,
        borderRadius: 4, background: "var(--surface)", cursor: "pointer", padding: "8px 12px 10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
        {project.tag && (
          <span style={{ fontWeight: 700, fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 2, padding: "1px 4px", flexShrink: 0 }}>{project.tag}</span>
        )}
        <span style={{ fontSize: 14, fontWeight: 800, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name || "Untitled"}</span>
        {hasList && <span title="Has an equipment list" style={{ color: "var(--muted)", flexShrink: 0 }}><Logo size={12} /></span>}
      </div>
      {project.productionHouse && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{project.productionHouse}</div>}
      <div style={{ fontSize: 12, marginTop: 6, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {next ? (
          <span style={{ opacity: next.confirmed ? 1 : 0.6 }}>
            <b style={{ color: nextType.color }}>{nextType.name}</b> <span style={{ color: "var(--text)" }}>{wdm(next.start)}</span>
          </span>
        ) : (
          <span style={{ color: "var(--muted2)" }}>{span ? `Ended ${dm(span.last)}` : "No dates yet"}</span>
        )}
        {span && span.first !== span.last && <span style={{ color: "var(--muted2)" }}>· {dm(span.first)} → {dm(span.last)}</span>}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 7, alignItems: "center" }}>
        {typeIds.map((tid) => <span key={tid} title={typeOf(types, tid).name} style={{ width: 8, height: 8, borderRadius: 2, background: typeOf(types, tid).color }} />)}
        {tentative > 0 && <span style={{ fontSize: 10.5, color: "var(--muted)", marginLeft: typeIds.length ? 4 : 0 }}>{tentative} tentative</span>}
      </div>
    </div>
  );
}

// Upcoming projects first (soonest next step at the top), then past ones
// (most recent first), then ones with no dates.
function arrange(entries, today) {
  const upcoming = [], past = [], undated = [];
  for (const e of entries) {
    const next = nextStep(e.project, today);
    const span = projectSpan(e.project);
    if (next) upcoming.push({ ...e, key: next.start });
    else if (span) past.push({ ...e, key: span.last });
    else undated.push({ ...e, key: String(e.project.createdAt || 0) });
  }
  upcoming.sort((a, b) => a.key.localeCompare(b.key));
  past.sort((a, b) => b.key.localeCompare(a.key));
  undated.sort((a, b) => b.key.localeCompare(a.key));
  return [["Upcoming", upcoming], ["No dates yet", undated], ["Past", past]].filter(([, l]) => l.length);
}

export function ProjectsHome({ app, projects, types, actions, intent }) {
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const today = todayStr();

  // Coming from the equipment list's "Create New".
  useEffect(() => {
    if (intent === "new") setCreating(true);
  }, [intent, app.route.t]);

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const entries = Object.entries(projects)
      .map(([id, project]) => ({ id, project }))
      .filter(({ project: p }) => !query || [p.name, p.tag, p.productionHouse, p.rentalHouse, ...(p.people || []).map((x) => x.name)]
        .some((v) => (v || "").toLowerCase().includes(query)));
    return arrange(entries, today);
  }, [projects, q, today]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 9, top: 9, color: "var(--muted)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" style={{ width: "100%", paddingLeft: 30, fontSize: 13 }} />
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)} style={{ flexShrink: 0 }}><Plus size={14} /> New project</button>
      </div>

      {Object.keys(projects).length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)", fontSize: 13 }}>No projects yet. Create your first one.</div>
      )}
      {Object.keys(projects).length > 0 && groups.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)", fontSize: 13 }}>No projects match your search.</div>
      )}

      {groups.map(([title, list]) => (
        <div key={title} style={{ marginBottom: 20 }}>
          <div className="stencil" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>{title}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {list.map(({ id, project }) => (
              <ProjectCard
                key={id}
                project={project}
                types={types}
                today={today}
                hasList={actions.hasList(id)}
                onOpen={() => app.go({ screen: "project", projectId: id })}
              />
            ))}
          </div>
        </div>
      ))}

      {creating && (
        <ProjectInfoModal
          isNew
          app={app}
          onClose={() => setCreating(false)}
          onSave={(info) => {
            const id = actions.create(info);
            setCreating(false);
            app.go({ screen: "project", projectId: id });
          }}
        />
      )}
    </div>
  );
}
