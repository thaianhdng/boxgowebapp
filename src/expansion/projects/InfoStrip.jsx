import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { uid } from "../../lib/utils.js";
import { PersonModal } from "./People.jsx";

const labelStyle = { fontSize: 10, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.04em" };
const valueStyle = { fontSize: 13, lineHeight: "18px", fontWeight: 700, color: "var(--text)" };
const linkBtn = { background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left", ...valueStyle };

const isProduction = (role) => /produc/i.test(role || "");
const isRental = (role) => /gaffer/i.test(role || "");

// The project's details box, laid out like the equipment list's info
// strip: each house with its people (Production House · Producer, Rental
// House · Gaffer), then everyone else by role, then the project notes.
export function InfoStrip({ project, onEditInfo, onPeopleChange, onNotesChange }) {
  const [editing, setEditing] = useState(null); // { person, isNew }
  const noteRef = useRef(null);
  const people = project.people || [];

  useEffect(() => {
    const el = noteRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
  }, [project.notes]);

  const others = people.filter((p) => !isProduction(p.role) && !isRental(p.role));
  const roleGroups = [];
  for (const p of others) {
    const role = (p.role || "").trim() || "Other";
    const g = roleGroups.find((x) => x.label.toLowerCase() === role.toLowerCase());
    if (g) g.people.push(p); else roleGroups.push({ label: role, people: [p] });
  }
  const pairs = [
    { label: "Production House", house: project.productionHouse, people: people.filter((p) => isProduction(p.role)) },
    { label: "Rental House", house: project.rentalHouse, people: people.filter((p) => isRental(p.role)) },
    ...roleGroups,
  ].filter((pair) => pair.house || pair.people.length);

  function save(person) {
    onPeopleChange(editing.isNew ? [...people, person] : people.map((x) => (x.id === person.id ? person : x)));
    setEditing(null);
  }

  return (
    <div style={{ marginBottom: 22, border: "1px solid var(--border)", borderRadius: 4, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {pairs.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 28px", flex: 1, minWidth: 0 }}>
            {pairs.map((pair) => (
              <div key={pair.label} style={{ minWidth: 0 }}>
                <div style={labelStyle}>{pair.label}</div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 5, fontSize: 13, lineHeight: "18px" }}>
                  {[
                    pair.house && <button key="house" style={linkBtn} onClick={onEditInfo}>{pair.house}</button>,
                    ...pair.people.map((p) => (
                      <button
                        key={p.id}
                        style={linkBtn}
                        onClick={() => setEditing({ isNew: false, person: p })}
                        title={pair.house ? p.role : undefined}
                      >
                        {p.name || p.role}
                      </button>
                    )),
                  ].filter(Boolean).flatMap((el, i) => (i ? [<span key={`dot${i}`} style={{ color: "var(--muted2)", fontSize: 13 }}>·</span>, el] : [el]))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--muted2)", flex: 1 }}>No production details set yet.</div>
        )}
        <button
          className="btn btn-ghost"
          style={{ padding: "3px 8px", fontSize: 11, flexShrink: 0 }}
          onClick={() => setEditing({ isNew: true, person: { id: uid(), role: "", name: "", phone: "", email: "" } })}
        >
          <Plus size={12} /> Person
        </button>
      </div>
      <textarea
        ref={noteRef}
        value={project.notes || ""}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Project notes…"
        rows={1}
        style={{ width: "100%", resize: "none", overflow: "hidden", fontSize: 13, padding: "4px 0 0", marginTop: 10, border: "none", borderRadius: 0, background: "none" }}
      />
      {editing && (
        <PersonModal
          initial={editing.person}
          isNew={editing.isNew}
          onSave={save}
          onDelete={() => { onPeopleChange(people.filter((x) => x.id !== editing.person.id)); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
