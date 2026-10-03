import { useEffect, useState } from "react";
import { CheckCheck, Palette, Plus } from "lucide-react";
import { Section, smallBtn } from "../shared/ui.jsx";
import { addDays } from "../shared/dates.js";
import { typeOf, shootTypeId } from "./stepTypes.js";
import { sortSteps } from "./steps.js";
import { StepRow } from "./StepRow.jsx";
import { StepModal, newStep } from "./StepModal.jsx";

// Shoot days numbered D1, D2… in date order (as in the equipment list),
// and runs of consecutive ones (same status) folded into one line.
function shootGroups(sorted, shootId) {
  const groups = [];
  sorted.filter((s) => s.typeId === shootId).forEach((s, i) => {
    const day = { step: s, n: i + 1 };
    const last = groups[groups.length - 1];
    const prev = last?.days[last.days.length - 1].step;
    if (last && prev.start && s.start === addDays(prev.start, 1) && !!prev.confirmed === !!s.confirmed) last.days.push(day);
    else groups.push({ days: [day] });
  });
  return groups;
}

const uniq = (xs) => [...new Set(xs.filter(Boolean))];

// A project's schedule: every step in date (then time) order, any type as
// many times as needed.
export function ScheduleSection({ steps, types, labels, request, onChange, onManageTypes, highlightDate }) {
  const [editing, setEditing] = useState(null); // { step, isNew }
  const [open, setOpen] = useState({}); // first shoot day id -> group unfolded
  const list = steps || [];

  // From the project's calendar: edit a step tapped there.
  useEffect(() => {
    if (!request) return;
    const cur = list.find((s) => s.id === request.step.id);
    if (cur) setEditing({ isNew: false, step: cur });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.n]);
  const tentative = list.filter((s) => !s.confirmed).length;
  const shootId = shootTypeId(types);
  const sorted = sortSteps(list);
  const groups = shootGroups(sorted, shootId);
  const groupOf = new Map(groups.flatMap((g) => g.days.map((d) => [d.step.id, g])));
  const lit = (s) => highlightDate && s.start && s.start <= highlightDate && (s.end || s.start) >= highlightDate;

  // The step window returns an array (a Shooting range gives one per date).
  function save(saved) {
    onChange(editing.isNew ? [...list, ...saved] : list.flatMap((s) => (s.id === editing.step.id ? saved : [s])));
    setEditing(null);
  }
  const setConfirmed = (ids, confirmed) => onChange(list.map((x) => (ids.includes(x.id) ? { ...x, confirmed } : x)));

  const row = (s, dayLabel, extra = {}) => (
    <div key={s.id} style={{ background: lit(s) ? "var(--surface2)" : "transparent", ...extra.style }}>
      <StepRow
        step={s}
        type={typeOf(types, s.typeId)}
        dayLabel={dayLabel}
        onClick={() => setEditing({ isNew: false, step: s })}
        onToggleConfirmed={() => setConfirmed([s.id], !s.confirmed)}
      />
    </div>
  );

  const items = [];
  for (const s of sorted) {
    if (s.typeId !== shootId) { items.push(row(s)); continue; }
    const g = groupOf.get(s.id);
    if (g.days[0].step.id !== s.id) continue; // shown with its group
    if (g.days.length === 1) { items.push(row(s, `D${g.days[0].n}`)); continue; }
    const first = g.days[0], last = g.days[g.days.length - 1];
    const key = first.step.id;
    const ids = g.days.map((d) => d.step.id);
    const summary = {
      ...first.step,
      id: `group-${key}`,
      end: last.step.start,
      time: "",
      location: uniq(g.days.map((d) => d.step.location)).join(" · "),
      label: uniq(g.days.map((d) => d.step.label)).join(" · "),
      note: "",
    };
    items.push(
      <div key={summary.id} style={{ background: g.days.some((d) => lit(d.step)) ? "var(--surface2)" : "transparent" }}>
        <StepRow
          step={summary}
          type={typeOf(types, shootId)}
          dayLabel={`D${first.n}–D${last.n} ${open[key] ? "▾" : "▸"}`}
          hideLinks
          onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
          onToggleConfirmed={() => setConfirmed(ids, !first.step.confirmed)}
        />
      </div>,
    );
    if (open[key]) g.days.forEach((d) => items.push(row(d.step, `D${d.n}`, { style: { paddingLeft: 14 } })));
  }

  return (
    <Section
      id="x-schedule"
      title="Schedule"
      right={
        <>
          {tentative > 0 && (
            <button className="btn btn-ghost" style={smallBtn} onClick={() => onChange(list.map((s) => ({ ...s, confirmed: true })))}>
              <CheckCheck size={12} /> Confirm all
            </button>
          )}
          <button className="btn btn-ghost" style={smallBtn} onClick={onManageTypes} title="Step types and colours" aria-label="Step types"><Palette size={12} /></button>
          <button className="btn btn-primary" style={smallBtn} onClick={() => setEditing({ isNew: true, step: highlightDate ? newStep("", highlightDate) : newStep("") })} title={highlightDate ? "Add a step on the day picked in the calendar" : "Add a step"}><Plus size={12} /> Add step</button>
        </>
      }
    >
      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--muted2)" }}>No steps yet — tap + Add step.</div>
      ) : (
        <div style={{ borderTop: "1px solid var(--border)" }}>{items}</div>
      )}
      {editing && (
        <StepModal
          initial={editing.step}
          isNew={editing.isNew}
          types={types}
          labels={labels}
          onSave={save}
          onDelete={() => { onChange(list.filter((s) => s.id !== editing.step.id)); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}
    </Section>
  );
}
