import { useMemo } from "react";
import { dayColumns } from "../lib/dayLinks.js";
import { BreakableName } from "./BreakableName.jsx";
import { computeVisibleGrouped, formatShootDateRange, groupCatalog, orderedKeys, withCustomItems } from "../lib/utils.js";

// The list as the people it's shared with see it (owner's call): like the
// composer when everything is folded — only the items picked, by category
// and subcategory, with each day's quantities, nothing editable. Used by
// the share page and by the preview's "List" view, so the two always
// match. Colours come from the page's CSS variables (--accent, --surface…).
// `sticky`: category bars stay at the top while scrolling (share page).
export function ReadOnlyList({ project, catalog = [], departments = {}, preparedBy = {}, sticky = false }) {
  const itemData = project.itemData || {};
  // The same items, in the same order, as the PDF.
  const grouped = useMemo(() => computeVisibleGrouped(groupCatalog(withCustomItems(catalog, project)), itemData), [catalog, project, itemData]);
  const deptNames = orderedKeys(grouped, Object.keys(departments));
  const days = project.days || [];
  const perDayQty = !!project.perDayQty;
  // As in the composer: linked days share one column, headed "D1/D3".
  const cols = perDayQty ? dayColumns(days, project.dayLinks) : [];
  const showMax = perDayQty && cols.length > 1;

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
      <div style={styles.infoBox}>
        {project.tag && <span className="tag-box" style={{ float: "right", marginLeft: 10, marginTop: 3, fontWeight: 800, letterSpacing: 0.5, color: "var(--muted)" }}>{project.tag}</span>}
        <div className="head-font" style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3, textTransform: "uppercase", letterSpacing: "0.02em" }}>
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
          <div className={sticky ? "share-sticky" : undefined} style={styles.deptBar}>{dept}</div>
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

    </>
  );
}

const styles = {
  infoBox: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "12px 14px", marginBottom: 18 },
  label: { fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted2)", marginBottom: 2 },
  deptBar: { fontFamily: "var(--head-font)", background: "var(--accent)", color: "var(--accent-text)", padding: "8px 10px", fontWeight: 800, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: "3px 3px 0 0" },
  subBar: { fontFamily: "var(--head-font)", background: "var(--surface2)", color: "var(--accent)", padding: "6px 10px", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", borderTop: "1px solid var(--border)" },
  row: { display: "flex", alignItems: "center", padding: "6px 10px", borderTop: "1px solid var(--border)" },
  nameCol: { flex: 1, minWidth: 0, overflowWrap: "anywhere", paddingRight: 6 },
  colHead: { fontSize: 10.5, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", textAlign: "center" },
  maxCol: { width: 36, flexShrink: 0, textAlign: "center" },
  qtyCol: { width: 34, flexShrink: 0, textAlign: "center" },
  qty: { fontWeight: 800, fontSize: 13 },
};
