import { useMemo, useState } from "react";
import { Palette } from "lucide-react";
import { monthKey, todayStr, wdm } from "../shared/dates.js";
import { typeOf } from "../schedule/stepTypes.js";
import { occurrences } from "../schedule/steps.js";
import { StepRow } from "../schedule/StepRow.jsx";
import { MonthGrid, MonthHeader, clashDates } from "./MonthGrid.jsx";

// Every step of every project on one calendar, coloured by step type,
// tentative ones faded, and clashes marked.
export function CalendarScreen({ app, projects, types, onManageTypes }) {
  const [month, setMonth] = useState(() => monthKey(todayStr()));
  const [selDate, setSelDate] = useState(null);
  const occ = useMemo(() => occurrences(projects), [projects]);
  const clashes = useMemo(() => clashDates(occ), [occ]);

  const shown = selDate ? occ.filter((o) => o.date === selDate) : occ.filter((o) => o.date.startsWith(month));
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
            <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={onManageTypes} aria-label="Step types"><Palette size={12} /></button>
          </>
        }
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginBottom: 10 }}>
        {types.map((t) => (
          <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: t.color }} />{t.name}
          </span>
        ))}
      </div>
      <MonthGrid month={month} occ={occ} types={types} selected={selDate} onSelect={setSelDate} />
      <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 6, marginBottom: 18 }}>
        Faded = tentative · red dot = more than one project that day · tap a day to see just that day
      </div>

      {selDate && (
        <button className="btn btn-ghost" style={{ padding: "3px 8px", fontSize: 11, marginBottom: 10 }} onClick={() => setSelDate(null)}>
          Show whole month
        </button>
      )}
      {byDate.length === 0 && (
        <div style={{ fontSize: 12.5, color: "var(--muted2)", padding: "10px 0" }}>{selDate ? `Nothing on ${wdm(selDate)}.` : "Nothing scheduled this month."}</div>
      )}
      {byDate.map(({ date, items }) => (
        <div key={date} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span className="stencil" style={{ fontSize: 11, color: date === todayStr() ? "var(--accent)" : "var(--muted)" }}>{wdm(date)}</span>
            {clashes.has(date) && <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Clash</span>}
          </div>
          <div style={{ borderTop: "1px solid var(--border)" }}>
            {items.map((o, i) => (
              <StepRow
                key={`${o.projectId}-${o.step.id}-${i}`}
                step={o.step}
                type={typeOf(types, o.step.typeId)}
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
