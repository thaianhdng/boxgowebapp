import { useState, useEffect, useRef } from "react";
import {
  Printer, ChevronRight, Loader2, Share2, Radio,
} from "lucide-react";
import { defaultExportFilename } from "../lib/utils.js";
import { renderPdfPages } from "../lib/pdfPreview.js";


// Renders the preview screen. Builds the actual PDF and draws those exact
// bytes page by page with pdf.js (see lib/pdfPreview.js) — no separate
// layout to keep in sync, so the preview and the downloaded file always
// match, and pdf.js's text layer keeps the text selectable and copyable.
export function PreviewScreen({ project, userName, buildPdfBlob, showBack, onBack, onDownload, pdfGenerating, onShareSnapshot, onShareLive, hasLiveLink, shareGenerating }) {
  const [filename, setFilename] = useState(() => defaultExportFilename(project, userName));
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const pagesRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let cancelRender = null;
    setStatus("loading");
    const fail = (err) => { console.error("Preview generation failed:", err); if (!cancelled) setStatus("error"); };
    buildPdfBlob()
      .then(({ blob }) => {
        if (cancelled) return;
        cancelRender = renderPdfPages(pagesRef.current, blob, {
          onDone: () => { if (!cancelled) setStatus("ready"); },
          onError: fail,
        });
      })
      .catch(fail);
    return () => { cancelled = true; cancelRender?.(); };
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
        <div style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 10 }}>
          {onShareLive && (
            <button
              className="btn btn-ghost"
              onClick={() => onShareLive(project)}
              disabled={shareGenerating}
              title="A link that always shows this list as it currently is — updates as you edit. For crew."
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              <Radio size={14} /> {hasLiveLink ? "Live link (on)" : "Live link"}
            </button>
          )}
          {onShareSnapshot && (
            <button
              className="btn btn-ghost"
              onClick={() => onShareSnapshot(project)}
              disabled={shareGenerating}
              title="A permanent link to this list exactly as it is now — it won't change when you edit later. For rental houses."
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              <Share2 size={14} /> {shareGenerating ? "Preparing…" : "Send snapshot"}
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
      </div>

      <div style={{ flex: 1, padding: 16 }}>
        {status === "error" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", flexDirection: "column", gap: 8 }}>
            <div className="stencil" style={{ fontSize: 13, color: "var(--muted)" }}>Couldn't generate the preview.</div>
          </div>
        )}
        {status === "loading" ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 10 }}>
            <Loader2 size={18} className="spin" style={{ color: "var(--accent)" }} />
            <span className="stencil" style={{ fontSize: 12, color: "var(--muted)" }}>Generating preview…</span>
          </div>
        ) : null}
        <div ref={pagesRef} style={{ maxWidth: 900, margin: "0 auto", ...(status === "ready" ? {} : { visibility: "hidden", height: 0, overflow: "hidden" }) }} />
      </div>
    </div>
  );
}
