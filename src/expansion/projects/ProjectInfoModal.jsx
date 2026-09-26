import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Field } from "../../components/Field.jsx";
import { Combobox } from "../../components/Combobox.jsx";
import { Modal } from "../shared/ui.jsx";

export function ProjectInfoModal({ initial, isNew, app, onSave, onDelete, onClose }) {
  const [f, setF] = useState({
    name: initial?.name || "",
    tag: initial?.tag || "",
    productionHouse: initial?.productionHouse || "",
    rentalHouse: initial?.rentalHouse || "",
  });
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));
  const tags = app.projectTags || [];

  function save() {
    if (!f.name.trim()) return;
    onSave({ ...f, name: f.name.trim(), productionHouse: f.productionHouse.trim(), rentalHouse: f.rentalHouse.trim() });
  }

  return (
    <Modal
      title={isNew ? "New project" : "Project info"}
      onClose={onClose}
      footer={
        <>
          {!isNew && onDelete ? (
            <button className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={onDelete}><Trash2 size={13} /> Delete project</button>
          ) : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={!f.name.trim()} style={{ opacity: f.name.trim() ? 1 : 0.5 }}>
              {isNew ? "Create" : "Save"}
            </button>
          </div>
        </>
      }
    >
      <Field label="Project name">
        <input autoFocus={isNew} value={f.name} onChange={(e) => set({ name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") save(); }} style={{ width: "100%" }} />
      </Field>
      {tags.length > 0 && (
        <Field label="Tag">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["", ...tags].map((t) => (
              <button
                key={t || "none"}
                type="button"
                onClick={() => set({ tag: t })}
                style={{
                  padding: "5px 9px", borderRadius: 3, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  border: "1px solid var(--border2)",
                  background: f.tag === t ? "var(--text)" : "transparent",
                  color: f.tag === t ? "var(--bg)" : "var(--text)",
                }}
              >
                {t || "None"}
              </button>
            ))}
          </div>
        </Field>
      )}
      <Field label="Production house">
        <Combobox value={f.productionHouse} onChange={(v) => set({ productionHouse: v })} options={app.productionHouses || []} placeholder="Production house" />
      </Field>
      <Field label="Rental house" style={{ marginBottom: 0 }}>
        <Combobox value={f.rentalHouse} onChange={(v) => set({ rentalHouse: v })} options={app.rentalHouses || []} placeholder="Rental house" />
      </Field>
    </Modal>
  );
}
