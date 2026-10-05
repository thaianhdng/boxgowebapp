import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { todayStr, wdm } from "../shared/dates.js";
import { formatShootDateRange } from "../../lib/utils.js";
import { typeOf } from "../schedule/eventTypes.js";
import { sortEvents } from "../schedule/events.js";
import { ProjectForm } from "../shared/ProjectForm.jsx";
import { STATUSES, shootDates, staleSoftLock, statusInfo, statusOf } from "./status.js";

function nextEvent(project, today, types) {
  return sortEvents(project.events, types).find((s) => s.start && (s.end || s.start) >= today);
}

export function StatusChip({ status, style }) {
  const s = statusInfo(status);
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap",
      color: s.color, border: `1px solid ${s.color}`, borderRadius: 2, padding: "1px 4px", ...style,
    }}>
      {s.name}
    </span>
  );
}

// Which parts of the job are filled in: equipment list, budget, files.
function Parts({ hasList, project }) {
  const budget = (project.budget?.lines || []).length;
  const files = (project.files || []).length;
  const parts = [["List", hasList], ["Budget", budget > 0], [files ? `${files} file${files > 1 ? "s" : ""}` : "Files", files > 0]];
  return (
    <span style={{ display: "flex", gap: 8, marginLeft: "auto", flexShrink: 0 }}>
      {parts.map(([label, on]) => (
        <span key={label} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: on ? "var(--text)" : "var(--muted2)", opacity: on ? 1 : 0.55 }}>
          {on ? "✓ " : ""}{label}
        </span>
      ))}
    </span>
  );
}

function ProjectCard({ project, status, hasList, types, today, onOpen }) {
  const next = status !== "cancelled" && nextEvent(project, today, types);
  const nextType = next && typeOf(types, next.typeId);
  const dates = shootDates(project, types);
  const range = formatShootDateRange(dates.map((date) => ({ date })));
  const tentative = status !== "cancelled" ? (project.events || []).filter((s) => !s.confirmed && s.start).length : 0;
  const typeIds = [...new Set(sortEvents(project.events, types).map((s) => s.typeId))];
  return (
    <div
      onClick={onOpen}
      style={{
        minWidth: 0, border: "1px solid var(--border)", borderLeft: `3px solid ${statusInfo(status).color}`,
        borderRadius: 4, background: "var(--surface)", cursor: "pointer", padding: "8px 12px 10px",
        opacity: status === "cancelled" ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
        {project.tag && (
          <span style={{ fontWeight: 700, fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 2, padding: "1px 4px", flexShrink: 0 }}>{project.tag}</span>
        )}
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: status === "cancelled" ? "line-through" : "none" }}>{project.name || "Untitled"}</span>
        {range && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, color: "var(--muted2)", flexShrink: 0 }}>{range}</span>}
        <span style={{ flex: 1 }} />
        <StatusChip status={status} style={{ flexShrink: 0, alignSelf: "center" }} />
      </div>
      {!dates.length && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 3 }}>⚠ No shoot dates</div>}
      {staleSoftLock(project, types, today) && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 3 }}>⚠ Shoot dates have passed: confirm or cancel?</div>}
      {project.productionHouse && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginTop: 3 }}>{project.productionHouse}</div>}
      {next && (
        <div style={{ fontSize: 11.5, marginTop: 5, opacity: next.confirmed ? 1 : 0.6 }}>
          <span style={{ color: "var(--muted)" }}>Next </span><b style={{ color: nextType.color }}>{nextType.name}</b> <span style={{ color: "var(--text)" }}>{wdm(next.start)}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 4, marginTop: 6, alignItems: "center", minWidth: 0 }}>
        {typeIds.map((tid) => <span key={tid} title={typeOf(types, tid).name} style={{ width: 8, height: 8, borderRadius: 2, background: typeOf(types, tid).color, flexShrink: 0 }} />)}
        {tentative > 0 && <span style={{ fontSize: 10.5, color: "var(--muted)", marginLeft: typeIds.length ? 4 : 0, whiteSpace: "nowrap" }}>{tentative} tentative</span>}
        <Parts hasList={hasList} project={project} />
      </div>
    </div>
  );
}

// Grouped by status. Within a group: projects missing shoot dates first
// (to fix), then upcoming ones soonest first; Done and Cancelled most
// recent first.
function arrange(entries, today, types) {
  const groups = Object.fromEntries(STATUSES.map((s) => [s.id, []]));
  for (const e of entries) {
    const dates = shootDates(e.project, types);
    groups[e.status].push({ ...e, first: dates[0] || "", last: dates[dates.length - 1] || "" });
  }
  const soonest = (a, b) => (!a.first || !b.first ? (a.first ? 1 : 0) - (b.first ? 1 : 0) : a.first.localeCompare(b.first));
  const latest = (a, b) => (b.last || "").localeCompare(a.last || "");
  for (const id of ["shooting", "confirmed", "softlock"]) groups[id].sort(soonest);
  for (const id of ["done", "cancelled"]) groups[id].sort(latest);
  return STATUSES.map((s) => [s, groups[s.id]]);
}

