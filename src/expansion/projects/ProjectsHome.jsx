import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileSpreadsheet, Paperclip, Plus, Search } from "lucide-react";
import { todayStr, wdm } from "../shared/dates.js";
import { formatShootDateRange } from "../../lib/utils.js";
import { typeOf, shootTypeId } from "../schedule/eventTypes.js";
import { sortEvents } from "../schedule/events.js";
import { ProjectForm } from "../shared/ProjectForm.jsx";
import { STATUSES, shootDates, staleSoftLock, statusInfo, statusOf } from "./status.js";
import { Fold } from "../../components/Motion.jsx";

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

// What the job has, as icons in the bottom right corner: files (paperclip
// and count, only when there are some; tap it for the project's Files),
// then the equipment list sheet,
// always in the corner — white when the job has a list (tap it to open the
// list), greyed when it has none.
function Parts({ hasList, files, onOpenList, onOpenFiles }) {
  return (
    <span style={{ marginLeft: "auto", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text)", alignSelf: "center" }}>
      {files > 0 && (
        <button
          type="button"
          title={`${files} file${files > 1 ? "s" : ""}: open the project's Files`}
          onClick={(e) => { e.stopPropagation(); onOpenFiles(); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 2, fontWeight: 700, fontSize: "inherit", fontFamily: "inherit", background: "none", border: "none", padding: 6, margin: -6, color: "inherit", cursor: "pointer" }}
        >
          <Paperclip size={12} />{files}
        </button>
      )}
      {hasList ? (
        <button
          type="button"
          title="Open the equipment list"
          onClick={(e) => { e.stopPropagation(); onOpenList(); }}
          style={{ display: "inline-flex", background: "none", border: "none", padding: 6, margin: -6, color: "inherit", cursor: "pointer" }}
        >
          <FileSpreadsheet size={13} />
        </button>
      ) : (
        <span title="No equipment list yet" style={{ display: "inline-flex", color: "var(--muted2)" }}><FileSpreadsheet size={13} /></span>
      )}
    </span>
  );
}

// The Producer / Gaffer set in Create New / Edit (kept in `people`).
function roleName(people, exact, loose) {
  const list = people || [];
  const p = list.find((x) => (x.role || "").trim().toLowerCase() === exact) || list.find((x) => loose.test(x.role || ""));
  return p ? (p.name || "").trim() : "";
}

const oneLine = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

// Laid out like the equipment list's project cards (same size and lines):
// name · shoot dates, Production House + Producer · Rental House + Gaffer,
// the notes, shoot locations, then the next event and what the job has
// (icons, bottom right: files, then the equipment list sheet).
// The tag sits in the top right corner.
function ProjectCard({ project, status, hasList, types, today, onOpen, onOpenList, onOpenFiles }) {
  const next = status !== "cancelled" && nextEvent(project, today, types);
  const nextType = next && typeOf(types, next.typeId);
  const dates = shootDates(project, types);
  const range = formatShootDateRange(dates.map((date) => ({ date })));
  const files = (project.files || []).length;
  const producer = roleName(project.people, "producer", /producer/i);
  const gaffer = roleName(project.people, "gaffer", /gaffer/i);
  const shootId = shootTypeId(types);
  const locs = [...new Set((project.events || []).filter((s) => s.typeId === shootId && s.mode !== "online").map((s) => (s.location || "").trim()).filter(Boolean))];
  // A house and its person stay together on one line, cut off with "…"
  // when longer than the card.
  const pair = (house, person) => (house || person) && (
    <span style={{ display: "block", minWidth: 0, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {house && <span style={{ fontWeight: 700, letterSpacing: 0.3, color: "var(--text)" }}>{house}</span>}
      {house && person && " "}{person && <span>{person}</span>}
    </span>
  );
  return (
    <div
      className="m-card"
      onClick={onOpen}
      style={{
        position: "relative", minWidth: 0, border: "1px solid var(--border)", borderLeft: `3px solid ${statusInfo(status).color}`,
        borderRadius: 4, background: "var(--surface)", cursor: "pointer", padding: "8px 12px 12px", display: "flex", flexDirection: "column",
        opacity: status === "cancelled" ? 0.6 : 1,
      }}
    >
      {/* Flowing text, like the equipment list's cards: the dates follow
          the name and a long name wraps. The tag floats in the top right
          corner, so only the first line makes room for it. */}
      <div style={{ fontSize: 13, lineHeight: "18px", marginBottom: 3, minWidth: 0 }}>
        {project.tag && <span className="tag-box" style={{ float: "right", marginLeft: 8, marginTop: 2, fontWeight: 700, letterSpacing: 0.4, color: "var(--accent)" }}>{project.tag}</span>}
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3, color: "var(--text)", textTransform: "uppercase", marginRight: 7, overflowWrap: "anywhere", textDecoration: status === "cancelled" ? "line-through" : "none" }}>{project.name || "Untitled"}</span>
        {range && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, color: "var(--muted2)", whiteSpace: "nowrap" }}>{range}</span>}
      </div>
      {(project.productionHouse || producer || project.rentalHouse || gaffer) && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, rowGap: 3, fontSize: 11, color: "var(--muted)" }}>
          {pair(project.productionHouse, producer)}
          {pair(project.rentalHouse, gaffer)}
        </div>
      )}
      {project.notes && (
        <div title={project.notes} style={{ fontSize: 10.5, color: "var(--muted2)", marginTop: 4, ...oneLine }}>{project.notes.replace(/\s*\n+\s*/g, " · ")}</div>
      )}
      {locs.length > 0 && <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>{locs.join(" · ")}</div>}
      {!dates.length && <div style={{ fontSize: 10.5, color: "var(--accent)", marginTop: 4 }}>⚠ No shoot dates</div>}
      {staleSoftLock(project, types, today) && <div style={{ fontSize: 10.5, color: "var(--accent)", marginTop: 4 }}>⚠ Shoot dates have passed: confirm or cancel?</div>}
      {/* The last row, kept at the card's foot: the next event, and what
          the job has in the bottom right corner. */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: "auto", paddingTop: 5, fontSize: 10.5, minWidth: 0 }}>
        {next && (
          <span style={{ minWidth: 0, ...oneLine }}>
            <span style={{ color: "var(--muted)" }}>Next </span><b style={{ color: nextType.color }}>{nextType.name}</b> <span style={{ color: "var(--text)" }}>{wdm(next.start)}</span>
          </span>
        )}
        <Parts hasList={hasList} files={files} onOpenList={onOpenList} onOpenFiles={onOpenFiles} />
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
  const shown = groups.filter(([, list]) => list.length);
  // While searching, every group is open so no match hides in a folded one.
  const searching = q.trim() !== "";
  const isFolded = (key) => !searching && folded.has(key);

  const cards = (list) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
      {list.map(({ id, project, status }) => (
        <ProjectCard
          key={id}
          project={project}
          status={status}
          hasList={actions.hasList(id)}
          types={types}
          today={today}
          onOpen={() => app.go({ screen: "project", projectId: id })}
          onOpenList={() => { const list = actions.currentListOf(id); if (list) app.openEquipmentList(list.id); }}
          onOpenFiles={() => app.go({ screen: "project", projectId: id, intent: "files" })}
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
      const closed = isFolded(key);
      return (
        <div key={y} style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => toggleFold(key)}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "0 0 0 18px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}
          >
            {closed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            {y} <span style={{ color: "var(--muted2)", fontWeight: 600 }}>{l.length}</span>
          </button>
          <Fold open={!closed}>{cards(l)}</Fold>
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
        const closed = isFolded(s.id);
        return (
          <div key={s.id} style={{ marginBottom: 20 }}>
            <button
              type="button"
              className="stencil"
              onClick={() => toggleFold(s.id)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}
            >
              {closed ? <ChevronRight size={15} strokeWidth={2.5} /> : <ChevronDown size={15} strokeWidth={2.5} />}
              <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} />
              {s.name} <span style={{ color: "var(--muted)", fontWeight: 700 }}>{list.length}</span>
            </button>
            <Fold open={!closed}>{s.id === "done" ? byYear(list) : cards(list)}</Fold>
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
