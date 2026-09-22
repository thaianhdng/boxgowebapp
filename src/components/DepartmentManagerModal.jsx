import { useState } from "react";
import {
  X, ChevronDown, ChevronUp, GripVertical,
} from "lucide-react";
import { EditableAttrRow } from "./EditableAttrRow.jsx";


export function DepartmentManagerModal({
  departments, onAddDepartment, onRenameDepartment, onRemoveDepartment, onReorderDepartment,
  onAddSubcategory, onRenameSubcategory, onRemoveSubcategory, onReorderSubcategory, onClose,
}) {
  const deptNames = Object.keys(departments);
  const [newDept, setNewDept] = useState("");
  const [newSubFor, setNewSubFor] = useState({});
  const [dragInfo, setDragInfo] = useState(null); // { dept, index }
  const [dragOverIndex, setDragOverIndex] = useState(null);

  function submitNewDept() {
    if (!newDept.trim()) return;
    onAddDepartment(newDept.trim());
    setNewDept("");
  }

  function submitNewSub(dept) {
    const v = (newSubFor[dept] || "").trim();
    if (!v) return;
    onAddSubcategory(dept, v);
    setNewSubFor((prev) => ({ ...prev, [dept]: "" }));
  }

  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16,
    }}>
      <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 440, maxHeight: "88vh", overflowY: "auto", padding: 22, border: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="stencil" style={{ fontSize: 14 }}>Manage Categories</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}><X size={18} /></button>
        </div>

        {deptNames.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>No categories yet — add one below.</div>
        )}

        {deptNames.map((dept, deptIdx) => (
          <div key={dept} style={{ border: "1px solid var(--border)", borderRadius: 4, padding: 10, marginBottom: 10 }}>
            <EditableAttrRow
              value={dept}
              uppercase
              onRename={(v) => onRenameDepartment(dept, v)}
              onRemove={() => onRemoveDepartment(dept)}
              extraActions={
                <span style={{ display: "flex", gap: 6, marginRight: 2 }}>
                  <button
                    onClick={() => onReorderDepartment(deptIdx, deptIdx - 1)}
                    disabled={deptIdx === 0}
                    style={{
                      background: "none", border: "none", cursor: deptIdx === 0 ? "default" : "pointer",
                      color: deptIdx === 0 ? "var(--faint)" : "var(--muted)", padding: 0, display: "flex",
                    }}
                    title="Move up"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    onClick={() => onReorderDepartment(deptIdx, deptIdx + 1)}
                    disabled={deptIdx === deptNames.length - 1}
                    style={{
                      background: "none", border: "none", cursor: deptIdx === deptNames.length - 1 ? "default" : "pointer",
                      color: deptIdx === deptNames.length - 1 ? "var(--faint)" : "var(--muted)", padding: 0, display: "flex",
                    }}
                    title="Move down"
                  >
                    <ChevronDown size={15} />
                  </button>
                </span>
              }
            />
            <div style={{ marginTop: 6, paddingLeft: 4 }}>
              {(departments[dept] || []).map((sub, idx) => (
                <div
                  key={sub}
                  draggable
                  onDragStart={() => setDragInfo({ dept, index: idx })}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragInfo && dragInfo.dept === dept) setDragOverIndex(idx);
                  }}
                  onDragLeave={() => setDragOverIndex((i) => (i === idx ? null : i))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragInfo && dragInfo.dept === dept && dragInfo.index !== idx) {
                      onReorderSubcategory(dept, dragInfo.index, idx);
                    }
                    setDragInfo(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => { setDragInfo(null); setDragOverIndex(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    borderTop: dragOverIndex === idx && dragInfo?.dept === dept ? "2px solid #000000" : "2px solid transparent",
                  }}
                >
                  <span style={{ color: "var(--faint)", cursor: "grab", display: "flex", flexShrink: 0 }} title="Drag to reorder">
                    <GripVertical size={13} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <EditableAttrRow
                      value={sub}
                      onRename={(v) => onRenameSubcategory(dept, sub, v)}
                      onRemove={() => onRemoveSubcategory(dept, sub)}
                    />
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  style={{ flex: 1, fontSize: 12, padding: "5px 8px" }}
                  placeholder="New subcategory…"
                  value={newSubFor[dept] || ""}
                  onChange={(e) => setNewSubFor((prev) => ({ ...prev, [dept]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") submitNewSub(dept); }}
                />
                <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => submitNewSub(dept)}>Add</button>
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input
            style={{ flex: 1 }}
            placeholder="New category…"
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitNewDept(); }}
          />
          <button className="btn btn-primary" onClick={submitNewDept} disabled={!newDept.trim()}>Add</button>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
          Renaming a department or subcategory updates every catalog item using it. Removing one just takes it off the list — existing items keep their saved value.
        </div>
      </div>
    </div>
  );
}
