// Kits (owner's call; called "templates" before): reusable bundles of gear,
// items and quantities only — no days, dates, tag, houses or notes. Saved
// from a list (each item at its highest number on any day, like the MAX
// column) and added to any list, or used as the start of a new one.
//
// Stored where templates always were (`app_state.templates`, also in
// backups): { id, name, itemQuantities: { catalogItemId: qty },
// customItems: [{ name, department, qty }] }. Older templates may also
// carry a tag / houses; those are ignored.

import { uid } from "./utils.js";
import { linkedWith } from "./dayLinks.js";

const peakOf = (entry) => Math.max(0, ...Object.values(entry?.quantities || {}).filter((q) => q > 0));

// A new kit from a list's gear.
export function kitFromProject(project, name) {
  const itemQuantities = {};
  const customIds = new Set((project.customItems || []).map((c) => c.id));
  for (const [itemId, entry] of Object.entries(project.itemData || {})) {
    const peak = peakOf(entry);
    if (peak > 0 && !customIds.has(itemId)) itemQuantities[itemId] = peak;
  }
  const customItems = (project.customItems || [])
    .map((c) => ({ name: c.name, department: c.department || "Others", qty: peakOf(project.itemData?.[c.id]) }))
    .filter((c) => c.qty > 0);
  return { id: uid(), name: name.trim(), itemQuantities, customItems };
}

// How many items a kit holds, and their categories (catalog order).
export function kitSummary(kit, catalog) {
  const byId = new Map((catalog || []).map((c) => [c.id, c]));
  const depts = [];
  let count = 0;
  const note = (d) => { if (d && !depts.includes(d)) depts.push(d); };
  for (const id of Object.keys(kit.itemQuantities || {})) {
    const c = byId.get(id);
    if (!c) continue; // removed from the catalog since
    count += 1;
    note(c.department);
  }
  for (const c of kit.customItems || []) { count += 1; note(c.department || "Others"); }
  return { count, depts };
}

// How a kit's number meets one already in the list (owner's call).
export const KIT_MODES = [
  { id: "replace", label: "Replace", hint: "The kit's number replaces the list's" },
  { id: "add", label: "Add", hint: "The kit's number is added to the list's" },
  { id: "higher", label: "Keep higher", hint: "Whichever number is higher" },
];
const combine = (mode, cur, k) => (mode === "replace" ? k : mode === "add" ? cur + k : Math.max(cur, k));

// The list with a kit added on `dayIds` (every day for an "All days same"
// list; a linked day brings its whole group, so linked days stay equal),
// plus what changes, for the preview: [{ id, name, department, before:
// [qty per day], after: [qty per day], isNew }]. Items only in the list are
// never touched; typed-in kit items join the list's typed-in items with
// the same name and category, or are added as new ones.
export function applyKit(project, kit, dayIds, mode, catalog) {
  const days = project.days || [];
  let targets = project.perDayQty ? dayIds.filter((id) => days.some((d) => d.id === id)) : days.map((d) => d.id);
  if (project.perDayQty && project.dayLinks) {
    const all = new Set(targets);
    targets.forEach((id) => linkedWith(days, project.dayLinks, id).forEach((m) => all.add(m)));
    targets = days.map((d) => d.id).filter((id) => all.has(id));
  }
  const byId = new Map((catalog || []).map((c) => [c.id, c]));
  const itemData = { ...(project.itemData || {}) };
  const customItems = [...(project.customItems || [])];
  const changes = [];

  const put = (id, name, department, qty, isNew) => {
    const entry = itemData[id] || { quantities: {}, notes: "" };
    const q = { ...(entry.quantities || {}) };
    const before = targets.map((d) => q[d] || 0);
    targets.forEach((d) => { q[d] = combine(mode, q[d] || 0, qty); });
    const after = targets.map((d) => q[d] || 0);
    if (after.some((v, i) => v !== before[i])) itemData[id] = { ...entry, quantities: q };
    changes.push({ id, name, department, before, after, isNew });
  };

  for (const [id, qty] of Object.entries(kit.itemQuantities || {})) {
    const c = byId.get(id);
    if (c && qty > 0) put(id, c.name, c.department, qty, false);
  }
  for (const k of kit.customItems || []) {
    if (!(k.qty > 0)) continue;
    const dept = k.department || "Others";
    let item = customItems.find((c) => (c.department || "Others") === dept && c.name.trim().toLowerCase() === k.name.trim().toLowerCase());
    const isNew = !item;
    if (!item) { item = { id: uid(), name: k.name, department: dept }; customItems.push(item); }
    put(item.id, item.name, dept, k.qty, isNew);
  }
  // A typed-in item that ended up with nothing stays out of the list.
  const keep = customItems.filter((c) => !changes.some((ch) => ch.id === c.id && ch.isNew && ch.after.every((v) => v === 0)));
  return { project: { ...project, itemData, customItems: keep }, changes, targets };
}
