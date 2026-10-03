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

export function StepModal({ initial, isNew, types, onSave, onDelete, onClose }) {
  const [s, setS] = useState(initial);
  const [multi, setMulti] = useState(!!initial.end && initial.end > initial.start);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const ready = !!s.typeId;

  // Multi-day needs an end date: it starts as the day after the start.
  function addEnd() {
    setMulti(true);
    if (!s.end || s.end <= s.start) set({ end: addDays(s.start || todayStr(), 1) });
  }

  function save() {
    if (!ready) return;
    const end = multi && s.end && s.start && s.end > s.start ? s.end : "";
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
      {/* Step type: an even grid, each with its colour. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 5, marginBottom: 16 }}>
        {types.map((t) => {
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
        <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1, minWidth: 0, flexWrap: "nowrap" }}>
          <input type="time" value={s.time} onChange={(e) => set({ time: e.target.value })} style={{ ...small, flex: 1, minWidth: 0 }} />
          <span style={{ color: "var(--muted)", flexShrink: 0 }}>–</span>
          <input type="time" value={s.endTime} disabled={!s.time} onChange={(e) => set({ endTime: e.target.value })} style={{ ...small, flex: 1, minWidth: 0, opacity: s.time ? 1 : 0.5 }} />
          {s.time ? (
            <button type="button" onClick={() => set({ time: "", endTime: "" })} title="All day" aria-label="All day" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2, display: "flex", flexShrink: 0 }}><X size={14} /></button>
          ) : (
            <span style={{ fontSize: 10.5, color: "var(--muted2)", flexShrink: 0 }}>all day</span>
          )}
        </div>
      </Row>

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
