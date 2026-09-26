import { useState } from "react";
import { Mail, Phone, Plus, Trash2 } from "lucide-react";
import { Field } from "../../components/Field.jsx";
import { Combobox } from "../../components/Combobox.jsx";
import { Modal, Section, smallBtn } from "../shared/ui.jsx";
import { uid } from "../../lib/utils.js";

const ROLES = [
  "Director", "Producer", "Line Producer", "Production Manager", "1st AD", "Client", "Agency",
  "Gaffer", "Key Grip", "1st AC", "2nd AC", "DIT", "Art Director", "Colorist", "Editor",
];

function PersonModal({ initial, isNew, onSave, onDelete, onClose }) {
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

export function PeopleSection({ people, onChange }) {
  const [editing, setEditing] = useState(null); // { person, isNew }
  const list = people || [];

  function save(person) {
    onChange(editing.isNew ? [...list, person] : list.map((x) => (x.id === person.id ? person : x)));
    setEditing(null);
  }

  return (
    <Section
      title="People"
      right={<button className="btn btn-ghost" style={smallBtn} onClick={() => setEditing({ isNew: true, person: { id: uid(), role: "", name: "", phone: "", email: "" } })}><Plus size={12} /> Add</button>}
    >
      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--muted2)" }}>No one added yet. The equipment list shows whoever you add as Producer and Gaffer.</div>
      ) : (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {list.map((p) => (
            <div key={p.id} className="row" onClick={() => setEditing({ isNew: false, person: p })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{p.role || "—"}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
              </div>
              {p.phone && (
                <a href={`tel:${p.phone.replace(/\s/g, "")}`} onClick={(e) => e.stopPropagation()} className="btn btn-ghost" style={{ padding: "5px 7px" }} aria-label={`Call ${p.name}`}><Phone size={13} /></a>
              )}
              {p.email && (
                <a href={`mailto:${p.email}`} onClick={(e) => e.stopPropagation()} className="btn btn-ghost" style={{ padding: "5px 7px" }} aria-label={`Email ${p.name}`}><Mail size={13} /></a>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && (
        <PersonModal
          initial={editing.person}
          isNew={editing.isNew}
          onSave={save}
          onDelete={() => { onChange(list.filter((x) => x.id !== editing.person.id)); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}
    </Section>
  );
}
