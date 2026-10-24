import { useState, useEffect, useRef } from "react";
import {
  Printer, ChevronRight, Loader2, Share2, Radio, Camera,
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
  const [choosing, setChoosing] = useState(false); // the Share window

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
          {/* Shows only while this list's live link is on; tapping it brings
              the link back (copy it again, or turn it off). */}
          {onShareLive && hasLiveLink && (
            <button
              className="btn btn-ghost pv-live"
              onClick={() => onShareLive(project)}
              disabled={shareGenerating}
              title="Live link is on: it always shows this list as it currently is. Tap to copy it or turn it off."
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              <Radio size={14} /> Live
            </button>
          )}
          {(onShareSnapshot || onShareLive) && (
            <button
              className="btn btn-ghost"
              onClick={() => setChoosing(true)}
              disabled={shareGenerating}
              title="Share this list as a snapshot or a live link"
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

      {choosing && (
        <div className="no-print m-overlay" onClick={() => setChoosing(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 440, padding: 22, border: "1px solid var(--border2)" }}>
            <div className="stencil" style={{ fontSize: 14, marginBottom: 12 }}>Share this list</div>
            {onShareSnapshot && (
              <ShareChoice
                icon={<Camera size={18} />}
                title="Snapshot"
                hint="A copy of the list as it is now. Later edits don't change it. Good for rental houses."
                onClick={() => { setChoosing(false); onShareSnapshot(project); }}
              />
            )}
            {onShareLive && (
              <ShareChoice
                icon={<Radio size={18} />}
                title={hasLiveLink ? "Live link · on" : "Live link"}
                accent={hasLiveLink}
                hint={hasLiveLink
                  ? "It's on. Tap to copy it again or turn it off."
                  : "Always shows the latest version: your edits appear on the same link. Stays on until you turn it off."}
                onClick={() => { setChoosing(false); onShareLive(project); }}
              />
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button className="btn btn-ghost" onClick={() => setChoosing(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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

// One choice in the Share window: icon, name and a short explanation.
function ShareChoice({ icon, title, hint, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="row"
      style={{
        display: "flex", gap: 12, alignItems: "flex-start", width: "100%", textAlign: "left",
        padding: "12px 14px", marginBottom: 10, borderRadius: 4, cursor: "pointer",
        background: "var(--surface2)", color: "var(--text)", fontFamily: "inherit",
        border: `1px solid ${accent ? "var(--accent)" : "var(--border2)"}`,
      }}
    >
      <span style={{ color: "var(--accent)", marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: accent ? "var(--accent)" : "var(--text)" }}>{title}</span>
        <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.45 }}>{hint}</span>
      </span>
    </button>
  );
}
