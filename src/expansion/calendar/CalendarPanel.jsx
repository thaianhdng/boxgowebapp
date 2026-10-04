import { useMemo, useState } from "react";
import { Palette } from "lucide-react";
import { monthKey, todayStr, wdm } from "../shared/dates.js";
import { typeOf } from "../schedule/eventTypes.js";
import { occurrences } from "../schedule/events.js";
import { EventRow } from "../schedule/EventRow.jsx";
import { MonthGrid, MonthHeader, MonthKey, clashDates } from "./MonthGrid.jsx";

// Every event of every project on one calendar, coloured by event type,
// tentative ones faded, and clashes marked. Tap a day for its events, or
// list the whole month.
export function CalendarPanel({ app, projects, types, onManageTypes }) {
  const [month, setMonth] = useState(() => monthKey(todayStr()));
  const [selDate, setSelDate] = useState(null);
  const [listMonth, setListMonth] = useState(false);
  const occ = useMemo(() => occurrences(projects, types), [projects, types]);
  const clashes = useMemo(() => clashDates(occ), [occ]);

  const shown = selDate ? occ.filter((o) => o.date === selDate) : listMonth ? occ.filter((o) => o.date.startsWith(month)) : [];
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
            <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={onManageTypes} aria-label="Event types"><Palette size={12} /></button>
          </>
        }
      />
      <MonthGrid month={month} occ={occ} types={types} selected={selDate} onSelect={setSelDate} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 6, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
          <MonthKey month={month} occ={occ} types={types} />
        </div>
        {selDate ? (
          <button className="btn btn-ghost" style={{ padding: "3px 8px", fontSize: 11, flexShrink: 0 }} onClick={() => setSelDate(null)}>Close day</button>
        ) : (
          <button className="btn btn-ghost" style={{ padding: "3px 8px", fontSize: 11, flexShrink: 0 }} onClick={() => setListMonth((v) => !v)}>
            {listMonth ? "Hide month list" : "List this month"}
          </button>
        )}
      </div>
      {(selDate || listMonth) && byDate.length === 0 && (
        <div style={{ fontSize: 12.5, color: "var(--muted2)", padding: "4px 0 10px" }}>{selDate ? `Nothing on ${wdm(selDate)}.` : "Nothing scheduled this month."}</div>
      )}
      {byDate.map(({ date, items }) => (
        <div key={date} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span className="stencil" style={{ fontSize: 11, color: date === todayStr() ? "var(--accent)" : "var(--muted)" }}>{wdm(date)}</span>
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
