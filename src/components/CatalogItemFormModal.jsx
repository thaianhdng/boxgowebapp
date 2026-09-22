import { useState, useRef } from "react";
import {
  X,
} from "lucide-react";
import { Combobox } from "./Combobox.jsx";
import { Field } from "./Field.jsx";


export function CatalogItemFormModal({ initial, draft, departments, brands, catalog, onClose, onSave }) {
  const deptNames = Object.keys(departments);
  const seed = initial || draft;
  const [brand, setBrand] = useState(seed?.brand || "");
  const [model, setModel] = useState(seed?.model || (initial && !initial.brand ? initial.name || "" : ""));
  const [department, setDepartment] = useState(seed?.department || deptNames[0] || "");
  const [subcategory, setSubcategory] = useState(seed?.subcategory || departments[deptNames[0]]?.[0] || "");
  const [note, setNote] = useState(initial?.note || "");
  const [justAdded, setJustAdded] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const modelRef = useRef(null);
  const subs = departments[department] || [];

  function findDuplicate(brandU, modelU, noteT) {
    return (catalog || []).find((c) =>
      c.id !== initial?.id &&
      (c.brand || "").trim().toUpperCase() === brandU &&
      (c.model || "").trim().toUpperCase() === modelU &&
      (c.note || "").trim() === noteT
    );
  }

  function submit() {
    const brandU = brand.trim().toUpperCase();
    const modelU = model.trim().toUpperCase();
    const noteT = note.trim();
    const name = [brandU, modelU].filter(Boolean).join(" ");
    if (!name || !department) return;
    if (!confirmDuplicate && findDuplicate(brandU, modelU, noteT)) {
      setConfirmDuplicate(true);
      return;
    }
    onSave({ name, brand: brandU, model: modelU, department, subcategory: subcategory || "", note: noteT });
    setConfirmDuplicate(false);
    if (!initial) {
      setJustAdded(true);
      modelRef.current?.focus();
      modelRef.current?.select();
      setTimeout(() => setJustAdded(false), 1500);
    }
  }

  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 420, padding: 22, border: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="stencil" style={{ fontSize: 14 }}>{initial ? "Edit Catalog Entry" : "New Item"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Category" style={{ flex: 1 }}>
            {deptNames.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)", padding: "8px 0" }}>No categories yet — add one from "Manage" first.</div>
            ) : (
              <select
                style={{ width: "100%" }}
                value={department}
                onChange={(e) => { setDepartment(e.target.value); setSubcategory(departments[e.target.value]?.[0] || ""); }}
              >
                {deptNames.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </Field>
          <Field label="Subcategory" style={{ flex: 1 }}>
            <select style={{ width: "100%" }} value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
              <option value="">— No subcategory —</option>
              {subs.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Brand" style={{ flex: 1 }}>
            <Combobox
              value={brand}
              onChange={(v) => { setBrand(v); setConfirmDuplicate(false); }}
              options={brands || []}
              placeholder="e.g. ARRI"
              inputStyle={{ textTransform: "uppercase" }}
            />
          </Field>
          <Field label="Model / Item name" style={{ flex: 1 }}>
            <input ref={modelRef} style={{ width: "100%", textTransform: "uppercase" }} value={model} onChange={(e) => { setModel(e.target.value); setConfirmDuplicate(false); }} placeholder="e.g. Alexa 35, or C-Stand" />
          </Field>
        </div>
        <Field label="Item note (optional)">
          <textarea
            rows={2}
            style={{ width: "100%", resize: "vertical" }}
            value={note}
            onChange={(e) => { setNote(e.target.value); setConfirmDuplicate(false); }}
            placeholder="e.g. comes with hard case"
          />
        </Field>
        {confirmDuplicate && (
          <div style={{ fontSize: 12, color: "#AA6600", marginBottom: 10, padding: "8px 10px", background: "#FFF6E8", borderRadius: 4 }}>
            An item with this exact brand, model, and note already exists. Tap "{initial ? "Save changes" : "Add to catalog"}" again to add it anyway.
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--muted)", opacity: justAdded ? 1 : 0, transition: "opacity 150ms" }}>Added ✓</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>{initial ? "Cancel" : "Done"}</button>
            <button className="btn btn-primary" onClick={submit}>{initial ? "Save changes" : "Add to catalog"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
