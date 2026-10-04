import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTHS, parse, toStr, todayStr } from "../shared/dates.js";
import { typeOf } from "../schedule/eventTypes.js";

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

// Height of a day box on the all-projects calendar on wider screens.
export const DAY_HEIGHT = 86;

// Width of an element, kept up to date (in the page's own units, so the
// UI size setting is accounted for).
export function useWidth(ref) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

// A phone, upright or sideways (narrow, or short like a phone in landscape).
// Calendars then use small two-line labels.
const isPhone = () => window.innerWidth < 700 || window.innerHeight < 500;
export function usePhone() {
  const [phone, setPhone] = useState(isPhone);
  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return phone;
}

export function useWide(min = 700) {
  const [wide, setWide] = useState(() => window.innerWidth >= min);
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= min);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [min]);
  return wide;
}

export function shiftMonth(month, n) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return toStr(d).slice(0, 7);
}

export function MonthHeader({ month, onChange, right }) {
  const [y, m] = month.split("-").map(Number);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
      <button className="btn btn-ghost" style={{ padding: "4px 6px" }} onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month"><ChevronLeft size={15} /></button>
      <span className="stencil" style={{ fontSize: 13, minWidth: 128, textAlign: "center" }}>{MONTHS[m - 1]} {y}</span>
      <button className="btn btn-ghost" style={{ padding: "4px 6px" }} onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month"><ChevronRight size={15} /></button>
      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>{right}</div>
    </div>
  );
}

// Monday-first weeks covering the month.
function gridDates(month) {
  const first = parse(`${month}-01`);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const cells = Math.ceil((Math.round((last - start) / 86400000) + 1) / 7) * 7;
  const out = [];
  for (let i = 0; i < cells; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(toStr(d));
  }
  return out;
}

// A day has a clash when events from two or more projects fall on it.
export function clashDates(occ) {
  const byDate = new Map();
  for (const o of occ) {
    if (!byDate.has(o.date)) byDate.set(o.date, new Set());
    byDate.get(o.date).add(o.projectId);
  }
  return new Set([...byDate].filter(([, s]) => s.size > 1).map(([d]) => d));
}

