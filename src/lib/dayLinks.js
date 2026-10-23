// Linked shoot days: "D3 uses the same equipment as D1".
// Stored on the list as `dayLinks = { [followerDayId]: sourceDayId }`.
// A follower's quantities are always kept as a copy of its source's
// (written through on every change), so the PDF, share page, backups and
// everything else keep reading plain per-day numbers. Only the composer
// knows about links: it shows a source and its followers as one column.
// Links never chain: a source can't follow another day.

// The links that still make sense for these days (both days exist, a day
// doesn't follow itself, a source isn't itself a follower).
export function cleanLinks(days, links) {
  if (!links) return {};
  const ids = new Set((days || []).map((d) => d.id));
  const out = {};
  for (const [f, s] of Object.entries(links)) {
    if (f !== s && ids.has(f) && ids.has(s) && !links[s]) out[f] = s;
  }
  return out;
}

export const followersOf = (links, sourceId) => Object.keys(links || {}).filter((f) => links[f] === sourceId);

// The composer's columns: each day that has its own list, in day order,
// with the days that follow it (`followers`).
export function dayColumns(days, links) {
  const clean = cleanLinks(days, links);
  return (days || [])
    .filter((d) => !clean[d.id])
    .map((d) => {
      const followers = days.filter((f) => clean[f.id] === d.id);
      return followers.length ? { ...d, followers } : d;
    });
}

// The project with its links cleaned (dropped when empty) and every
// follower's quantities set to its source's. Lists with "All days same"
// quantities don't need links (every day is the same anyway).
export function withLinkedQuantities(p) {
  const links = cleanLinks(p.days, p.dayLinks);
  const followers = Object.keys(links);
  const { dayLinks, ...rest } = p;
  if (!followers.length) return dayLinks ? rest : p;
  if (!p.perDayQty) return { ...rest, dayLinks: links };
  const itemData = {};
  for (const [id, entry] of Object.entries(p.itemData || {})) {
    const q = { ...(entry.quantities || {}) };
    for (const f of followers) q[f] = q[links[f]] || 0;
    itemData[id] = { ...entry, quantities: q };
  }
  return { ...rest, dayLinks: links, itemData };
}