const FOLD_KEY = "boxgo-x-folded-statuses";
function readFolded() {
  try {
    const v = JSON.parse(localStorage.getItem(FOLD_KEY));
    if (Array.isArray(v)) return new Set(v);
  } catch { /* private window etc. */ }
  return new Set(["done", "cancelled"]);
}

// The Projects module's home: search, Create New, and every project by
// status. Tap a project for its page.
export function ProjectsHome({ app, projects, types, actions }) {
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [only, setOnly] = useState(null); // a status id, or null for all
  const [folded, setFolded] = useState(readFolded);
  const today = todayStr();

  const toggleFold = (id) => setFolded((f) => {
    const n = new Set(f);
    if (n.has(id)) n.delete(id); else n.add(id);
    try { localStorage.setItem(FOLD_KEY, JSON.stringify([...n])); } catch { /* ignore */ }
    return n;
  });

  const entries = useMemo(() => {
    const query = q.trim().toLowerCase();
    return Object.entries(projects)
      .filter(([, p]) => !query || [p.name, p.tag, p.productionHouse, p.rentalHouse, ...(p.people || []).map((x) => x.name)]
        .some((v) => (v || "").toLowerCase().includes(query)))
      .map(([id, project]) => ({ id, project, status: statusOf(project, types, today) }));
  }, [projects, q, types, today]);
  const groups = useMemo(() => arrange(entries, today, types), [entries, today, types]);
  const count = (id) => entries.filter((e) => e.status === id).length;

  const chip = (id, label, n) => {
    const on = only === id;
    const color = id ? statusInfo(id).color : "var(--accent)";
    return (
      <button
        key={id || "all"}
        type="button"
        onClick={() => setOnly(on ? null : id)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit",
          fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 3,
          border: `1px solid ${on ? color : "var(--border2)"}`, background: on ? "var(--surface2)" : "transparent",
          color: on ? "var(--text)" : "var(--muted)",
        }}
      >
        {id && <span style={{ width: 7, height: 7, borderRadius: 2, background: color }} />}
        {label} <span style={{ color: "var(--muted2)", fontWeight: 600 }}>{n}</span>
      </button>
    );
  };

  const shown = groups.filter(([s, list]) => list.length && (!only || only === s.id));

  const cards = (list) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
      {list.map(({ id, project, status }) => (
        <ProjectCard
          key={id}
          project={project}
          status={status}
          hasList={actions.hasList(id)}
          types={types}
          today={today}
          onOpen={() => app.go({ screen: "project", projectId: id })}
        />
      ))}
    </div>
  );
  // Done projects by year of their last shoot day (newest year first), each
  // year foldable.
  const byYear = (list) => {
    const years = [];
    for (const e of list) {
      const y = e.last ? e.last.slice(0, 4) : "No date";
      const cur = years[years.length - 1];
      if (cur && cur[0] === y) cur[1].push(e); else years.push([y, [e]]);
    }
    return years.map(([y, l]) => {
      const key = `done-${y}`;
      const closed = folded.has(key);
      return (
        <div key={y} style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => toggleFold(key)}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "0 0 0 18px", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}
          >
            {closed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            {y} <span style={{ color: "var(--muted2)", fontWeight: 600 }}>{l.length}</span>
          </button>
          {!closed && cards(l)}
        </div>
      );
    });
  };

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

      {Object.keys(projects).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {chip(null, "All", entries.length)}
          {STATUSES.filter((s) => count(s.id)).map((s) => chip(s.id, s.name, count(s.id)))}
        </div>
      )}

      {/* Desktop: the dashed Create New card, as in the equipment list. */}
      <button
        className="new-project-card"
        onClick={() => setCreating(true)}
        style={{
          width: "100%", border: "1px dashed var(--border2)", borderRadius: 4, background: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          color: "var(--accent)", minHeight: 56, fontSize: 13, fontWeight: 600, marginBottom: 18,
        }}
      >
        <Plus size={18} /> Create New
      </button>

      {Object.keys(projects).length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)", fontSize: 13 }}>No projects yet. Create your first one.</div>
      )}
      {Object.keys(projects).length > 0 && shown.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)", fontSize: 13 }}>No projects match your search.</div>
      )}

      {shown.map(([s, list]) => {
        const closed = !only && folded.has(s.id);
        return (
          <div key={s.id} style={{ marginBottom: 20 }}>
            <button
              type="button"
              className="stencil"
              onClick={() => !only && toggleFold(s.id)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, cursor: only ? "default" : "pointer", fontFamily: "inherit", fontSize: 11, color: "var(--muted)", marginBottom: 8 }}
            >
              {!only && (closed ? <ChevronRight size={13} /> : <ChevronDown size={13} />)}
              <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color }} />
              {s.name} <span style={{ color: "var(--muted2)" }}>{list.length}</span>
            </button>
            {!closed && (s.id === "done" ? byYear(list) : cards(list))}
          </div>
        );
      })}

      {creating && (
        // The equipment list composer's Create New window, without the
        // equipment-only parts: a new project starts with no list.
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
