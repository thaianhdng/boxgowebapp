import { useState } from "react";
import {
  Trash2, Pencil,
} from "lucide-react";


export function EditableAttrRow({ value, onRename, onRemove, uppercase, extraActions }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== value) onRename(v);
    else setDraft(value);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      {editing ? (
        <input
          autoFocus
          style={{ flex: 1, fontSize: 13, padding: "4px 6px" }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(value); setEditing(false); }
          }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{
            flex: 1, fontSize: 13, fontWeight: uppercase ? 800 : 600,
            textTransform: uppercase ? "uppercase" : "none", letterSpacing: uppercase ? 0.3 : 0,
            cursor: "text",
          }}
        >
          {value}
        </span>
      )}
      {extraActions}
      <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted2)" }} title="Rename">
        <Pencil size={12} />
      </button>
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted2)" }} title="Remove">
        <Trash2 size={13} />
      </button>
    </div>
  );
}
