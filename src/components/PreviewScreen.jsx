import { useState, useEffect, useRef } from "react";
import {
  Printer, ChevronRight, Loader2, Share2, Radio, Camera, Copy, Check,
} from "lucide-react";
import { defaultExportFilename, fmtDate, formatDMY } from "../lib/utils.js";
import { renderPdfPages } from "../lib/pdfPreview.js";
import { PDF_FONTS, pdfFontFor } from "../lib/font.js";
import { ReadOnlyList } from "./ReadOnlyList.jsx";

// PDF or List (owner's call): the real PDF pages, or the list as the
// people it's shared with see it. Remembered per device.
const MODE_KEY = "boxgo-preview-mode";
function readMode() {
  try { return localStorage.getItem(MODE_KEY) === "list" ? "list" : "pdf"; } catch { return "pdf"; }
}


// Renders the preview screen. Builds the actual PDF and draws those exact
// bytes page by page with pdf.js (see lib/pdfPreview.js) — no separate
// layout to keep in sync, so the preview and the downloaded file always
// match, and pdf.js's text layer keeps the text selectable and copyable.
export function PreviewScreen({ project, userName, buildPdfBlob, listInputs, onBack, onDownload, pdfGenerating, onSetPdfFont, onShareSnapshot, onShareLive, onStopLive, liveUrl, shareGenerating }) {
  const [filename, setFilename] = useState(() => defaultExportFilename(project, userName));
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [mode, setMode] = useState(readMode);
  function pickMode(m) {
    setMode(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* storage blocked — just this visit */ }
  }
  const showList = mode === "list" && !!listInputs;
  const pagesRef = useRef(null);
  // The PDF already built for the preview, reused by Download so the file
  // is ready the instant it's tapped (iOS only opens its Share menu then).
  const blobRef = useRef(null);
  // The Share window (owner's call: one window, the links show inside it).
  const [sharing, setSharing] = useState(false);
  const [snapshot, setSnapshot] = useState(null); // { url, reusedFrom } once made
  const [busy, setBusy] = useState(""); // "snapshot" | "live" | "off" while working
  const [shareError, setShareError] = useState("");
  const [confirmOff, setConfirmOff] = useState(false); // "Turn off live link?" prompt
  // The link last copied; its Copy button reads "Copied" (and pops) for a
  // moment. `n` replays the pop on every copy.
  const [copied, setCopied] = useState(null); // { url, n }
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2200);
    return () => clearTimeout(t);
  }, [copied]);
  const copyLink = (url) => navigator.clipboard?.writeText(url).then(() => setCopied((c) => ({ url, n: (c?.n || 0) + 1 })), () => {});

  function openShare() {
    setSnapshot(null);
    setShareError("");
    setSharing(true);
  }
  async function run(kind, fn) {
    setBusy(kind);
    setShareError("");
    try {
      await fn();
    } catch (err) {
      setShareError(err.message || "Sorry, that didn't work. Please try again.");
    } finally {
      setBusy("");
    }
  }
  const makeSnapshot = () => run("snapshot", async () => {
    const result = await onShareSnapshot(project);
    setSnapshot(result);
    copyLink(result.url);
  });
  const turnOnLive = () => run("live", async () => {
    const { url } = await onShareLive(project);
    copyLink(url);
  });
  const turnOffLive = () => run("off", () => onStopLive(project.id));

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
        {/* Back, name and Font share one line; when a phone is too narrow
            for the name and the full font picker, the picker moves down a
            line (owner's call) rather than either being squeezed. */}
        <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: "6px 10px", flexShrink: 0 }}>
          <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> Back
        </button>
        {/* The name (accent colour, owner's call) keeps room for about ten
            letters, plus the live icon. */}
        <div style={{ flex: "1 1 0", minWidth: liveUrl ? 126 : 90, display: "flex", alignItems: "center", gap: 8 }}>
          <div className="stencil" style={{ fontSize: 13, color: "var(--accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
            {project.name || "Equipment List"}
          </div>
          {/* Beside the name only while this list's live link is on, in red
              (owner's call); tapping it asks whether to turn the link off. */}
          {liveUrl && (
            <button
              onClick={() => { setShareError(""); setConfirmOff(true); }}
              title="Live link is on: it always shows this list as it currently is. Tap to turn it off."
              aria-label="Live link is on — turn it off"
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28,
                padding: 0, borderRadius: 4, cursor: "pointer", background: "none",
                border: "1px solid var(--danger)", color: "var(--danger)",
              }}
            >
              <Radio size={15} />
            </button>
          )}
        </div>
        {onSetPdfFont && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)", flex: "0 0 auto", marginLeft: "auto" }} title="Font for this project's PDF and share links">
            <span className="pv-long">Font</span>
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
        </div>
        <div className="pv-actions">
          {(onShareSnapshot || onShareLive) && (
            <button className="btn btn-ghost" onClick={openShare} title="Share this list as a snapshot or a live link">
              <Share2 size={14} /> Share
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

      {sharing && (
        <div className="no-print m-overlay" onClick={() => setSharing(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 440, maxHeight: "100%", overflowY: "auto", padding: 22, border: "1px solid var(--border2)" }}>
            <div className="stencil" style={{ fontSize: 14, marginBottom: 12 }}>Share this list</div>
            {shareError && <div style={{ fontSize: 12.5, color: "var(--danger)", marginBottom: 10 }}>{shareError}</div>}
            {onShareSnapshot && (
              <ShareChoice
                icon={<Camera size={18} />}
                title="Snapshot"
                hint="A copy of the list as it is now. Later edits don't change it. Good for rental houses."
                onPick={snapshot ? null : makeSnapshot}
                busy={busy === "snapshot"}
                disabled={!!busy || shareGenerating}
              >
                {snapshot && (
                  <>
                    {snapshot.reusedFrom && (
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>
                        Nothing has changed since your snapshot of {formatDMY(fmtDate(new Date(snapshot.reusedFrom)))}, so this is the same link.
                      </div>
                    )}
                    <LinkRow url={snapshot.url} copied={copied} onCopy={copyLink} />
                  </>
                )}
              </ShareChoice>
            )}
            {onShareLive && (
              <ShareChoice
                icon={<Radio size={18} />}
                title={liveUrl ? "Live link · on" : "Live link"}
                accent={!!liveUrl}
                hint="Always shows the latest version: your edits appear on the same link. Stays on until you turn it off."
                onPick={liveUrl ? null : turnOnLive}
                busy={busy === "live"}
                disabled={!!busy || shareGenerating}
              >
                {liveUrl && (
                  <>
                    <LinkRow url={liveUrl} copied={copied} onCopy={copyLink} />
                    {onStopLive && (
                      <button
                        onClick={turnOffLive}
                        disabled={!!busy}
                        style={{ marginTop: 8, background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: "var(--danger)", fontFamily: "inherit" }}
                      >
                        {busy === "off" ? "Turning off…" : "Turn off live link"}
                      </button>
                    )}
                  </>
                )}
              </ShareChoice>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button className="btn btn-primary" onClick={() => setSharing(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {confirmOff && (
        <div className="no-print m-overlay" onClick={() => setConfirmOff(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 380, padding: 22, border: "1px solid var(--border2)" }}>
            <div className="stencil" style={{ fontSize: 14, marginBottom: 10 }}>Turn off live link?</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, marginBottom: 16 }}>
              Anyone you sent it to won't be able to open it any more. Turning it on again later makes a new link.
            </div>
            {shareError && <div style={{ fontSize: 12.5, color: "var(--danger)", marginBottom: 10 }}>{shareError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setConfirmOff(false)} disabled={busy === "off"}>Cancel</button>
              <button
                className="btn"
                onClick={() => run("off", async () => { await onStopLive(project.id); setConfirmOff(false); })}
                disabled={busy === "off"}
                style={{ background: "var(--danger)", borderColor: "var(--danger)", color: "#fff" }}
              >
                {busy === "off" ? "Turning off…" : "Turn off"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, padding: 16 }}>
        {listInputs && (
          <div role="radiogroup" aria-label="Show" style={{ display: "flex", width: "fit-content", margin: "0 auto 14px", gap: 2, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: 2 }}>
            {[["pdf", "PDF"], ["list", "List"]].map(([id, label]) => (
              <button
                key={id}
                role="radio"
                aria-checked={mode === id}
                onClick={() => pickMode(id)}
                title={id === "list" ? "The list as the people you share it with see it" : "The PDF exactly as it downloads and prints"}
                style={{
                  border: "none", borderRadius: 3, padding: "6px 18px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase",
                  background: mode === id ? "var(--accent)" : "transparent",
                  color: mode === id ? "var(--accent-text)" : "var(--muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {showList && (
          <div style={{ maxWidth: 720, margin: "0 auto", fontSize: 13 }}>
            <ReadOnlyList {...listInputs} />
          </div>
        )}
        {!showList && status === "error" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", flexDirection: "column", gap: 8 }}>
            <div className="stencil" style={{ fontSize: 13, color: "var(--muted)" }}>Couldn't generate the preview.</div>
          </div>
        )}
        {!showList && status === "loading" ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 10 }}>
            <Loader2 size={18} className="spin" style={{ color: "var(--accent)" }} />
            <span className="stencil" style={{ fontSize: 12, color: "var(--muted)" }}>Generating preview…</span>
          </div>
        ) : null}
        {/* Kept in place (measurable) while the List shows, so switching
            back to PDF is instant. */}
        <div ref={pagesRef} style={{ maxWidth: 900, margin: "0 auto", ...(status === "ready" && !showList ? {} : { visibility: "hidden", height: 0, overflow: "hidden" }) }} />
      </div>
    </div>
  );
}

// One choice in the Share window: icon, name and a short explanation.
// Tapping it (`onPick`) makes its link, which then shows inside it
// (`children`); once it has one it's no longer tappable.
function ShareChoice({ icon, title, hint, accent, onPick, busy, disabled, children }) {
  const head = (
    <>
      <span style={{ color: "var(--accent)", marginTop: 1, flexShrink: 0 }}>{busy ? <Loader2 size={18} className="spin" /> : icon}</span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: accent ? "var(--accent)" : "var(--text)" }}>{title}</span>
        <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.45 }}>{hint}</span>
      </span>
    </>
  );
  const headStyle = { display: "flex", gap: 12, alignItems: "flex-start", width: "100%", textAlign: "left", padding: "12px 14px", background: "none", border: "none", color: "var(--text)", fontFamily: "inherit" };
  return (
    <div style={{ marginBottom: 10, borderRadius: 4, background: "var(--surface2)", border: `1px solid ${accent ? "var(--accent)" : "var(--border2)"}` }}>
      {onPick ? (
        <button className="row" onClick={onPick} disabled={disabled} style={{ ...headStyle, cursor: disabled ? "default" : "pointer", borderRadius: 4 }}>{head}</button>
      ) : (
        <div style={headStyle}>{head}</div>
      )}
      {children && <div style={{ padding: "0 14px 12px 44px" }}>{children}</div>}
    </div>
  );
}

// A link with its Copy button ("✓ Copied" for a moment after copying).
function LinkRow({ url, copied, onCopy }) {
  const done = copied?.url === url;
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input readOnly value={url} onFocus={(e) => e.target.select()} style={{ flex: 1, minWidth: 0, fontSize: 12, transition: "border-color 200ms", ...(done ? { borderColor: "var(--accent)" } : {}) }} />
      <button
        key={done ? copied.n : "copy"}
        className={done ? "btn btn-ghost m-copied" : "btn btn-ghost"}
        onClick={() => onCopy(url)}
        style={{ minWidth: 86, justifyContent: "center", ...(done ? { color: "var(--accent)", borderColor: "var(--accent)" } : {}) }}
      >
        {done ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
      </button>
    </div>
  );
}
