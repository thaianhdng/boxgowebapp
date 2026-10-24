import { useState, useEffect, useRef } from "react";
import {
  Printer, ChevronRight, Loader2, Share2, Radio,
} from "lucide-react";
import { defaultExportFilename } from "../lib/utils.js";
import { renderPdfPages } from "../lib/pdfPreview.js";
import { PDF_FONTS, pdfFontFor } from "../lib/font.js";


// Renders the preview screen. Builds the actual PDF and draws those exact
// bytes page by page with pdf.js (see lib/pdfPreview.js) — no separate
// layout to keep in sync, so the preview and the downloaded file always
// match, and pdf.js's text layer keeps the text selectable and copyable.
export function PreviewScreen({ project, userName, buildPdfBlob, onBack, onDownload, pdfGenerating, onSetPdfFont, onShareSnapshot, onShareLive, hasLiveLink, shareGenerating }) {
  const [filename, setFilename] = useState(() => defaultExportFilename(project, userName));
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const pagesRef = useRef(null);
  // The PDF already built for the preview, reused by Download so the file
  // is ready the instant it's tapped (iOS only opens its Share menu then).
  const blobRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let cancelRender = null;
    setStatus("loading");
    blobRef.current = null;
    const fail = (err) => { console.error("Preview generation failed:", err); if (!cancelled) setStatus("error"); };
    buildPdfBlob()
      .then(({ blob }) => {
        if (cancelled) return;
        blobRef.current = blob;
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
    <div style={{ flex: 1, background: "var(--surface2)", display: "flex", flexDirection: "column" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--surface)", borderBottom: "2px solid var(--border)",
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: "6px 10px" }}>
          <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> Back
        </button>
        <div style={{ flex: "1 1 60px", minWidth: 0 }}>
          <div className="stencil" style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name || "Equipment List"}
          </div>
        </div>
        {onSetPdfFont && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)", flexShrink: 0 }} title="Font for this project's PDF and share links">
            Font
            <select
              value={pdfFontFor(project.pdfFont).id}
              onChange={(e) => onSetPdfFont(e.target.value)}
              aria-label="PDF font"
              style={{ fontSize: 12, padding: "6px 8px", width: "auto" }}
            >
              {PDF_FONTS.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>
        )}
        <div className="pv-actions">
          {onShareLive && (
            <button
              className="btn btn-ghost"
              onClick={() => onShareLive(project)}
              disabled={shareGenerating}
              title={hasLiveLink
                ? "Live link is on: it always shows this list as it currently is, updating as you edit. For crew."
                : "A link that always shows this list as it currently is — updates as you edit. For crew."}
              style={hasLiveLink ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
            >
              <Radio size={14} /> Live link
              {hasLiveLink && <span aria-label="on" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
            </button>
          )}
          {onShareSnapshot && (
            <button
              className="btn btn-ghost"
              onClick={() => onShareSnapshot(project)}
              disabled={shareGenerating}
              title="Share a snapshot: a permanent link to this list exactly as it is now — it won't change when you edit later. For rental houses."
            >
              <Share2 size={14} /> {shareGenerating ? "Preparing…" : "Share"}
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => onDownload(filename, blobRef.current)}
            disabled={pdfGenerating}
          >
            <Printer size={14} /> <span>Download<span className="pv-long"> PDF</span></span>
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
