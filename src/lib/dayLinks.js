// Linked shoot days: days that use the same equipment. Every day in a group
// is equal (owner's call): a change on any of them shows on all, any one
// can be split off, and the others stay linked.
//
// Stored on the list as `dayLinks = { [dayId]: otherDayId }`; following
// the links from any day reaches its group's root. Saved lists keep it
// tidy: each group's first day (in day order) is the root and the others
// point at it (`cleanLinks`). The Edit window may hand in untidy links (a
// day pointing at the day it was set "same as"), so a day that joins a
// group takes that group's numbers.
//
// Every day in a group always carries the same quantities (written
// through on every change), so the PDF, share page, backups and everything
// else keep reading plain per-day numbers. Only the composer (and the
// share page, which copies it) knows: it shows a group as one column, at
// its first day's place.

// [[root, memberIds in day order], …] for every day. A root is a day
// (or, when a link points at a day that's gone, that missing day).
function groupsOf(days, links) {
  const ids = (days || []).map((d) => d.id);
  const has = new Set(ids);
  const order = new Map(ids.map((id, i) => [id, i]));
  const rootOf = (id) => {
    const seen = [];
    let cur = id;
    while (links && links[cur] !== undefined && cur !== links[cur]) {
      if (seen.includes(cur)) {
        // A loop (shouldn't happen): its earliest day is the root.
        return seen.slice(seen.indexOf(cur)).sort((a, b) => order.get(a) - order.get(b))[0];
      }
      seen.push(cur);
      const next = links[cur];
      if (!has.has(next)) return `gone:${next}`;
      cur = next;
    }
    return cur;
  };
  const groups = new Map();
  for (const id of ids) {
    const r = rootOf(id);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(id);
  }
  return [...groups.entries()];
}

// The tidy links: each group of 2+ days points at its first day.
export function cleanLinks(days, links) {
  const out = {};
  if (!links) return out;
  for (const [, members] of groupsOf(days, links)) {
    members.slice(1).forEach((m) => { out[m] = members[0]; });
  }
  return out;
}

// The days linked with this one (not including it).
export function linkedWith(days, links, dayId) {
  const g = groupsOf(days, links).find(([, m]) => m.includes(dayId));
  return g ? g[1].filter((m) => m !== dayId) : [];
}

// Days that follow `dayId` in tidy links (the other days of its column).
export const followersOf = (links, dayId) => Object.keys(links || {}).filter((f) => links[f] === dayId);

// The links with this day taken out of its group (the rest stay linked,
// around the same root unless the day was it). Other groups are untouched.
export function withoutDay(days, links, dayId) {
  const out = { ...(links || {}) };
  delete out[dayId];
  const g = groupsOf(days, links).find(([, m]) => m.includes(dayId));
  if (!g) return out;
  const [root, members] = g;
  const rest = members.filter((m) => m !== dayId);
  if (rest.length < 2) { rest.forEach((m) => { delete out[m]; }); return out; }
  const keep = root !== dayId && rest.includes(root) ? root : rest[0];
  delete out[keep];
  rest.filter((m) => m !== keep).forEach((m) => { out[m] = keep; });
  return out;
}

// The composer's columns: each group (and each unlinked day) as one
// column at its first day's place, the other days as `followers`.
export function dayColumns(days, links) {
  const clean = cleanLinks(days, links);
  return (days || [])
    .filter((d) => !clean[d.id])
    .map((d) => {
      const followers = days.filter((f) => clean[f.id] === d.id);
      return followers.length ? { ...d, followers } : d;
    });
}

// The project with every group's days carrying the same numbers (its
// root's: the day the others were linked to) and its links tidied
// (dropped when empty). "All days same" lists need no copying.
export function withLinkedQuantities(p) {
  const groups = groupsOf(p.days, p.dayLinks).filter(([, m]) => m.length > 1);
  const { dayLinks, ...rest } = p;
  if (!groups.length) return dayLinks ? rest : p;
  const links = cleanLinks(p.days, p.dayLinks);
  if (!p.perDayQty) return { ...rest, dayLinks: links };
  const itemData = {};
  for (const [id, entry] of Object.entries(p.itemData || {})) {
    const q = { ...(entry.quantities || {}) };
    for (const [root, members] of groups) {
      const from = members.includes(root) ? root : members[0];
      members.forEach((m) => { q[m] = q[from] || 0; });
    }
    itemData[id] = { ...entry, quantities: q };
  }
  return { ...rest, dayLinks: links, itemData };
}

// The PDF's day columns (owner's call): back-to-back days of one group
// print as one column headed "D1/D2"; linked days that aren't next to each
// other keep their own columns. [{ id: first day's id, days: [day, …] }]
export function runColumns(days, links) {
  const clean = cleanLinks(days, links);
  const group = (id) => clean[id] || id;
  const cols = [];
  for (const d of days || []) {
    const last = cols[cols.length - 1];
    if (last && group(last.days[last.days.length - 1].id) === group(d.id)) last.days.push(d);
    else cols.push({ id: d.id, days: [d] });
  }
  return cols;
}
