import { useState } from "react";
import { CheckCheck, Palette, Plus } from "lucide-react";
import { Section, smallBtn } from "../shared/ui.jsx";
import { typeOf } from "./stepTypes.js";
import { sortSteps } from "./steps.js";
import { StepRow } from "./StepRow.jsx";
import { StepModal, newStep } from "./StepModal.jsx";

// A project's schedule: every step in date (then time) order, any type as
// many times as needed.
export function ScheduleSection({ steps, types, onChange, onManageTypes, highlightDate }) {
  const [editing, setEditing] = useState(null); // { step, isNew }
  const list = steps || [];
  const tentative = list.filter((s) => !s.confirmed).length;

  function save(step) {
    onChange(editing.isNew ? [...list, step] : list.map((s) => (s.id === step.id ? step : s)));
    setEditing(null);
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
          <button className="btn btn-primary" style={smallBtn} onClick={() => setEditing({ isNew: true, step: newStep("") })}><Plus size={12} /> Add step</button>
        </>
      }
    >
      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--muted2)" }}>No steps yet — tap + Add step.</div>
      ) : (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {sortSteps(list).map((s) => (
            <div key={s.id} style={{ background: highlightDate && s.start && s.start <= highlightDate && (s.end || s.start) >= highlightDate ? "var(--surface2)" : "transparent" }}>
              <StepRow
                step={s}
                type={typeOf(types, s.typeId)}
                onClick={() => setEditing({ isNew: false, step: s })}
                onToggleConfirmed={() => onChange(list.map((x) => (x.id === s.id ? { ...x, confirmed: !x.confirmed } : x)))}
              />
            </div>
          ))}
        </div>
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
