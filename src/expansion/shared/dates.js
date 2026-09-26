// Dates are stored as "YYYY-MM-DD" strings (local calendar days, no time
// zone), the same as BOXGO's shoot days. Times are "HH:MM" or "".

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const pad = (n) => String(n).padStart(2, "0");

export function toStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parse(s) {
  const [y, m, d] = (s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function todayStr() {
  return toStr(new Date());
}

export function addDays(s, n) {
  const d = parse(s);
  if (!d) return "";
  d.setDate(d.getDate() + n);
  return toStr(d);
}

// Every date from start to end inclusive (just [start] when end is empty
// or before start). Capped so a typo'd year can't hang the page.
export function eachDay(start, end) {
  if (!parse(start)) return [];
  if (!end || end <= start) return [start];
  const out = [];
  let cur = start;
  while (cur <= end && out.length < 366) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function weekday(s) {
  const d = parse(s);
  return d ? WEEKDAYS[d.getDay()] : "";
}

// "12/10"
export function dm(s) {
  const d = parse(s);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : "";
}

// "Mon 12/10"
export function wdm(s) {
  return s && parse(s) ? `${weekday(s)} ${dm(s)}` : "";
}

export function monthKey(s) {
  return (s || "").slice(0, 7);
}
