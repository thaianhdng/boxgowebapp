import { useMemo, useState } from "react";
import { MONTHS, monthKey, todayStr, wdm } from "../shared/dates.js";
import { typeOf } from "../schedule/eventTypes.js";
import { occurrences } from "../schedule/events.js";
import { EventRow } from "../schedule/EventRow.jsx";
import { MonthGrid, MonthHeader, MonthKey, clashDates } from "./MonthGrid.jsx";

// Every event of every project on one calendar, coloured by event type,
// tentative ones faded, and clashes marked. Under it, always, the events
// as a list: from today to the end of this month (a whole month for other
// months), or just the day tapped on the calendar.
export function CalendarPanel({ app, projects, types, onManageTypes }) {
  const [month, setMonth] = useState(() => monthKey(todayStr()));
  const [selDate, setSelDate] = useState(null);
  const allOcc = useMemo(() => occurrences(projects, types), [projects, types]);
  // Tapping event types in the key shows only those (empty = all).
  const [typeFilter, setTypeFilter] = useState(() => new Set());
  const toggleType = (id) => setTypeFilter((f) => { const n = new Set(f); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const occ = useMemo(() => (typeFilter.size ? allOcc.filter((o) => typeFilter.has(o.event.typeId)) : allOcc), [allOcc, typeFilter]);
  const clashes = useMemo(() => clashDates(occ), [occ]);

  const today = todayStr();
  const thisMonth = month === monthKey(today);
  const shown = selDate
    ? occ.filter((o) => o.date === selDate)
    : occ.filter((o) => o.date.startsWith(month) && (!thisMonth || o.date >= today));
  const [y, m] = month.split("-").map(Number);
  const heading = selDate ? wdm(selDate) : thisMonth ? "Coming up this month" : `${MONTHS[m - 1]} ${y}`;
  const empty = selDate ? `Nothing on ${wdm(selDate)}.` : thisMonth ? "Nothing else this month." : `Nothing in ${MONTHS[m - 1]}.`;
  const byDate = [];
  for (const o of shown) {
    const last = byDate[byDate.length - 1];
    if (last && last.date === o.date) last.items.push(o);
    else byDate.push({ date: o.date, items: [o] });
  }

  return (
    <div>
      <MonthHeader
        month={month}
        onChange={(m) => { setMonth(m); setSelDate(null); }}
        right={
          <>
            <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => { setMonth(monthKey(todayStr())); setSelDate(null); }}>Today</button>
          </>
        }
      />
      <MonthGrid month={month} occ={occ} types={types} selected={selDate} onSelect={setSelDate} />
      <div style={{ marginTop: 6, marginBottom: 16 }}>
        <MonthKey month={month} occ={allOcc} types={types} filter={typeFilter} onToggle={toggleType} onEditColours={onManageTypes} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, minHeight: 24 }}>
        <span className="stencil" style={{ fontSize: 11, color: selDate ? "var(--accent)" : "var(--muted)" }}>{heading}</span>
        {selDate && (
          <button className="btn btn-ghost" style={{ padding: "3px 8px", fontSize: 11, flexShrink: 0 }} onClick={() => setSelDate(null)}>Show all</button>
        )}
      </div>
      {byDate.length === 0 && (
        <div style={{ fontSize: 12.5, color: "var(--muted2)", padding: "0 0 10px" }}>{empty}</div>
      )}
      {byDate.map(({ date, items }) => (
        <div key={date} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            {!selDate && <span className="stencil" style={{ fontSize: 11, color: date === today ? "var(--accent)" : "var(--muted)" }}>{wdm(date)}</span>}
            {clashes.has(date) && <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Clash</span>}
          </div>
          <div style={{ borderTop: "1px solid var(--border)" }}>
            {items.map((o, i) => (
              <EventRow
                key={`${o.projectId}-${o.event.id}-${i}`}
                event={o.event}
                type={typeOf(types, o.event.typeId)}
                projectName={o.project.name}
                dayLabel={o.dayCount > 1 ? `Day ${o.dayIndex + 1}/${o.dayCount}` : ""}
                onClick={() => app.go({ screen: "project", projectId: o.projectId })}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
