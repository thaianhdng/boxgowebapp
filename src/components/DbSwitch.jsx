import { dbMode, setDbMode, testDbConfigured } from "../lib/dbMode.js";

// Owner only (Settings → Data → Test Database): switch this device between
// the live database and the separate TEST one. Switching reloads the app;
// each database has its own sign-in, projects, catalog and Calendar data.
// `bare`: no heading (the segment around it has one).
export function DbSwitch({ bare }) {
  const mode = dbMode();
  const ready = testDbConfigured();
  const option = (value, label) => {
    const on = mode === value;
    return (
      <button
        type="button"
        disabled={!ready || on}
        onClick={() => setDbMode(value)}
        style={{
          flex: 1, padding: "6px 8px", fontSize: 12, fontWeight: 700, border: "none", borderRadius: 3, fontFamily: "inherit",
          cursor: ready && !on ? "pointer" : "default",
          background: on ? (value === "test" ? "#2DD4BF" : "var(--accent)") : "transparent",
          color: on ? (value === "test" ? "#111" : "var(--accent-text)") : ready ? "var(--text)" : "var(--muted2)",
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <div style={{ marginBottom: bare ? 12 : 20 }}>
      {!bare && <div className="stencil" style={{ fontSize: 11, color: "var(--accent)", marginBottom: 6 }}>Database</div>}
      <div style={{ display: "flex", gap: 3, background: "var(--surface2)", borderRadius: 4, padding: 3, marginBottom: 6 }}>
        {option("live", "Live BOXGO")}
        {option("test", "Test BOXGO")}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>
        {!ready
          ? "The test database isn't connected yet."
          : mode === "test"
            ? "You're in the TEST database: nothing here touches your real projects. Switch back to Live when you're done."
            : "Test BOXGO is a separate database for trying things out. Switching reloads the app; sign in there with your test password."}
      </div>
    </div>
  );
}
