import { useEffect, useRef } from "react";

const labelStyle = { fontSize: 10, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.04em" };
const valueStyle = { fontSize: 13, lineHeight: "18px", fontWeight: 700, color: "var(--text)" };

// The Producer / Gaffer set in the Create New / Edit window (the same ones
// the equipment list shows).
function roleName(people, exact, loose) {
  const list = people || [];
  const p = list.find((x) => (x.role || "").trim().toLowerCase() === exact) || list.find((x) => loose.test(x.role || ""));
  return p ? (p.name || "").trim() : "";
}

// The project's details box, exactly like the equipment list's info
// strip: Production House · Producer, Rental House · Gaffer, then the
// project notes. Tapping a detail opens Edit project.
export function InfoStrip({ project, onEditInfo, onNotesChange }) {
  const noteRef = useRef(null);

  useEffect(() => {
    const el = noteRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
  }, [project.notes]);

  const pairs = [
    { label: "Production House", values: [project.productionHouse, roleName(project.people, "producer", /producer/i)] },
    { label: "Rental House", values: [project.rentalHouse, roleName(project.people, "gaffer", /gaffer/i)] },
  ].map((p) => ({ ...p, values: p.values.filter(Boolean) })).filter((p) => p.values.length);

  return (
    <div style={{ marginBottom: 22, border: "1px solid var(--border)", borderRadius: 4, padding: "12px 14px" }}>
      {pairs.length > 0 ? (
        <div onClick={onEditInfo} style={{ display: "flex", flexWrap: "wrap", gap: "10px 28px", cursor: "pointer" }} title="Edit project">
          {pairs.map((pair) => (
            <div key={pair.label} style={{ minWidth: 0 }}>
              <div style={labelStyle}>{pair.label}</div>
              <div style={valueStyle}>{pair.values.join(" · ")}</div>
            </div>
          ))}
        </div>
      ) : (
        <div onClick={onEditInfo} style={{ fontSize: 12, color: "var(--muted2)", cursor: "pointer" }}>No production details set yet.</div>
      )}
      <textarea
        ref={noteRef}
        value={project.notes || ""}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Project notes…"
        rows={1}
        style={{ width: "100%", resize: "none", overflow: "hidden", fontSize: 13, padding: "4px 0 0", marginTop: 10, border: "none", borderRadius: 0, background: "none" }}
      />
    </div>
  );
}
