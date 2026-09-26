import { useEffect, useState } from "react";
import { CheckCheck, Palette, Plus } from "lucide-react";
import { Section, smallBtn } from "../shared/ui.jsx";
import { addDays, todayStr } from "../shared/dates.js";
import { typeOf } from "./stepTypes.js";
import { sortSteps } from "./steps.js";
import { StepRow } from "./StepRow.jsx";
import { StepModal, newStep } from "./StepModal.jsx";

// A project's schedule: every step in date (then time) order, any type as
// many times as needed.
export function ScheduleSection({ steps, types, onChange, onManageTypes, openShootStep, highlightDate }) {
  const [editing, setEditing] = useState(null); // { step, isNew }
  const list = steps || [];
  const tentative = list.filter((s) => !s.confirmed).length;

  // Coming from the equipment list's "+ add day": open a new Shooting
  // step the day after the last shoot day.
  useEffect(() => {
    if (!openShootStep) return;
    const shoot = types.find((t) => t.shoot);
    const last = list.filter((s) => s.typeId === shoot?.id).map((s) => s.end || s.start).filter(Boolean).sort().pop();
    setEditing({ isNew: true, step: newStep(shoot?.id, last ? addDays(last, 1) : addDays(todayStr(), 1)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openShootStep]);

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
          <button className="btn btn-ghost" style={smallBtn} onClick={onManageTypes}><Palette size={12} /> Step types</button>
        </>
      }
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {types.map((t) => (
          <button
            key={t.id}
            onClick={() => setEditing({ isNew: true, step: newStep(t.id) })}
            style={{
              display: "inline-flex", alignItems: "center", gap: 3, padding: "4px 8px", borderRadius: 3,
              fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              border: `1px solid ${t.color}`, background: "transparent", color: "var(--text)",
            }}
          >
            <Plus size={11} style={{ color: t.color }} /> {t.name}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--muted2)" }}>No steps yet — tap a step above to add it.</div>
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
