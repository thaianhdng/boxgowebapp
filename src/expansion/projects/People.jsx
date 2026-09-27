import { useState } from "react";
import { Mail, Phone, Trash2 } from "lucide-react";
import { Field } from "../../components/Field.jsx";
import { Combobox } from "../../components/Combobox.jsx";
import { Modal } from "../shared/ui.jsx";

const ROLES = [
  "Director", "Producer", "Line Producer", "Production Manager", "1st AD", "Client", "Agency",
  "Gaffer", "Key Grip", "1st AC", "2nd AC", "DIT", "Art Director", "Colorist", "Editor",
];

export function PersonModal({ initial, isNew, onSave, onDelete, onClose }) {
  const [p, setP] = useState(initial);
  const set = (patch) => setP((prev) => ({ ...prev, ...patch }));
  const ok = (p.name || "").trim() || (p.role || "").trim();
  return (
    <Modal
      title={isNew ? "Add person" : "Edit person"}
      onClose={onClose}
      footer={
        <>
          {!isNew ? <button className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={onDelete}><Trash2 size={13} /> Remove</button> : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!ok} style={{ opacity: ok ? 1 : 0.5 }} onClick={() => ok && onSave({ ...p, name: p.name.trim(), role: p.role.trim() })}>{isNew ? "Add" : "Save"}</button>
          </div>
        </>
      }
    >
      {!isNew && (initial.phone || initial.email) && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {initial.phone && <a className="btn btn-ghost" href={`tel:${initial.phone.replace(/\s/g, "")}`}><Phone size={13} /> Call</a>}
          {initial.email && <a className="btn btn-ghost" href={`mailto:${initial.email}`}><Mail size={13} /> Email</a>}
        </div>
      )}
      <Field label="Role">
        <Combobox value={p.role} onChange={(v) => set({ role: v })} options={ROLES} placeholder="e.g. Producer, Gaffer" />
      </Field>
      <Field label="Name">
        <input value={p.name} onChange={(e) => set({ name: e.target.value })} style={{ width: "100%" }} />
      </Field>
      <Field label="Phone">
        <input type="tel" value={p.phone} onChange={(e) => set({ phone: e.target.value })} style={{ width: "100%" }} />
      </Field>
      <Field label="Email" style={{ marginBottom: 0 }}>
        <input type="email" value={p.email} onChange={(e) => set({ email: e.target.value })} style={{ width: "100%" }} />
      </Field>
    </Modal>
  );
}
