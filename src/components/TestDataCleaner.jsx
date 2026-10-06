import { useState } from "react";
import { dbMode } from "../lib/dbMode.js";

// Owner only (Settings → Data): load or remove the made-up test
// data (src/lib/testData.js — every id starts with 7e57). Loading adds it
// with dates around today; removing deletes just it, never your own
// projects. `count` = test projects in this database now.
export function TestDataCleaner({ count, onLoad, onRemove }) {
  const [busy, setBusy] = useState(false);
  const live = dbMode() === "live";
  const run = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  return (
    <div style={{ marginBottom: 20, padding: "10px 12px", border: "1px solid var(--border2)", borderRadius: 4 }}>
      <div className="stencil" style={{ fontSize: 11, color: "var(--accent)", marginBottom: 4 }}>Test data</div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5, marginBottom: 8 }}>
        {count > 0
          ? `${count} made-up test project${count > 1 ? "s are" : " is"} in this database. Removing them leaves your own projects untouched.`
          : "27 made-up equipment lists and their Calendar details (every status, event type and display case), dated around today."}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-ghost"
          disabled={busy}
          style={{ flex: 1, justifyContent: "center", opacity: busy ? 0.5 : 1 }}
          onClick={() => {
            const where = live ? "your LIVE database (Test BOXGO is the safer place)" : "the test database";
            if (window.confirm(`${count ? "Reload" : "Load"} the made-up test data into ${where}? ${count ? "It's refreshed with dates around today. " : ""}Remove it any time with "Remove test data".`)) run(onLoad);
          }}
        >
          {busy ? "Working…" : count ? "Reload test data" : "Load test data"}
        </button>
        {count > 0 && (
          <button
            className="btn btn-ghost"
            disabled={busy}
            style={{ flex: 1, justifyContent: "center", color: "var(--danger)", opacity: busy ? 0.5 : 1 }}
            onClick={() => { if (window.confirm(`Remove the ${count} test projects (and their Calendar details)? Your own projects stay.`)) run(onRemove); }}
          >
            Remove test data
          </button>
        )}
      </div>
    </div>
  );
}
