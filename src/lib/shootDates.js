// Shoot-date text, kept free of other imports so the share-link preview
// (middleware.js, run by Vercel) can use it without pulling in the app.

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
