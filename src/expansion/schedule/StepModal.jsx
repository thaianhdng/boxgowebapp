import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Field } from "../../components/Field.jsx";
import { Modal, Toggle } from "../shared/ui.jsx";
import { uid } from "../../lib/utils.js";
import { addDays, todayStr } from "../shared/dates.js";

// A new step starts today; its type is picked in the window.
export function newStep(typeId, start = todayStr()) {
  return { id: uid(), typeId, start, end: "", time: "", endTime: "", mode: "offline", location: "", link: "", note: "", confirmed: false };
}

export function StepModal({ initial, isNew, types, onSave, onDelete, onClose }) {
  const [s, setS] = useState(initial);
  const [multi, setMulti] = useState(!!initial.end && initial.end > initial.start);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  // Multi-day needs an end date: start with the day after the start.
  function chooseMulti(on) {
    setMulti(on);
    if (on && (!s.end || s.end <= s.start)) set({ end: addDays(s.start || todayStr(), 1) });
  }
  const ready = !!s.typeId;

  function save() {
    const end = multi && s.end && s.start && s.end > s.start ? s.end : "";
    if (!ready) return;
    onSave({ ...s, end, endTime: s.time ? s.endTime : "" });
  }

  return (
    <Modal
      title={isNew ? "Add step" : "Edit step"}
      onClose={onClose}
      footer={
        <>
          {!isNew ? (
            <button className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={onDelete}><Trash2 size={13} /> Delete</button>
          ) : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={!ready} style={{ opacity: ready ? 1 : 0.5 }}>{isNew ? "Add" : "Save"}</button>
          </div>
        </>
      }
    >
      <Field label="Step">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => set({ typeId: t.id })}
              style={{
                padding: "5px 9px", borderRadius: 3, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${t.color}`,
                background: s.typeId === t.id ? t.color : "transparent",
                color: s.typeId === t.id ? "#111" : "var(--text)",
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Days">
        <Toggle options={[[false, "Single day"], [true, "Multi-day"]]} value={multi} onChange={chooseMulti} />
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={s.start} onChange={(e) => set({ start: e.target.value })} style={{ width: 150 }} />
          {multi && (
            <>
              <span style={{ color: "var(--muted)" }}>→</span>
              <input type="date" value={s.end} min={s.start || undefined} onChange={(e) => set({ end: e.target.value })} style={{ width: 150 }} />
            </>
          )}
        </div>
        {!s.start && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 5 }}>No date yet — it shows as "Date TBC" and stays off the calendars.</div>}
      </Field>

      <Field label="Time (optional)">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="time" value={s.time} onChange={(e) => set({ time: e.target.value })} style={{ width: 110 }} />
          {s.time && (
            <>
              <span style={{ color: "var(--muted)" }}>to</span>
              <input type="time" value={s.endTime} onChange={(e) => set({ endTime: e.target.value })} style={{ width: 110 }} />
              <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => set({ time: "", endTime: "" })}>All day</button>
            </>
          )}
        </div>
      </Field>

      <Field label="Where">
        <Toggle options={[["offline", "Offline"], ["online", "Online"]]} value={s.mode} onChange={(mode) => set({ mode })} />
        <div style={{ marginTop: 8 }}>
          {s.mode === "online" ? (
            <input type="url" value={s.link} onChange={(e) => set({ link: e.target.value })} placeholder="Meeting link (Zoom, Meet…)" style={{ width: "100%" }} />
          ) : (
            <input value={s.location} onChange={(e) => set({ location: e.target.value })} placeholder="Location" style={{ width: "100%" }} />
          )}
        </div>
      </Field>

      <Field label="Note">
        <textarea value={s.note} onChange={(e) => set({ note: e.target.value })} rows={3} placeholder="Anything to remember…" style={{ width: "100%", resize: "vertical" }} />
      </Field>

      <Field label="Status" style={{ marginBottom: 0 }}>
        <Toggle options={[[false, "Tentative"], [true, "Confirmed"]]} value={!!s.confirmed} onChange={(confirmed) => set({ confirmed })} />
      </Field>
    </Modal>
  );
}
