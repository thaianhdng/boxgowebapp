import { useState, useEffect } from "react";
import {
  Printer, ChevronRight, Loader2, Share2,
} from "lucide-react";
import { defaultExportFilename } from "../lib/utils.js";


// Renders the preview screen. Builds the actual PDF and displays those
// exact bytes in the browser's own native PDF viewer (an <iframe> pointed
// at the real file) — there is no separate layout to keep in sync, so the
// preview and the downloaded file are structurally guaranteed to match,
// and because it's the real PDF (not a rasterized screenshot of it), the
// text stays selectable and copyable straight out of the preview.
export function PreviewScreen({ project, userName, buildPdfBlob, showBack, onBack, onDownload, pdfGenerating, onShare, shareGenerating }) {
  const [filename, setFilename] = useState(() => defaultExportFilename(project, userName));
  const [pdfUrl, setPdfUrl] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url = null;
    setPdfUrl(null);
    (async () => {
      try {
        const { blob, totalPages: pages } = await buildPdfBlob();
        url = URL.createObjectURL(blob);
        if (cancelled) return;
        setPdfUrl(url);
        setTotalPages(pages);
        setError(false);
      } catch (err) {
        console.error("Preview generation failed:", err);
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface2)", display: "flex", flexDirection: "column" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--surface)", borderBottom: "2px solid var(--border)",
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        {showBack && (
          <button className="btn btn-ghost" onClick={onBack} style={{ padding: "6px 10px" }}>
            <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> Back
          </button>
        )}
        <div style={{ flex: 1, minWidth: 80 }}>
          <div className="stencil" style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name || "Equipment List"}
          </div>
        </div>
        {onShare && (
          <button
            className="btn btn-ghost"
            onClick={() => onShare(project)}
            disabled={shareGenerating}
            title="Get a shareable link to a read-only snapshot of this list, frozen at today's quantities — viewable by anyone, no account needed."
            style={{ padding: "6px 12px", fontSize: 12 }}
          >
            <Share2 size={14} /> {shareGenerating ? "Preparing…" : "Share snapshot"}
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={() => onDownload(filename)}
          disabled={pdfGenerating}
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          <Printer size={14} /> Download PDF
        </button>
      </div>

      <div style={{ flex: 1, padding: 16 }}>
        {error && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", flexDirection: "column", gap: 8 }}>
            <div className="stencil" style={{ fontSize: 13, color: "var(--muted)" }}>Couldn't generate the preview.</div>
          </div>
        )}
        {!error && !pdfUrl ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 10 }}>
            <Loader2 size={18} className="spin" style={{ color: "var(--accent)" }} />
            <span className="stencil" style={{ fontSize: 12, color: "var(--muted)" }}>Generating preview…</span>
          </div>
        ) : null}
        {!error && pdfUrl && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&statusbar=0&view=FitH`}
              title={`PDF preview — ${totalPages} page${totalPages !== 1 ? "s" : ""}`}
              style={{
                width: "100%",
                height: "calc(100vh - 140px)",
                minHeight: 500,
                border: "1px solid var(--border)",
                borderRadius: 4,
                background: "#fff",
                display: "block",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
