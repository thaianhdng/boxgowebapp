import { useState } from "react";
import { EditableAttrRow } from "./EditableAttrRow.jsx";


export function EditableAttrSection({ title, placeholder, items, onAdd, onRename, onRemove, uppercase }) {
  const [newVal, setNewVal] = useState("");

  function submitAdd() {
    if (!newVal.trim()) return;
    onAdd(newVal);
    setNewVal("");
  }

  const sortedItems = [...items].sort((a, b) => a.localeCompare(b));

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="stencil" style={{ fontSize: 11, color: "var(--accent)", marginBottom: 6 }}>{title}</div>
      {items.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>None yet.</div>
      )}
      {sortedItems.map((item) => (
        <EditableAttrRow
          key={item}
          value={item}
          uppercase={uppercase}
          onRename={(v) => onRename(item, v)}
          onRemove={() => onRemove(item)}
        />
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input
          style={{ flex: 1 }}
          placeholder={placeholder}
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submitAdd(); }}
        />
        <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={submitAdd} disabled={!newVal.trim()}>Add</button>
      </div>
    </div>
  );
}
