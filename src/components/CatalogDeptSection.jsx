import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight, GripVertical,
} from "lucide-react";
import { BreakableName } from "./BreakableName.jsx";
import { Fold } from "./Motion.jsx";
import { useSortable } from "../lib/sortable.js";


// `previewOff` (camera / lens categories only): the categories and
// subcategories left out of the project cards' camera and lens lines, with
// an "In card preview" tick on the category bar and on each subcategory.
// Items are reordered by pressing their grip and moving, with a finger or a
// mouse (src/lib/sortable.js), inside their own subcategory.
export function CatalogDeptSection({ dept, color, subcats, data, collapsed, onToggle, onEdit, onDelete, onReorderItem, onAddItem, previewOff, onTogglePreview }) {
  // An item moves before / after the one whose place it takes.
  const sort = useSortable((from, to, ids) => onReorderItem(ids[from], ids[to]));
  const deptOn = previewOff ? !previewOff.has(dept) : false;
  const tick = (key, on, disabled, onAccent) => (
    <label
      onClick={(e) => e.stopPropagation()}
      title={disabled ? "The whole category is left out of the card preview" : "Show these items in the camera / lens lines on project cards"}
      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1, color: onAccent ? "var(--accent-text)" : "var(--muted)", textTransform: "none", letterSpacing: 0, flexShrink: 0 }}
    >
      <input type="checkbox" checked={on} disabled={disabled} onChange={() => onTogglePreview(key)} style={{ width: 14, height: 14, margin: 0, padding: 0, accentColor: onAccent ? "var(--accent-text)" : "var(--accent)" }} />
      In card preview
    </label>
  );
  const total = Object.values(data).reduce((n, arr) => n + arr.length, 0);
  const definedSet = new Set(subcats);
  const flatItems = Object.keys(data)
    .filter((k) => k === "" || !definedSet.has(k))
    .flatMap((k) => data[k] || []);

  function itemRow(c, group) {
    const grip = sort.grip(c.id, group.map((x) => x.id));
    return (
      <div
        key={c.id}
        ref={sort.row(c.id)}
        className="row"
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
          borderTop: "1px solid var(--border)", fontSize: 13.5,
        }}
      >
        <span {...grip} style={{ ...grip.style, color: "var(--faint)", display: "flex", flexShrink: 0, padding: "6px 8px", margin: "-6px -8px" }}>
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
        {previewOff && tick(dept, deptOn, false, true)}
      </div>
      <Fold open={!collapsed}>
        <div style={{ background: "var(--surface)", borderRadius: "0 0 4px 4px", overflow: "hidden" }}>
          <div>
            {flatItems.map((c) => itemRow(c, flatItems))}
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
                <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {previewOff && tick(`${dept}::${sub}`, deptOn && !previewOff.has(`${dept}::${sub}`), !deptOn, false)}
                <button
                  onClick={(e) => { e.stopPropagation(); onAddItem(dept, sub); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}
                >
                  <Plus size={11} /> Add Item
                </button>
                </span>
              </div>
              {(data[sub] || []).map((c) => itemRow(c, data[sub]))}
            </div>
          ))}
        </div>
      </Fold>
    </div>
  );
}
