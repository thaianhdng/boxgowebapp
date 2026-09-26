// The owner's top navigation, shown on every screen — including BOXGO's
// equipment list screens, which render it through <Expansion part="nav">.

const TABS = [
  ["projects", "Projects"],
  ["calendar", "Calendar"],
  ["equipment", "Equipment"],
];

export default function Nav({ app }) {
  const active = app.inEquipment ? "equipment" : app.route.screen === "calendar" ? "calendar" : "projects";
  function go(tab) {
    if (tab === "equipment") app.openEquipmentLists();
    else app.go({ screen: tab });
  }
  return (
    <nav className="no-print" style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
      {TABS.map(([id, label]) => (
        <button
          key={id}
          className="stencil"
          onClick={() => go(id)}
          style={{
            flex: 1, background: "none", border: "none", cursor: "pointer", padding: "11px 4px 9px",
            fontSize: 11.5, fontFamily: "inherit",
            color: active === id ? "var(--accent)" : "var(--muted)",
            borderBottom: `2px solid ${active === id ? "var(--accent)" : "transparent"}`,
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
