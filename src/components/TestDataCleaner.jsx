// Owner only (Settings → Catalog & Data): remove the made-up test data
// (testdata/, every id starting with 7e57) from this database, leaving
// everything else alone. Shown only while some is there.
export function TestDataCleaner({ count, onRemove }) {
  if (!count) return null;
  return (
    <div style={{ marginBottom: 20, padding: "10px 12px", border: "1px solid var(--border2)", borderRadius: 4 }}>
      <div className="stencil" style={{ fontSize: 11, color: "var(--accent)", marginBottom: 4 }}>Test data</div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5, marginBottom: 8 }}>
        {count} made-up test project{count > 1 ? "s" : ""} (from the test backup) {count > 1 ? "are" : "is"} in this database. Removing them leaves your own projects untouched.
      </div>
      <button
        className="btn btn-ghost"
        style={{ width: "100%", justifyContent: "center", color: "var(--danger)" }}
        onClick={() => { if (window.confirm(`Remove the ${count} test projects (and their Calendar details)? Your own projects stay.`)) onRemove(); }}
      >
        Remove test data
      </button>
    </div>
  );
}
