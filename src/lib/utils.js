import { DEPT_COLORS } from "../constants.js";


export const uid = () => Math.random().toString(36).slice(2, 10);

// Project ids double as the Supabase `projects.id` primary key (a real
// uuid column), unlike every other id in this file which just lives
// inside a jsonb blob — so projects need a real UUID, not uid()'s short
// base36 string. crypto.randomUUID() isn't available in every browser
// context, so this falls back to building a v4 UUID by hand rather than
// silently handing Supabase something it'll reject.
export function newProjectId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const relabelDays = (arr) => arr.map((d, i) => ({ ...d, label: `Day ${i + 1}` }));


export function loadColor(dept) {
  return DEPT_COLORS[dept] || "#555555";
}


export function pad2(n) {
  return String(n).padStart(2, "0");
}

// "6-8/10/26" for consecutive shoot days, "10,17/10/26" for non-consecutive,
// multiple months joined like "28-30/09/26, 1-3/10/26".
export function formatShootDateRange(days) {
  const dates = [...new Set((days || []).map((d) => d.date).filter(Boolean))]
    .map((s) => {
      const [y, m, d] = s.split("-").map(Number);
      return { y, m, d, key: s };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
  if (dates.length === 0) return "";

  const monthGroups = [];
  let current = null;
  for (const dt of dates) {
    if (!current || current.y !== dt.y || current.m !== dt.m) {
      current = { y: dt.y, m: dt.m, days: [] };
      monthGroups.push(current);
    }
    current.days.push(dt.d);
  }

  const parts = monthGroups.map((g) => {
    const tokens = [];
    let start = g.days[0];
    let prev = g.days[0];
    for (let i = 1; i <= g.days.length; i++) {
      const d = g.days[i];
      if (d === prev + 1) {
        prev = d;
        continue;
      }
      tokens.push(start === prev ? `${start}` : `${start}-${prev}`);
      if (i < g.days.length) {
        start = d;
        prev = d;
      }
    }
    return `${tokens.join(",")}/${pad2(g.m)}/${String(g.y).slice(-2)}`;
  });

  return parts.join(", ");
}

export function fmtDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return fmtDate(d);
}

export function addOneDay(dateStr) {
  if (!dateStr) return "";
  const [y, m, day] = dateStr.split("-").map(Number);
  if (!y || !m || !day) return "";
  const d = new Date(y, m - 1, day);
  d.setDate(d.getDate() + 1);
  return fmtDate(d);
}

// Recompute every date after fromIndex as (previous row's date + 1 day), cascading forward.
export function cascadeDates(rows, fromIndex) {
  const next = [...rows];
  for (let i = fromIndex + 1; i < next.length; i++) {
    next[i] = { ...next[i], date: next[i - 1].date ? addOneDay(next[i - 1].date) : "" };
  }
  return next;
}

// Display dates strictly as dd/mm/yy, regardless of browser/OS locale.
export function formatDMY(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y.slice(2)}`;
}

// Compact form without the year, for tight spaces like the sidebar.
export function formatDM(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}`;
}

// Compact filesystem-friendly slug: lowercase, alphanumerics and hyphens only.
export function slug(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function exportDateStr() {
  const d = new Date();
  return `${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

// 24-hour HHMMSS, no separators — appended to every saved filename (backup,
// catalog export, PDF export) so re-saving the same thing twice never
// silently overwrites the previous file.
export function exportTimeStr() {
  const d = new Date();
  return `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

// 24-hour HH:MM:SS — used next to the "Created On" date in the PDF and its
// preview, so that field shows the exact moment, not just the day.
export function formatTime24(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

// Inserts `_HHMMSS` right before the file extension — the one place every
// export filename gets its save-time stamp, so PDF/json all do it
// identically.
export function withTimeStamp(nameWithExt) {
  const dot = nameWithExt.lastIndexOf(".");
  if (dot === -1) return `${nameWithExt}_${exportTimeStr()}`;
  return `${nameWithExt.slice(0, dot)}_${exportTimeStr()}${nameWithExt.slice(dot)}`;
}

// Used to show the right keyboard-shortcut hint (⌘P vs Ctrl+P) in the print banner.
export function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");
}


// Only keep items with at least one non-zero day quantity for this shoot,
// then drop any subcat/dept that ends up empty once those are removed.
// Shared by PrintView (live data) and the self-contained share-link builder.
export function computeVisibleGrouped(groupedCatalog, itemData) {
  const visibleGrouped = {};
  Object.keys(groupedCatalog).forEach((dept) => {
    const subMap = {};
    Object.keys(groupedCatalog[dept]).forEach((sub) => {
      const items = groupedCatalog[dept][sub].filter((c) => {
        const entry = itemData[c.id];
        return Object.values(entry?.quantities || {}).some((q) => q > 0);
      });
      if (items.length > 0) subMap[sub] = items;
    });
    if (Object.keys(subMap).length > 0) visibleGrouped[dept] = subMap;
  });
  return visibleGrouped;
}


// Order by the department/subcategory structure defined in Settings (the
// master catalog's manual order) rather than raw insertion order. Anything
// present in the data but not in that defined structure is appended after,
// alphabetically, rather than dropped. Shared by the PDF export and the
// read-only share-snapshot builder so both always agree on ordering.
export function orderedKeys(obj, order) {
  const remaining = new Set(Object.keys(obj));
  const result = [];
  (order || []).forEach((k) => {
    if (remaining.has(k)) { result.push(k); remaining.delete(k); }
  });
  result.push(...Array.from(remaining).sort());
  return result;
}


export function hexToRgb(hex) {
  const h = (hex || "#000000").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}


export function defaultExportFilename(project, userName) {
  const parts = [
    exportDateStr(),
    slug(project?.name),
    slug(project?.productionHouse),
    slug(userName),
  ].filter(Boolean);
  return parts.join("_");
}

// Groups catalog items by department, then subcategory, preserving the
// catalog's own order within each group.
export function groupCatalog(catalog) {
  const g = {};
  for (const c of catalog) {
    if (!g[c.department]) g[c.department] = {};
    if (!g[c.department][c.subcategory]) g[c.department][c.subcategory] = [];
    g[c.department][c.subcategory].push(c);
  }
  return g;
}
