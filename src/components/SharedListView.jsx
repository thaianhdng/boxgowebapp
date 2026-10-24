import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Printer, FileText, X } from "lucide-react";
import { ACCENT_CHOICES } from "../constants.js";
import { buildPdf } from "../lib/pdf.js";
import { dayColumns } from "../lib/dayLinks.js";
import { fetchSharedList } from "../lib/share.js";
import { renderPdfPages } from "../lib/pdfPreview.js";
import { Logo } from "./Logo.jsx";
import { BreakableName } from "./BreakableName.jsx";
import {
  computeVisibleGrouped, defaultExportFilename, fmtDate, formatDMY, formatShootDateRange,
  groupCatalog, orderDepartments, orderedKeys, saveFile, withTimeStamp,
} from "../lib/utils.js";

// Public, read-only page behind /share/:token — no account needed. Serves
// both live links (always current) and frozen snapshots; the SQL function
// behind fetchSharedList decides which.
//
// Shows the list the way the composer does when everything is folded
// (owner's call): only the items picked, by category and subcategory,
// with each day's quantities — nothing can be changed. The real PDF is
// built only when asked for (View PDF / Download PDF), so the page opens
// quickly. A Light / Dark / Auto switch on top is remembered per viewer.
export function SharedListView({ token }) {
  const [shared, setShared] = useState(undefined); // undefined = loading, null = not found
  const [error, setError] = useState(false);
  const [theme, setTheme] = useState(() => readTheme());
  const systemDark = useSystemDark();
  const dark = theme === "dark" || (theme === "system" && systemDark);

  useEffect(() => {
    fetchSharedList(token)
      .then((data) => setShared(data || null))
      .catch((err) => { console.error("Couldn't load shared list:", err); setError(true); });
  }, [token]);

  useEffect(() => {
    if (shared?.project?.name) document.title = `${shared.project.name} — BOXGO`;
  }, [shared]);

  // The page colour behind everything (and Safari's bars) follows the theme.
  useEffect(() => {
    const bg = dark ? DARK.bg : LIGHT.bg;
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
    let meta = document.querySelector("meta[name='theme-color']");
    if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
    meta.content = bg;
  }, [dark]);

  function pickTheme(t) {
    setTheme(t);
    try { localStorage.setItem(THEME_KEY, t); } catch { /* private mode: just this visit */ }
  }

  const accent = ACCENT_CHOICES.find((a) => a.id === shared?.accentId) || ACCENT_CHOICES[0];

  return (
    <Shell dark={dark} accent={accent}>
      <div style={styles.topRow}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 15, letterSpacing: "0.04em" }}>
          <Logo size={18} /> BOXGO
        </span>
        <ThemeSwitch value={theme} onChange={pickTheme} />
      </div>
      {error || shared === null ? (
        <div style={{ color: "var(--muted)", fontSize: 13, padding: "40px 0" }}>
          {error ? "Couldn't load this list. Check your connection and try again." : "This link doesn't exist or has been turned off."}
        </div>
      ) : shared === undefined ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13, padding: "40px 0" }}>
          <Loader2 size={16} className="spin" /> Loading…
        </div>
      ) : (
        <SharedList shared={shared} />
      )}
    </Shell>
  );
}

