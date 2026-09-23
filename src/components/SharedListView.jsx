import { useEffect, useRef, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { ACCENT_CHOICES } from "../constants.js";
import { buildPdf } from "../lib/pdf.js";
import { fetchSharedList } from "../lib/share.js";
import { renderPdfPages } from "../lib/pdfPreview.js";
import { defaultExportFilename, fmtDate, formatDMY, orderDepartments, saveFile, withTimeStamp } from "../lib/utils.js";

// Public, read-only page behind /share/:token — no account needed. Serves
// both live links (always current) and frozen snapshots; the SQL function
// behind fetchSharedList decides which. Shows the owner's real PDF export,
// drawn page by page (same as the in-app preview), so what the rental house
// sees is exactly the file they can download.
export function SharedListView({ token }) {
  const [shared, setShared] = useState(undefined); // undefined = loading, null = not found
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pdf, setPdf] = useState(null); // { blob } once built
  const [pdfStatus, setPdfStatus] = useState("loading"); // "loading" | "ready" | "error"
  const pagesRef = useRef(null);

  useEffect(() => {
    fetchSharedList(token)
      .then((data) => setShared(data || null))
      .catch((err) => { console.error("Couldn't load shared list:", err); setError(true); });
  }, [token]);

  useEffect(() => {
    document.documentElement.style.background = PAGE_BG;
    document.body.style.background = PAGE_BG;
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = PAGE_BG;
    document.head.appendChild(meta);
  }, []);

  useEffect(() => {
    if (shared?.project?.name) document.title = `${shared.project.name} — BOXGO`;
  }, [shared]);

  // Build the PDF once the list has loaded, then draw it.
  useEffect(() => {
    if (!shared) return;
    let cancelled = false;
    let cancelRender = null;
    const fail = (err) => { console.error("Shared PDF preview failed:", err); if (!cancelled) setPdfStatus("error"); };
    const departments = orderDepartments(shared.departments || {}, shared.departmentOrder);
    const accentHex = (ACCENT_CHOICES.find((a) => a.id === shared.accentId) || ACCENT_CHOICES[0]).light;
    buildPdf({ project: shared.project, catalog: shared.catalog, departments, accentHex, preparedBy: shared.preparedBy || {} })
      .then(({ blob }) => {
        if (cancelled) return;
        setPdf({ blob });
        cancelRender = renderPdfPages(pagesRef.current, blob, {
          onDone: () => { if (!cancelled) setPdfStatus("ready"); },
          onError: fail,
        });
      })
      .catch(fail);
    return () => { cancelled = true; cancelRender?.(); };
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
  const accentHex = (ACCENT_CHOICES.find((a) => a.id === shared.accentId) || ACCENT_CHOICES[0]).light;

  async function download() {
    setDownloading(true);
    try {
      const blob = pdf?.blob || (await buildPdf({
        project, catalog, preparedBy, accentHex,
        departments: orderDepartments(shared.departments || {}, shared.departmentOrder),
      })).blob;
      saveFile(blob, withTimeStamp(`${defaultExportFilename(project, preparedBy.name) || "equipment-list"}.pdf`));
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

      {pdfStatus === "loading" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#888", fontSize: 13, padding: "60px 0" }}>
          <Loader2 size={16} className="spin" /> Preparing the list…
        </div>
      )}
      {pdfStatus === "error" && (
        <div style={{ color: "#888", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
          Couldn't show the preview. Try Download PDF below.
        </div>
      )}
      {/* Kept measurable while loading so pages are drawn at the right width. */}
      <div ref={pagesRef} style={pdfStatus === "ready" ? undefined : { visibility: "hidden", height: 0, overflow: "hidden" }} />

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
    <div style={{ minHeight: "100vh", background: PAGE_BG, color: "#111", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }"}</style>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 12px 80px" }}>{children}</div>
    </div>
  );
}

// Light grey behind the white PDF pages so their edges show.
const PAGE_BG = "#ececec";

const styles = {
  banner: { fontSize: 11, letterSpacing: ".04em", color: "#777", textTransform: "uppercase", marginBottom: 12, textAlign: "center" },
  footerBar: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #ddd", padding: "10px 16px", display: "flex", justifyContent: "center" },
  dl: { display: "inline-flex", alignItems: "center", gap: 6, color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
};
