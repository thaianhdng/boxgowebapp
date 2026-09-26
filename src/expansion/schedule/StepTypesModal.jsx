import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Modal } from "../shared/ui.jsx";
import { SWATCHES } from "./stepTypes.js";
import { uid } from "../../lib/utils.js";

// Add, rename, recolour, reorder and remove step types. The order here is
// the order of the "add step" buttons; the schedule itself is always in
// date order.
export function StepTypesModal({ types, usage, onChange, onClose }) {
  const [picking, setPicking] = useState(null); // type id whose colour palette is open
  const [newName, setNewName] = useState("");
  const [msg, setMsg] = useState("");

  const update = (id, patch) => onChange(types.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= types.length) return;
    const next = [...types];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function remove(t) {
    if (t.shoot) return setMsg(`"${t.name}" can't be removed — its steps are the equipment list's shoot days.`);
    const n = usage[t.id] || 0;
    if (n) return setMsg(`"${t.name}" is used by ${n} step${n > 1 ? "s" : ""}. Change or delete those first.`);
    setMsg("");
    onChange(types.filter((x) => x.id !== t.id));
  }
  function add() {
    const name = newName.trim();
    if (!name) return;
    const used = new Set(types.map((t) => t.color));
    const color = SWATCHES.find((c) => !used.has(c)) || SWATCHES[types.length % SWATCHES.length];
    onChange([...types, { id: uid(), name, color }]);
    setNewName("");
  }

  return (
    <Modal title="Step types" onClose={onClose} footer={<><span /><button className="btn btn-primary" onClick={onClose}>Done</button></>}>
      {types.map((t, i) => (
        <div key={t.id} style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              onClick={() => setPicking(picking === t.id ? null : t.id)}
              title="Change colour"
              style={{ width: 26, height: 26, borderRadius: 3, border: "1px solid var(--border2)", background: t.color, cursor: "pointer", flexShrink: 0 }}
            />
            <input value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} style={{ flex: 1, minWidth: 0, fontSize: 13, padding: "6px 8px" }} />
            <button className="btn btn-ghost" style={{ padding: "4px 5px" }} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp size={13} /></button>
            <button className="btn btn-ghost" style={{ padding: "4px 5px" }} onClick={() => move(i, 1)} disabled={i === types.length - 1} aria-label="Move down"><ArrowDown size={13} /></button>
            <button className="btn btn-ghost" style={{ padding: "4px 5px", opacity: t.shoot ? 0.35 : 1 }} onClick={() => remove(t)} aria-label="Remove"><Trash2 size={13} /></button>
          </div>
          {picking === t.id && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 0 4px 32px" }}>
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => { update(t.id, { color: c }); setPicking(null); }}
                  style={{ width: 24, height: 24, borderRadius: 3, background: c, cursor: "pointer", border: c === t.color ? "2px solid var(--text)" : "1px solid var(--border2)" }}
                />
              ))}
            </div>
          )}
        </div>
      ))}
      {msg && <div style={{ fontSize: 12, color: "var(--danger)", margin: "8px 0" }}>{msg}</div>}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="New step type…"
          style={{ flex: 1, minWidth: 0, fontSize: 13 }}
        />
        <button className="btn btn-primary" onClick={add}><Plus size={13} /> Add</button>
      </div>
    </Modal>
  );
}
