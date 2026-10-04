import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { Modal, Toggle } from "../shared/ui.jsx";
import { uid } from "../../lib/utils.js";
import { addDays, todayStr } from "../shared/dates.js";

// A new step starts today; its type is picked in the window.
export function newStep(typeId, start = todayStr()) {
  return { id: uid(), typeId, start, end: "", time: "", endTime: "", mode: "offline", location: "", link: "", note: "", confirmed: false };
}

// Laid out like BOXGO's Create New window: a narrow label column on the
// left, one compact line per field.
function Row({ label, children, top }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: top ? "flex-start" : "center", marginBottom: 10 }}>
      <span style={{ width: 42, flexShrink: 0, fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", paddingTop: top ? 7 : 0 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 6, alignItems: "center" }}>{children}</div>
    </div>
  );
}

const small = { fontSize: 13, padding: "6px 7px" };

const pad = (n) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

// Hour : minute pickers, minutes in 5-minute steps ("HH:MM"). A time saved
// earlier on another minute keeps that minute in the list. `optional` adds
// "--" for no time (the end time).
function TimePick({ value, onChange, optional }) {
  const [h, m] = value ? value.split(":") : [optional ? "" : "09", "00"];
  const minutes = MINUTES.includes(m) ? MINUTES : [...MINUTES, m].sort();
  const sel = { ...small, flex: 1, minWidth: 0, textAlign: "center", padding: "6px 2px" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0 }}>
      <select value={h} onChange={(e) => onChange(e.target.value ? `${e.target.value}:${m}` : "")} style={sel} aria-label="Hour">
        {optional && <option value="">--</option>}
        {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span style={{ color: "var(--muted)" }}>:</span>
      <select value={m} disabled={!h} onChange={(e) => onChange(`${h}:${e.target.value}`)} style={{ ...sel, opacity: h ? 1 : 0.5 }} aria-label="Minutes">
        {minutes.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  );
}

// For every step except shoot days: those are set in the project's Create
// New / Edit window, like the equipment list's days. onSave gets [step].
export function StepModal({ initial, isNew, types, onSave, onDelete, onClose }) {
  const [s, setS] = useState(initial);
  const [multi, setMulti] = useState(!!initial.end && initial.end > initial.start);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const stepTypes = types.filter((t) => !t.shoot);
  const ready = !!s.typeId;
  // All day unless switched to a specific time (which starts at 09:00–10:00).
  const [timed, setTimed] = useState(!!initial.time);
  function chooseTimed(on) {
    setTimed(on);
    if (on && !s.time) set({ time: "09:00", endTime: "10:00" });
  }

  // Multi-day needs an end date: it starts as the day after the start.
  function addEnd() {
    setMulti(true);
    if (!s.end || s.end <= s.start) set({ end: addDays(s.start || todayStr(), 1) });
  }

  function save() {
    if (!ready) return;
    const end = multi && s.end && s.start && s.end > s.start ? s.end : "";
    const time = timed ? s.time : "";
    onSave([{ ...s, end, time, endTime: time ? s.endTime : "" }]);
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
      {/* Step type: an even grid, each with its colour. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 5, marginBottom: 6 }}>
        {stepTypes.map((t) => {
          const on = s.typeId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              title={t.name}
              onClick={() => set({ typeId: t.id })}
              style={{
                display: "flex", alignItems: "center", gap: 6, minWidth: 0, padding: "6px 7px", borderRadius: 3,
                fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                border: `1px solid ${on ? t.color : "var(--border2)"}`,
                background: on ? t.color : "transparent",
                color: on ? "#111" : "var(--text)",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: on ? "#111" : t.color, opacity: on ? 0.35 : 1 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--muted2)", marginBottom: 16 }}>Shoot dates are set in Edit project.</div>

      <Row label="Date">
        <input type="date" value={s.start} onChange={(e) => set({ start: e.target.value })} style={{ ...small, flex: "1 1 120px", minWidth: 0, maxWidth: 190 }} />
        {!multi && (
          <button type="button" className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 11, flexShrink: 0 }} onClick={addEnd}>+ End date</button>
        )}
      </Row>
      {multi && (
        <Row label="To">
          <input type="date" value={s.end} min={s.start || undefined} onChange={(e) => set({ end: e.target.value })} style={{ ...small, flex: "1 1 120px", minWidth: 0, maxWidth: 190 }} />
          <button type="button" onClick={() => setMulti(false)} title="Back to a single day" aria-label="Single day" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2, display: "flex", flexShrink: 0 }}><X size={14} /></button>
        </Row>
      )}

      <Row label="Time">
        <Toggle options={[[false, "All day"], [true, "Set time"]]} value={timed} onChange={chooseTimed} style={{ flex: 1 }} />
      </Row>
      {timed && (
        <Row label="">
          <TimePick value={s.time} onChange={(time) => set({ time })} />
          <span style={{ color: "var(--muted)", flexShrink: 0 }}>–</span>
          <TimePick value={s.endTime} onChange={(endTime) => set({ endTime })} optional />
        </Row>
      )}

      <Row label="Where">
        <Toggle options={[["offline", "Offline"], ["online", "Online"]]} value={s.mode} onChange={(mode) => set({ mode })} style={{ flex: "0 0 auto" }} />
        {s.mode === "online" ? (
          <input type="url" value={s.link} onChange={(e) => set({ link: e.target.value })} placeholder="Meeting link" style={{ ...small, flex: 1, minWidth: 0 }} />
        ) : (
          <input value={s.location} onChange={(e) => set({ location: e.target.value })} placeholder="Location" style={{ ...small, flex: 1, minWidth: 0 }} />
        )}
      </Row>

      <Row label="Note" top>
        <textarea value={s.note} onChange={(e) => set({ note: e.target.value })} rows={2} placeholder="Anything to remember…" style={{ ...small, width: "100%", resize: "vertical" }} />
      </Row>

      <Row label="Status">
        <Toggle options={[[false, "Tentative"], [true, "Confirmed"]]} value={!!s.confirmed} onChange={(confirmed) => set({ confirmed })} style={{ flex: 1 }} />
      </Row>
    </Modal>
  );
}
