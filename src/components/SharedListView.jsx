import { useEffect, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { ACCENT_CHOICES } from "../constants.js";
import { buildPdf } from "../lib/pdf.js";
import { fetchSharedList } from "../lib/share.js";
import {
  computeVisibleGrouped, defaultExportFilename, fmtDate, formatDMY, formatShootDateRange,
  formatTime24, groupCatalog, orderDepartments, orderedKeys, withTimeStamp,
} from "../lib/utils.js";

// Public, read-only page behind /share/:token — no account needed. Serves
// both live links (always current) and frozen snapshots; the SQL function
// behind fetchSharedList decides which. Rendered as a plain HTML list
// rather than an embedded PDF so it reads well on phones, with a download
// button that produces the owner's real PDF export.
export function SharedListView({ token }) {
  const [shared, setShared] = useState(undefined); // undefined = loading, null = not found
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchSharedList(token)
      .then((data) => setShared(data || null))
      .catch((err) => { console.error("Couldn't load shared list:", err); setError(true); });
  }, [token]);

  useEffect(() => {
    document.body.style.background = "#fff";
  }, []);

  useEffect(() => {
    if (shared?.project?.name) document.title = `${shared.project.name} — BOXGO`;
  }, [shared]);

  if (error || shared === null) {
    return (
      <Shell>
        <div style={{ color: "#888", fontSize: 14, padding: "40px 0" }}>
          {error ? "Couldn't load this list. Check your connection and try again." : "This link doesn't exist or has been turned off."}
        </div>
      </Shell>
    );
  }
  if (shared === undefined) {
    return (
      <Shell>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#888", fontSize: 13, padding: "40px 0" }}>
          <Loader2 size={16} className="spin" /> Loading…
        </div>
      </Shell>
    );
  }

  const { project, catalog, preparedBy = {} } = shared;
  const departments = orderDepartments(shared.departments || {}, shared.departmentOrder);
  const accentHex = (ACCENT_CHOICES.find((a) => a.id === shared.accentId) || ACCENT_CHOICES[0]).light;
  const days = project.days || [];
  const itemData = project.itemData || {};
  const visibleGrouped = computeVisibleGrouped(groupCatalog(catalog || []), itemData);
  const deptOrder = Object.keys(departments || {});
  const shootDateRange = formatShootDateRange(days);

  const infoBlocks = [];
  if (project.productionHouse || project.producer) infoBlocks.push(["Production House", [project.productionHouse, project.producer].filter(Boolean).join(" · ")]);
  if (project.rentalHouse || project.gaffer) infoBlocks.push(["Rental House", [project.rentalHouse, project.gaffer].filter(Boolean).join(" · ")]);
  if (project.createdAt) {
    const d = new Date(project.createdAt);
    infoBlocks.push(["Created On", `${formatDMY(fmtDate(d))}  ${formatTime24(d)}`]);
  }

  async function download() {
    setDownloading(true);
    try {
      const { blob } = await buildPdf({ project, catalog, departments, accentHex, preparedBy });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = withTimeStamp(`${defaultExportFilename(project, preparedBy.name) || "equipment-list"}.pdf`);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("Sorry, the PDF couldn't be generated. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Shell>
      <div style={styles.banner}>
        BOXGO · {shared.kind === "snapshot" && shared.sharedAt
          ? `Snapshot sent ${formatDMY(fmtDate(new Date(shared.sharedAt)))}`
          : "Live list — always shows the latest version"}
      </div>

      <div style={{ ...styles.header, borderBottom: `3px solid ${accentHex}` }}>
        <div style={styles.titleRow}>
          {project.tag && <span style={styles.tag}>{project.tag.toUpperCase()}</span>}
          <span style={{ ...styles.name, color: accentHex }}>{project.name || "Equipment List"}</span>
          {shootDateRange && <span style={styles.dates}>· {shootDateRange}</span>}
        </div>
        {(preparedBy.name || preparedBy.email || preparedBy.phone) && (
          <div style={styles.preparedBy}>
            {preparedBy.name && <div style={styles.who}>{preparedBy.name}</div>}
            {preparedBy.email && <div>{preparedBy.email}</div>}
            {preparedBy.phone && <div>{preparedBy.phone}</div>}
          </div>
        )}
      </div>

      {infoBlocks.length > 0 && (
        <div style={styles.infoStrip}>
          {infoBlocks.map(([label, value]) => (
            <div key={label}>
              <div style={styles.label}>{label}</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {project.note && (
        <div style={{ fontSize: 13, color: "#333", marginBottom: 18, whiteSpace: "pre-wrap" }}>
          <span style={{ ...styles.label, display: "block", marginBottom: 3 }}>Project note</span>
          {project.note}
        </div>
      )}

      {Object.keys(visibleGrouped).length === 0 && (
        <div style={{ color: "#888", fontSize: 13, padding: "16px 0" }}>No quantities entered for this shoot yet.</div>
      )}

      {orderedKeys(visibleGrouped, deptOrder).map((dept) => (
        <div key={dept}>
          <div style={{ ...styles.deptBar, background: accentHex }}>{dept}</div>
          {orderedKeys(visibleGrouped[dept], departments?.[dept] || []).map((sub) => (
            <div key={sub}>
              <div style={styles.subBar}>{sub}</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {visibleGrouped[dept][sub].map((c) => {
                    const entry = itemData[c.id];
                    const vals = days.map((d) => entry?.quantities?.[d.id] || 0);
                    const note = entry?.noteHidden ? "" : (entry?.notes || "");
                    return (
                      <tr key={c.id}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 700 }}>{c.name}</div>
                          {c.note && <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{c.note}</div>}
                        </td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 700, width: 44, whiteSpace: "nowrap" }}>
                          {project.perDayQty
                            ? vals.map((v, i) => <span key={i} style={{ display: "inline-block", minWidth: 20 }}>{v}</span>)
                            : Math.max(0, ...vals)}
                        </td>
                        <td style={{ ...styles.td, color: "#888", fontSize: 12, width: "35%" }}>{note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}

      <div style={styles.footerBar}>
        <button onClick={download} disabled={downloading} style={{ ...styles.dl, background: accentHex, opacity: downloading ? 0.6 : 1 }}>
          <Printer size={14} /> {downloading ? "Generating…" : "Download PDF"}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#111", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }"}</style>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 80px" }}>{children}</div>
    </div>
  );
}

const styles = {
  banner: { fontSize: 11, letterSpacing: ".04em", color: "#888", textTransform: "uppercase", marginBottom: 18 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", paddingBottom: 14, marginBottom: 14 },
  titleRow: { display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  tag: { fontWeight: 700, fontSize: 13 },
  name: { fontWeight: 700, fontSize: 22, textTransform: "uppercase" },
  dates: { fontSize: 13, color: "#333" },
  preparedBy: { textAlign: "right", fontSize: 13, color: "#555" },
  who: { fontWeight: 700, fontSize: 17, color: "#111" },
  infoStrip: { display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 18 },
  label: { fontSize: 10, letterSpacing: ".04em", color: "#888", textTransform: "uppercase" },
  deptBar: { color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 10px", marginTop: 18, textTransform: "uppercase" },
  subBar: { background: "#f2f2f2", fontWeight: 700, fontSize: 11, padding: "6px 12px", textTransform: "uppercase" },
  td: { padding: "8px 12px", borderBottom: "1px solid #e5e5e5", fontSize: 13, verticalAlign: "top" },
  footerBar: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e5e5", padding: "10px 16px", display: "flex", justifyContent: "center" },
  dl: { display: "inline-flex", alignItems: "center", gap: 6, color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
};
