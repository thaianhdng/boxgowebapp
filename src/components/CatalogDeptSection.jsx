import { useState } from "react";
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight, GripVertical,
} from "lucide-react";
import { BreakableName } from "./BreakableName.jsx";


export function CatalogDeptSection({ dept, color, subcats, data, collapsed, onToggle, onEdit, onDelete, onReorderItem, onAddItem }) {
  const total = Object.values(data).reduce((n, arr) => n + arr.length, 0);
  const definedSet = new Set(subcats);
  const flatItems = Object.keys(data)
    .filter((k) => k === "" || !definedSet.has(k))
    .flatMap((k) => data[k] || []);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  function itemRow(c) {
    return (
      <div
        key={c.id}
        draggable
        onDragStart={() => setDragId(c.id)}
        onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== c.id) setDragOverId(c.id); }}
        onDragLeave={() => setDragOverId((id) => (id === c.id ? null : id))}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId && dragId !== c.id) onReorderItem(dragId, c.id);
          setDragId(null);
          setDragOverId(null);
        }}
        onDragEnd={() => { setDragId(null); setDragOverId(null); }}
        className="row"
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
          borderTop: dragOverId === c.id ? "2px solid var(--accent)" : "1px solid var(--border)", fontSize: 13.5,
        }}
      >
        <span style={{ color: "var(--faint)", cursor: "grab", display: "flex", flexShrink: 0 }} title="Drag to reorder">
          <GripVertical size={13} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}><BreakableName name={c.name} /></div>
          {c.note && <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 1, whiteSpace: "pre-wrap" }}>{c.note}</div>}
        </div>
        <button onClick={() => onEdit(c)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
          <Trash2 size={13} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 32, border: "1px solid var(--border)", borderRadius: 4 }}>
      <div
        onClick={onToggle}
        className="sticky-top"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", background: "var(--accent)", color: "var(--accent-text)", cursor: "pointer",
          position: "sticky", top: 0, zIndex: 6, borderRadius: collapsed ? "4px" : "4px 4px 0 0",
        }}
      >
        <span className="stencil" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          {dept}
        </span>
      </div>
      {!collapsed && (
        <div style={{ background: "var(--surface)", borderRadius: "0 0 4px 4px", overflow: "hidden" }}>
          <div>
            {flatItems.map((c) => itemRow(c))}
            <div style={{ padding: "8px 14px" }}>
              <button
                onClick={() => onAddItem(dept, "")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}
              >
                <Plus size={11} /> Add Item
              </button>
            </div>
          </div>
          {subcats.map((sub) => (
            <div key={sub}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 14px", background: "var(--surface2)",
              }}>
                <span style={{
                  fontSize: 12, fontWeight: 800, color: "var(--text)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  {sub}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddItem(dept, sub); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}
                >
                  <Plus size={11} /> Add Item
                </button>
              </div>
              {(data[sub] || []).map((c) => itemRow(c))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