function SharedList({ shared }) {
  const { project, catalog = [], preparedBy = {} } = shared;
  const departments = useMemo(() => orderDepartments(shared.departments || {}, shared.departmentOrder), [shared]);
  const accentHex = (ACCENT_CHOICES.find((a) => a.id === shared.accentId) || ACCENT_CHOICES[0]).light;
  const itemData = project.itemData || {};
  // The same items, in the same order, as the PDF.
  const grouped = useMemo(() => computeVisibleGrouped(groupCatalog(catalog), itemData), [catalog, itemData]);
  const deptNames = orderedKeys(grouped, Object.keys(departments));
  const days = project.days || [];
  const perDayQty = !!project.perDayQty;
  // As in the composer: linked days share one column, headed "D1/D3".
  const cols = perDayQty ? dayColumns(days, project.dayLinks) : [];
  const showMax = perDayQty && cols.length > 1;

  const [pdf, setPdf] = useState(null); // Blob once built
  const [building, setBuilding] = useState(""); // "" | "view" | "download"
  const [viewing, setViewing] = useState(false);

  async function getPdf() {
    if (pdf) return pdf;
    const { blob } = await buildPdf({ project, catalog, departments, accentHex, preparedBy });
    setPdf(blob);
    return blob;
  }
  async function run(kind, fn) {
    setBuilding(kind);
    try {
      await fn(await getPdf());
    } catch (err) {
      console.error("PDF failed:", err);
      alert("Sorry, the PDF couldn't be generated. Please try again.");
    } finally {
      setBuilding("");
    }
  }
  const view = () => run("view", () => setViewing(true));
  const download = () => run("download", (blob) => saveFile(blob, withTimeStamp(`${defaultExportFilename(project, preparedBy.name) || "equipment-list"}.pdf`)));

  const dates = formatShootDateRange(days);
  const houses = [
    ["Production House", project.productionHouse, project.producer],
    ["Rental House", project.rentalHouse, project.gaffer],
  ].filter(([, h, p]) => h || p);
  const prepared = [preparedBy.name, preparedBy.email, preparedBy.phone].filter(Boolean);
  const note = (project.note || "").trim();
  const listNote = (project.listNote || "").trim();

  return (
    <>
      <div style={styles.banner}>
        {shared.kind === "snapshot" && shared.sharedAt
          ? `Snapshot sent ${formatDMY(fmtDate(new Date(shared.sharedAt)))}`
          : `Live list · always the latest version${shared.updatedAt ? ` · Updated ${formatDMY(fmtDate(new Date(shared.updatedAt)))}, ${timeHM(new Date(shared.updatedAt))}` : ""}`}
      </div>

      <div style={styles.infoBox}>
        {project.tag && <span className="tag-box" style={{ float: "right", marginLeft: 10, marginTop: 3, fontWeight: 800, letterSpacing: 0.5, color: "var(--muted)" }}>{project.tag}</span>}
        <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3, textTransform: "uppercase", letterSpacing: "0.02em" }}>
          <span style={{ color: "var(--accent)" }}>{project.name || "Equipment List"}</span>
          {dates && <span style={{ fontWeight: 700 }}> · {dates}</span>}
        </div>
        {(houses.length > 0 || prepared.length > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 28px", marginTop: 12 }}>
            {houses.map(([label, house, person]) => (
              <div key={label} style={{ minWidth: 0 }}>
                <div style={styles.label}>{label}</div>
                {house && <div style={{ fontWeight: 700 }}>{house}</div>}
                {person && <div style={{ fontWeight: 700 }}>{person}</div>}
              </div>
            ))}
            {prepared.length > 0 && (
              <div style={{ minWidth: 0 }}>
                <div style={styles.label}>Prepared by</div>
                <div style={{ fontWeight: 700 }}>{prepared[0]}</div>
                {prepared.slice(1).map((t) => <div key={t} style={{ color: "var(--muted)", fontSize: 12, overflowWrap: "anywhere" }}>{t}</div>)}
              </div>
            )}
          </div>
        )}
        {(note || listNote) && (
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 10, fontSize: 12.5, lineHeight: 1.5 }}>
            {note && <div style={{ whiteSpace: "pre-wrap" }}>{note}</div>}
            {listNote && <div style={{ whiteSpace: "pre-wrap", fontStyle: "italic", color: "var(--muted)" }}>{listNote}</div>}
          </div>
        )}
      </div>

      {deptNames.length === 0 ? (
        <div style={{ color: "var(--muted)", fontSize: 13, padding: "24px 0" }}>No quantities entered for this shoot yet.</div>
      ) : deptNames.map((dept) => (
        <div key={dept} style={{ marginBottom: 18, border: "1px solid var(--border)", borderRadius: 4, background: "var(--surface)" }}>
          <div className="share-sticky" style={styles.deptBar}>{dept}</div>
          <div style={{ ...styles.row, borderTop: "none", padding: "6px 10px 4px" }}>
            <div style={{ ...styles.nameCol, ...styles.colHead, color: "var(--muted2)", textAlign: "left" }}>Item</div>
            {showMax && <div style={{ ...styles.maxCol, ...styles.colHead }}>Max</div>}
            {perDayQty ? cols.map((c) => (
              <div key={c.id} style={{ ...styles.qtyCol, ...styles.colHead }}>
                {days.length === 1 && !c.followers ? "Qty" : (
                  <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1.15 }}>
                    {[c, ...(c.followers || [])].map((d) => <span key={d.id}>{d.label.replace("Day ", "D")}</span>)}
                  </span>
                )}
              </div>
            )) : <div style={{ ...styles.qtyCol, ...styles.colHead }}>Qty</div>}
          </div>
          {orderedKeys(grouped[dept], departments[dept] || []).map((sub) => (
            <div key={sub || "-"}>
              {/* "Others" is the wildcard category: no subcategory headings. */}
              {sub && !/^others?$/i.test(dept.trim()) && <div style={styles.subBar}>{sub}</div>}
              {grouped[dept][sub].map((item) => {
                const entry = itemData[item.id] || {};
                const q = entry.quantities || {};
                const peak = Math.max(0, ...days.map((d) => q[d.id] || 0));
                const itemNote = entry.noteHidden ? "" : (entry.notes || "").trim();
                return (
                  <div key={item.id} style={styles.row}>
                    <div style={styles.nameCol}>
                      <div style={{ fontWeight: 500 }}><BreakableName name={item.name} /></div>
                      {item.note && <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 1 }}>{item.note.replace(/\s*\n+\s*/g, " · ")}</div>}
                      {itemNote && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2, whiteSpace: "pre-wrap" }}>{itemNote}</div>}
                    </div>
                    {showMax && <div style={{ ...styles.maxCol, ...styles.qty, color: peak > 0 ? "var(--accent)" : "var(--faint)" }}>{peak}</div>}
                    {perDayQty ? cols.map((c) => {
                      const n = q[c.id] || 0;
                      return <div key={c.id} style={{ ...styles.qtyCol, ...styles.qty, color: n > 0 ? "var(--text)" : "var(--faint)" }}>{n}</div>;
                    }) : <div style={{ ...styles.qtyCol, ...styles.qty, color: peak > 0 ? "var(--text)" : "var(--faint)" }}>{peak}</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}

      <div style={styles.footerBar} className="share-bottom">
        <button onClick={view} disabled={!!building} style={{ ...styles.btn, ...styles.btnOutline, opacity: building ? 0.6 : 1 }}>
          {building === "view" ? <Loader2 size={14} className="spin" /> : <FileText size={14} />} {building === "view" ? "Preparing…" : "View PDF"}
        </button>
        <button onClick={download} disabled={!!building} style={{ ...styles.btn, background: "var(--accent)", color: "var(--accent-text)", border: "1px solid var(--accent)", opacity: building ? 0.6 : 1 }}>
          {building === "download" ? <Loader2 size={14} className="spin" /> : <Printer size={14} />} {building === "download" ? "Generating…" : "Download PDF"}
        </button>
      </div>

      {viewing && pdf && <PdfViewer blob={pdf} onClose={() => setViewing(false)} onDownload={download} building={building} />}
    </>
  );
}

// The real PDF, page by page (same as the in-app preview), over the list.
function PdfViewer({ blob, onClose, onDownload, building }) {
  const pagesRef = useRef(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const cancel = renderPdfPages(pagesRef.current, blob, {
      onDone: () => { if (!cancelled) setStatus("ready"); },
      onError: (err) => { console.error("Shared PDF preview failed:", err); if (!cancelled) setStatus("error"); },
    });
    return () => { cancelled = true; cancel?.(); };
  }, [blob]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--pdf-bg)", display: "flex", flexDirection: "column" }}>
      <div className="share-viewer-top" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <button onClick={onClose} style={{ ...styles.btn, ...styles.btnOutline, padding: "8px 12px" }}><X size={14} /> Close</button>
        <span style={{ flex: 1 }} />
        <button onClick={onDownload} disabled={!!building} style={{ ...styles.btn, padding: "8px 12px", background: "var(--accent)", color: "var(--accent-text)", border: "1px solid var(--accent)", opacity: building ? 0.6 : 1 }}>
          <Printer size={14} /> {building === "download" ? "Generating…" : "Download PDF"}
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div className="share-viewer-pages" style={{ maxWidth: 900, margin: "0 auto", padding: "16px 12px 40px" }}>
          {status === "loading" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--muted)", fontSize: 13, padding: "60px 0" }}>
              <Loader2 size={16} className="spin" /> Preparing the PDF…
            </div>
          )}
          {status === "error" && (
            <div style={{ color: "var(--muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>Couldn't show the PDF. Try Download PDF.</div>
          )}
          {/* Kept measurable while loading so pages are drawn at the right width. */}
          <div ref={pagesRef} style={status === "ready" ? undefined : { visibility: "hidden", height: 0, overflow: "hidden" }} />
        </div>
      </div>
    </div>
  );
}