// occ: occurrences (see schedule/events.js). With `focusProjectId` (a
// project's own calendar), that project's events are named in each day —
// shoot days as D1, D2… like the equipment list — and other projects show
// as a grey dot.
export function MonthGrid({ month, occ, types, selected, onSelect, focusProjectId, compact }) {
  const wide = !usePhone();
  const today = todayStr();
  const clashes = clashDates(occ);
  const byDate = new Map();
  for (const o of occ) {
    if (!byDate.has(o.date)) byDate.set(o.date, []);
    byDate.get(o.date).push(o);
  }
  const named = !!focusProjectId;
  // Every day names what's on it: a project's own calendar names its events
  // (shoot days as "Shooting D1"); the all-projects calendar names the
  // project, coloured by event type. On a phone names wrap onto two small
  // lines, so day boxes there are taller.
  const showLabels = named || !compact;
  const small = !wide;
  // Day boxes have a fixed height and take whatever width there is. The
  // Calendar home switches to a stacked layout before they'd get narrower
  // than they are tall (see ProjectsHome), so they stay wider than tall.
  const cellH = named ? (wide ? 92 : 80) : compact ? 40 : wide ? DAY_HEIGHT : 84;
  const cellSize = { height: cellH };
  const maxBars = named ? (wide ? 3 : 2) : compact ? 2 : 3;
  // Shoot day numbers for the focused project, in date order.
  const shootIds = new Set(types.filter((t) => t.shoot).map((t) => t.id));
  const dayNo = new Map(
    [...new Map(occ.filter((o) => o.projectId === focusProjectId && shootIds.has(o.event.typeId)).map((o) => [o.event.id, o.date])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([sid], i) => [sid, i + 1]),
  );

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "var(--surface2)" }}>
        {WEEK.map((w, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 800, color: i >= 5 ? "var(--muted2)" : "var(--muted)", padding: "5px 0" }}>{w}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {gridDates(month).map((date, i) => {
          const inMonth = date.startsWith(month);
          const all = byDate.get(date) || [];
          const mine = focusProjectId ? all.filter((o) => o.projectId === focusProjectId) : all;
          const others = focusProjectId ? all.filter((o) => o.projectId !== focusProjectId) : [];
          const isSel = selected === date;
          const clash = clashes.has(date) && (!focusProjectId || (mine.length > 0 && others.length > 0));
          return (
            <button
              key={date}
              onClick={() => onSelect?.(isSel ? null : date)}
              style={{
                position: "relative", minWidth: 0, ...cellSize, padding: "3px 3px 4px", textAlign: "left",
                display: "flex", flexDirection: "column", gap: 2, cursor: "pointer", fontFamily: "inherit",
                border: "none", borderTop: "1px solid var(--border)", borderLeft: i % 7 ? "1px solid var(--border)" : "none",
                background: isSel ? "var(--surface2)" : "transparent",
                outline: isSel ? "2px solid var(--accent)" : "none", outlineOffset: -2,
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: 700, lineHeight: "16px", width: 18, height: 16, textAlign: "center", borderRadius: 3,
                color: date === today ? "var(--accent-text)" : "var(--text)",
                background: date === today ? "var(--accent)" : "transparent",
              }}>
                {Number(date.slice(8))}
              </span>
              {clash && (
                <span title="Clash: more than one project on this day" style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "var(--danger)" }} />
              )}
              {mine.slice(0, maxBars).map((o, k) => {
                const t = typeOf(types, o.event.typeId);
                const faded = !o.event.confirmed;
                return showLabels ? (
                  <span key={k} title={named ? t.name : `${o.project.name} · ${t.name}`} style={{
                    fontSize: small ? 8 : 10, fontWeight: 700, lineHeight: small ? "10px" : "14px",
                    padding: small ? "1px 2px" : "0 4px", borderRadius: 2, flexShrink: 0,
                    // On a phone names wrap onto two lines, between words
                    // ("Shooting / D1").
                    ...(small
                      ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "normal", overflowWrap: "normal" }
                      : { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }),
                    background: faded ? "transparent" : t.color, color: faded ? t.color : "#111",
                    border: `1px ${faded ? "dashed" : "solid"} ${t.color}`, opacity: faded ? 0.75 : 1,
                  }}>
                    {(named ? (dayNo.has(o.event.id) ? `${t.name} D${dayNo.get(o.event.id)}` : t.name) : (o.project.name || t.name)).replace(/-/g, "\u2011")}
                  </span>
                ) : (
                  <span key={k} style={{
                    height: 5, borderRadius: 2, flexShrink: 0,
                    background: t.color, opacity: faded ? 0.3 : 1,
                  }} />
                );
              })}
              {mine.length > maxBars && (
                <span style={{ fontSize: 9, color: "var(--muted)", lineHeight: "10px" }}>+{mine.length - maxBars}</span>
              )}
              {others.length > 0 && (
                <span title="Other projects on this day" style={{ position: "absolute", bottom: 4, right: 4, width: 6, height: 6, borderRadius: "50%", background: "var(--muted2)" }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// A one-line key under a calendar: only the event types on screen this
// month, plus tentative / other project / clash when they appear.
export function MonthKey({ month, occ, types, focusProjectId }) {
  const inMonth = occ.filter((o) => o.date.startsWith(month));
  const mine = focusProjectId ? inMonth.filter((o) => o.projectId === focusProjectId) : inMonth;
  const used = types.filter((t) => mine.some((o) => o.event.typeId === t.id));
  const clashes = clashDates(inMonth);
  const hasClash = focusProjectId ? mine.some((o) => clashes.has(o.date)) : clashes.size > 0;
  const item = (key, swatch, label) => (
    <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>{swatch}{label}</span>
  );
  const items = [
    ...used.map((t) => item(t.id, <span style={{ width: 8, height: 8, borderRadius: 2, background: t.color }} />, t.name)),
    mine.some((o) => !o.event.confirmed) && item("tent", <span style={{ width: 8, height: 8, borderRadius: 2, border: "1px dashed var(--muted)" }} />, "tentative"),
    focusProjectId && inMonth.some((o) => o.projectId !== focusProjectId) && item("other", <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--muted2)" }} />, "other project"),
    hasClash && item("clash", <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--danger)" }} />, "clash"),
  ].filter(Boolean);
  if (!items.length) return <span style={{ fontSize: 10.5, color: "var(--muted2)" }}>Nothing this month</span>;
  return <span style={{ display: "flex", flexWrap: "wrap", gap: "3px 10px", fontSize: 10.5, color: "var(--muted)" }}>{items}</span>;
}
