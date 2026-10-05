import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { todayStr, wdm } from "../shared/dates.js";
import { formatShootDateRange } from "../../lib/utils.js";
import { Modal } from "../shared/ui.jsx";
import { EventModal, newEvent } from "../schedule/EventModal.jsx";
import { shootDates, statusInfo, statusOf } from "../projects/status.js";
import { StatusChip } from "../projects/ProjectsHome.jsx";
import { CalendarPanel } from "./CalendarPanel.jsx";

const matches = (p, query) => !query ||
  [p.name, p.tag, p.productionHouse, p.rentalHouse, ...(p.people || []).map((x) => x.name)]
    .some((v) => (v || "").toLowerCase().includes(query));

// "Add event" on a tapped day: first, which project it's for. Active
// projects (Shooting, Confirmed, Soft lock) soonest first; Done ones on
// request. Cancelled ones aren't offered.
function ProjectPicker({ projects, types, date, onPick, onClose }) {
  const [showDone, setShowDone] = useState(false);
  const today = todayStr();
  const rows = Object.entries(projects)
    .map(([id, p]) => ({ id, p, status: statusOf(p, types, today), dates: shootDates(p, types) }))
    .filter((r) => r.status !== "cancelled");
  const order = ["shooting", "confirmed", "softlock"];
  const active = rows.filter((r) => order.includes(r.status))
    .sort((a, b) => (order.indexOf(a.status) - order.indexOf(b.status)) || (a.dates[0] || "").localeCompare(b.dates[0] || ""));
  const done = rows.filter((r) => r.status === "done").sort((a, b) => (b.dates[b.dates.length - 1] || "").localeCompare(a.dates[a.dates.length - 1] || ""));
  const row = ({ id, p, status, dates }) => (
    <div
      key={id}
      className="row"
      onClick={() => onPick(id)}
      style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "8px 4px", borderBottom: "1px solid var(--border)", cursor: "pointer", minWidth: 0, borderLeft: `3px solid ${statusInfo(status).color}`, paddingLeft: 8 }}
    >
      {p.tag && <span style={{ fontWeight: 700, fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 2, padding: "1px 4px", flexShrink: 0 }}>{p.tag}</span>}
      <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{p.name || "Untitled"}</span>
      <span style={{ fontSize: 11, color: "var(--muted2)", flexShrink: 0 }}>{formatShootDateRange(dates.map((d) => ({ date: d })))}</span>
      <span style={{ flex: 1 }} />
      <StatusChip status={status} style={{ flexShrink: 0, alignSelf: "center" }} />
    </div>
  );
  return (
    <Modal title={`Add event · ${wdm(date)}`} onClose={onClose}>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8 }}>Which project is it for?</div>
      {active.length === 0 && !showDone && <div style={{ fontSize: 12, color: "var(--muted2)", padding: "6px 0" }}>No active projects.</div>}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        {active.map(row)}
        {showDone && done.map(row)}
      </div>
      {!showDone && done.length > 0 && (
        <button className="btn btn-ghost" style={{ padding: "3px 8px", fontSize: 11, marginTop: 10 }} onClick={() => setShowDone(true)}>Show done projects ({done.length})</button>
      )}
    </Modal>
  );
}

// The Calendar module's home: every project's events on one full-width
// calendar (cancelled projects left out), with a search that narrows it to
// matching projects. A tapped day can get a new event for any project.
export function CalendarHome({ app, projects, types, actions, onManageTypes }) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(null); // { date, projectId? }
  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    const today = todayStr();
    return Object.fromEntries(Object.entries(projects).filter(([, p]) => statusOf(p, types, today) !== "cancelled" && matches(p, query)));
  }, [projects, q, types]);

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={14} style={{ position: "absolute", left: 9, top: 9, color: "var(--muted)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" style={{ width: "100%", paddingLeft: 30, fontSize: 13 }} />
      </div>
      <CalendarPanel app={app} projects={shown} types={types} onManageTypes={onManageTypes} onAddEvent={(date) => setAdding({ date })} />

      {adding && !adding.projectId && (
        <ProjectPicker projects={projects} types={types} date={adding.date} onClose={() => setAdding(null)} onPick={(projectId) => setAdding({ ...adding, projectId })} />
      )}
      {adding?.projectId && (
        <EventModal
          initial={newEvent("", adding.date)}
          projectName={projects[adding.projectId]?.name}
          isNew
          types={types}
          onClose={() => setAdding(null)}
          onSave={(saved) => {
            actions.update(adding.projectId, (p) => ({ ...p, events: [...(p.events || []), ...saved] }));
            setAdding(null);
          }}
        />
      )}
    </div>
  );
}
