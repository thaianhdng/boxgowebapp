
export function SideItem({ active, label, sub, icon, dot, count, onClick }) {
  return (
    <div
      className="row"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 3,
        cursor: "pointer", marginBottom: 2,
        background: active ? "var(--accent)" : "transparent",
        color: active ? "var(--accent-text)" : "var(--text)",
      }}
    >
      {icon}
      {dot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: active ? "var(--accent-text)" : "var(--muted)", opacity: active ? 0.85 : 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
      </div>
      {typeof count === "number" && (
        <span style={{ fontSize: 11, color: active ? "var(--accent-text)" : "var(--muted)", opacity: active ? 0.85 : 1 }}>{count}</span>
      )}
    </div>
  );
}
