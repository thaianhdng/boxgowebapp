import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Logo } from "../../components/Logo.jsx";
import { dm, todayStr, wdm } from "../shared/dates.js";
import { typeOf } from "../schedule/stepTypes.js";
import { sortSteps, projectSpan } from "../schedule/steps.js";
import { ProjectForm } from "../shared/ProjectForm.jsx";
import { CalendarPanel } from "../calendar/CalendarPanel.jsx";
import { useWide } from "../calendar/MonthGrid.jsx";

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

// The owner's home: every project's steps on one calendar, and the list
// of projects. Side by side on a wide screen, calendar first on a phone.
export function ProjectsHome({ app, projects, types, actions, onManageTypes }) {
  const wide = useWide(1000);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const today = todayStr();

  // One search for both the calendar and the project cards.
  const matching = useMemo(() => {
    const query = q.trim().toLowerCase();
    return Object.fromEntries(Object.entries(projects).filter(([, p]) => !query ||
      [p.name, p.tag, p.productionHouse, p.rentalHouse, ...(p.people || []).map((x) => x.name)]
        .some((v) => (v || "").toLowerCase().includes(query))));
  }, [projects, q]);
  const groups = useMemo(
    () => arrange(Object.entries(matching).map(([id, project]) => ({ id, project })), today),
    [matching, today],
  );

  const list = (
    <div style={{ minWidth: 0 }}>
      {/* Desktop: the dashed Create New card, as in the equipment list. */}
      <button
        className="new-project-card"
        onClick={() => setCreating(true)}
        style={{
          width: "100%", border: "1px dashed var(--border2)", borderRadius: 4, background: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          color: "var(--accent)", minHeight: 56, fontSize: 13, fontWeight: 600, marginBottom: 14,
        }}
      >
        <Plus size={18} /> Create New
      </button>

      {Object.keys(projects).length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)", fontSize: 13 }}>No projects yet. Create your first one.</div>
      )}
      {Object.keys(projects).length > 0 && groups.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)", fontSize: 13 }}>No projects match your search.</div>
      )}

      {groups.map(([title, entries]) => (
        <div key={title} style={{ marginBottom: 20 }}>
          <div className="stencil" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>{title}</div>
          <div style={{ display: "grid", gridTemplateColumns: wide ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {entries.map(({ id, project }) => (
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
    </div>
  );
  const calendar = (
    <div style={{ minWidth: 0, marginBottom: 22 }}>
      <CalendarPanel app={app} projects={matching} types={types} onManageTypes={onManageTypes} />
    </div>
  );

  return (
    <div>
      {/* Same search bar and Create New as the equipment list's project list. */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={14} style={{ position: "absolute", left: 9, top: 9, color: "var(--muted)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" style={{ width: "100%", paddingLeft: 30, fontSize: 13 }} />
      </div>
      <button className="new-project-row-btn btn btn-primary" onClick={() => setCreating(true)} style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>
        <Plus size={14} /> Create New
      </button>

      {wide ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: 28, alignItems: "start" }}>
          {calendar}
          {list}
        </div>
      ) : (
        <>
          {calendar}
          {list}
        </>
      )}

      {creating && (
        // The equipment list composer's Create New window, without the
        // equipment-only parts: a Calendar project starts with no list.
        <ProjectForm
          app={app}
          noList
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