function ThemeSwitch({ value, onChange }) {
  const options = [["light", "Light"], ["dark", "Dark"], ["system", "Auto"]];
  return (
    <div role="radiogroup" aria-label="Theme" style={{ display: "flex", gap: 2, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: 2 }}>
      {options.map(([id, label]) => (
        <button
          key={id}
          role="radio"
          aria-checked={value === id}
          title={id === "system" ? "Follow this device's setting" : `${label} mode`}
          onClick={() => onChange(id)}
          style={{
            border: "none", borderRadius: 3, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: "0.04em", textTransform: "uppercase",
            background: value === id ? "var(--accent)" : "transparent",
            color: value === id ? "var(--accent-text)" : "var(--muted)",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const THEME_KEY = "boxgo-share-theme";
function readTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function useSystemDark() {
  const query = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const [isDark, setIsDark] = useState(() => !!query?.matches);
  useEffect(() => {
    if (!query) return;
    const on = (e) => setIsDark(e.matches);
    query.addEventListener?.("change", on);
    return () => query.removeEventListener?.("change", on);
  }, [query]);
  return isDark;
}

function timeHM(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// The app's own colours (EquipmentManifest.jsx), so the list reads like the composer.
const DARK = { bg: "#0D0D0D", surface: "#161615", surface2: "#1C1C1A", text: "#EDEDED", muted: "#9A9A96", muted2: "#6A6A66", faint: "#4A4A47", border: "#2A2A27", accentText: "#0D0D0D", pdfBg: "#0D0D0D" };
const LIGHT = { bg: "#FAFAF8", surface: "#FFFFFF", surface2: "#F1F0EC", text: "#141413", muted: "#6B6B67", muted2: "#8A8A85", faint: "#C8C8C2", border: "#DEDEDA", accentText: "#FFFFFF", pdfBg: "#ECECEC" };

function Shell({ dark, accent, children }) {
  const c = dark ? DARK : LIGHT;
  const vars = {
    "--bg": c.bg, "--surface": c.surface, "--surface2": c.surface2, "--text": c.text, "--muted": c.muted,
    "--muted2": c.muted2, "--faint": c.faint, "--border": c.border, "--accent": dark ? accent.dark : accent.light,
    "--accent-text": c.accentText, "--pdf-bg": c.pdfBg,
  };
  return (
    <div style={{ ...vars, minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }
        .tag-box { display: inline-block; font-size: 9px; line-height: 11px; padding: 1px 4px; border: 1px solid currentColor; border-radius: 2px; text-transform: uppercase; }
        @supports (text-box: trim-both cap alphabetic) { .tag-box { text-box: trim-both cap alphabetic; padding: 3px 4px; } }
        .share-sticky { position: sticky; top: 0; z-index: 2; }
        /* iOS Safari tints its top bar from a sticky bar touching the top;
           a thin page-coloured strip keeps it the page colour (as in the app). */
        .share-tint { display: none; }
        .ios .share-tint { display: block; position: fixed; top: 0; left: 0; right: 0; height: 6px; background: var(--bg); z-index: 3; }
        .ios .share-sticky { top: 6px; }
        .standalone .share-tint { height: env(safe-area-inset-top); }
        .standalone .share-sticky { top: env(safe-area-inset-top); }
        .standalone .share-viewer-top { padding-top: calc(env(safe-area-inset-top) + 10px) !important; }
        .share-bottom { padding-bottom: calc(10px + env(safe-area-inset-bottom)) !important; }
      `}</style>
      <div className="share-tint" aria-hidden="true" />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "14px 12px 90px" }}>{children}</div>
    </div>
  );
}

const styles = {
  topRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 },
  banner: { fontSize: 10.5, letterSpacing: ".06em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 },
  infoBox: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "12px 14px", marginBottom: 18 },
  label: { fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted2)", marginBottom: 2 },
  deptBar: { background: "var(--accent)", color: "var(--accent-text)", padding: "8px 10px", fontWeight: 800, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: "3px 3px 0 0" },
  subBar: { background: "var(--surface2)", color: "var(--accent)", padding: "6px 10px", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", borderTop: "1px solid var(--border)" },
  row: { display: "flex", alignItems: "center", padding: "6px 10px", borderTop: "1px solid var(--border)" },
  nameCol: { flex: 1, minWidth: 0, overflowWrap: "anywhere", paddingRight: 6 },
  colHead: { fontSize: 10.5, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", textAlign: "center" },
  maxCol: { width: 36, flexShrink: 0, textAlign: "center" },
  qtyCol: { width: 34, flexShrink: 0, textAlign: "center" },
  qty: { fontWeight: 800, fontSize: 13 },
  footerBar: { position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 4, background: "var(--surface)", borderTop: "1px solid var(--border)", padding: "10px 16px", display: "flex", justifyContent: "center", gap: 10 },
  btn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 4, padding: "10px 18px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  btnOutline: { background: "transparent", color: "var(--text)", border: "1px solid var(--border)" },
};
