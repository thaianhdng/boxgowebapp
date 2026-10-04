import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { todayStr } from "../shared/dates.js";
import { statusOf } from "../projects/status.js";
import { CalendarPanel } from "./CalendarPanel.jsx";

// The Calendar module's home: every project's events on one full-width
// calendar (cancelled projects left out), with a search that narrows it to
// matching projects.
export function CalendarHome({ app, projects, types, onManageTypes }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    const today = todayStr();
    return Object.fromEntries(Object.entries(projects).filter(([, p]) => statusOf(p, types, today) !== "cancelled" && (!query ||
      [p.name, p.tag, p.productionHouse, p.rentalHouse, ...(p.people || []).map((x) => x.name)]
        .some((v) => (v || "").toLowerCase().includes(query)))));
  }, [projects, q, types]);

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={14} style={{ position: "absolute", left: 9, top: 9, color: "var(--muted)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" style={{ width: "100%", paddingLeft: 30, fontSize: 13 }} />
      </div>
      <CalendarPanel app={app} projects={shown} types={types} onManageTypes={onManageTypes} />
    </div>
  );
}
