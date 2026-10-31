import { useState } from "react";

// Owner only (Settings → Data → Test data): load or remove the made-up test
// data (src/lib/testData.js — every id starts with 7e57). Loading adds it
// to the owner's own account, next to their real work, with dates around
// today; removing deletes just it, never their own projects. `count` =
// test projects in the account now.
export function TestDataCleaner({ count, onLoad, onRemove }) {
  const [busy, setBusy] = useState(false);
  const run = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  return (
    <div style={{ marginBottom: 20, padding: "10px 12px", border: "1px solid var(--border2)", borderRadius: 4 }}>
      <div className="stencil" style={{ fontSize: 11, color: "var(--accent)", marginBottom: 4 }}>Test data</div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5, marginBottom: 8 }}>
        {count > 0
          ? `${count} made-up test project${count > 1 ? "s are" : " is"} in your account. Removing them leaves your own projects untouched.`
          : "35 made-up equipment lists and their Projects & Calendar details (every status, event type, list version and display case), dated around today. They sit next to your own projects; anything else you change while testing (catalog, tags, settings) is real."}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-ghost"
          disabled={busy}
          style={{ flex: 1, justifyContent: "center", opacity: busy ? 0.5 : 1 }}
          onClick={() => {
            if (window.confirm(`${count ? "Reload" : "Load"} the made-up test data into your account? ${count ? "It's refreshed with dates around today. " : ""}Your own projects aren't touched. Remove it any time with "Remove test data".`)) run(onLoad);
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
