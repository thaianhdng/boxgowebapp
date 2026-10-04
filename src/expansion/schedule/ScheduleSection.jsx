import { useEffect, useState } from "react";
import { CheckCheck, Palette, Plus } from "lucide-react";
import { Section, smallBtn } from "../shared/ui.jsx";
import { typeOf, shootTypeId } from "./stepTypes.js";
import { sortSteps } from "./steps.js";
import { StepRow } from "./StepRow.jsx";
import { StepModal, newStep } from "./StepModal.jsx";

// Shoot days are listed here but changed in the project's Edit window
// (onEditShootDays); their Tentative / Confirmed switch works here.
export function ScheduleSection({ steps, types, request, onChange, onManageTypes, onEditShootDays, highlightDate }) {
  const [editing, setEditing] = useState(null); // { step, isNew }
  const list = steps || [];

  // From the project's calendar: edit a step tapped there.
  useEffect(() => {
    if (!request) return;
    const cur = list.find((s) => s.id === request.step.id);
    if (cur) openStep(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.n]);
  const tentative = list.filter((s) => !s.confirmed).length;
  const shootId = shootTypeId(types);
  const sorted = sortSteps(list, types);
  // Shoot days numbered D1, D2… in date order, as in the equipment list.
  const dayNo = new Map(sorted.filter((s) => s.typeId === shootId).map((s, i) => [s.id, i + 1]));
  const lit = (s) => highlightDate && s.start && s.start <= highlightDate && (s.end || s.start) >= highlightDate;

  // The step window returns an array (a Shooting range gives one per date).
  function save(saved) {
    onChange(editing.isNew ? [...list, ...saved] : list.flatMap((s) => (s.id === editing.step.id ? saved : [s])));
    setEditing(null);
  }
  const openStep = (s) => (s.typeId === shootId ? onEditShootDays() : setEditing({ isNew: false, step: s }));
  const setConfirmed = (ids, confirmed) => onChange(list.map((x) => (ids.includes(x.id) ? { ...x, confirmed } : x)));

  const row = (s, dayLabel) => (
    <div key={s.id} style={{ background: lit(s) ? "var(--surface2)" : "transparent" }}>
      <StepRow
        step={s}
        type={typeOf(types, s.typeId)}
        dayLabel={dayLabel}
        onClick={() => openStep(s)}
        onToggleConfirmed={() => setConfirmed([s.id], !s.confirmed)}
      />
    </div>
  );

  const items = sorted.map((s) => row(s, dayNo.has(s.id) ? `D${dayNo.get(s.id)}` : ""));

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
          onSave={save}
          onDelete={() => { onChange(list.filter((s) => s.id !== editing.step.id)); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}
    </Section>
  );
}
