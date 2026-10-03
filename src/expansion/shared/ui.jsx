import { X } from "lucide-react";

// Same look as BOXGO's own pop-up windows.
export function Modal({ title, onClose, children, footer, maxWidth = 440 }) {
  return (
    <div
      className="no-print"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
        alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
      }}
    >
      <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth, maxHeight: "88vh", overflowY: "auto", padding: 20, border: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10 }}>
          <div className="stencil" style={{ fontSize: 14 }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", padding: 2 }}><X size={18} /></button>
        </div>
        {children}
        {footer && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 18 }}>{footer}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10, minHeight: 26 }}>
      <span className="stencil" style={{ fontSize: 12, color: "var(--muted)" }}>{children}</span>
      {right && <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>{right}</div>}
    </div>
  );
}

export function Section({ title, right, children, id }) {
  return (
    <section id={id} style={{ marginBottom: 26 }}>
      <SectionTitle right={right}>{title}</SectionTitle>
      {children}
    </section>
  );
}

// On/off switch in the style of BOXGO's Create New window (e.g. "All days
// same | Custom per day"): grey track, the chosen side in the accent colour.
export function Toggle({ options, value, onChange, style }) {
  return (
    <div style={{ display: "flex", gap: 3, background: "var(--surface2)", borderRadius: 4, padding: 3, ...style }}>
      {options.map(([v, label]) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          style={{
            flex: 1, padding: "5px 8px", fontSize: 12, fontWeight: 700, border: "none", borderRadius: 3,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            background: value === v ? "var(--accent)" : "transparent",
            color: value === v ? "var(--accent-text)" : "var(--text)",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export const smallBtn = { padding: "3px 8px", fontSize: 11 };
