import { useState, useRef, useEffect } from "react";
import {
  Plus, ChevronDown, ChevronRight,
} from "lucide-react";
import { Combobox } from "./Combobox.jsx";
import { fixedScale } from "../lib/fixedPos.js";
import { ManifestItemRow } from "./ManifestItemRow.jsx";
import { Fold, Presence } from "./Motion.jsx";


export function ManifestDeptSection({
  id, dept, color, subcats: subcatsProp, data, days, itemData, perDayQty, collapsed, onToggle, onQtyChange, onNoteChange, onNoteHiddenChange,
  customItems, onAddCustomItem, onRemoveCustomItem, collapsedSubcats, onToggleSubcat, forceExpand, onAddDay, onCopyDay, onUnlinkDay, recentCustomNames,
}) {
  const total = Object.values(data).reduce((n, arr) => n + arr.length, 0) + (customItems ? customItems.length : 0);
  const [newCustomName, setNewCustomName] = useState("");
  // "Others" is the wildcard category (owner's call): no subcategory
  // headings, every item listed straight under its bar (as in the PDF).
  const subcats = /^others?$/i.test((dept || "").trim()) ? [] : subcatsProp;
  const definedSet = new Set(subcats || []);
  const flatItems = Object.keys(data)
    .filter((k) => k === "" || !definedSet.has(k))
    .flatMap((k) => data[k] || []);
  // Folding makes the list compact without losing track of it: items with
  // a quantity on any day stay showing under a folded category or
  // subcategory, and a folded category still lists all its subcategory
  // headings (each folded), so one not worked on yet can be opened on its
  // own. Opening one there ("peek") lasts until the category itself is
  // opened or folded again.
  const isPicked = (c) => Object.values(itemData[c.id]?.quantities || {}).some((q) => q > 0);
  const deptPicked = Object.values(data).some((arr) => arr.some(isPicked)) || (customItems || []).some(isPicked);
  const hasSubs = (subcats || []).some((sub) => data[sub]?.length);
  const [peek, setPeek] = useState(() => new Set());
  useEffect(() => { setPeek(new Set()); }, [collapsed]);
  const togglePeek = (sub) => setPeek((cur) => { const n = new Set(cur); if (n.has(sub)) n.delete(sub); else n.add(sub); return n; });
  const picksOnly = collapsed; // folded: loose and custom items show only when picked
  const bodyOpen = !collapsed || deptPicked || hasSubs;
  const showColumns = !collapsed || deptPicked || peek.size > 0; // the Item / D1… row, when rows show
  // A search opens every category at once (and closing it folds them
  // back): that happens without motion; a tap on a header animates.
  const lastForce = useRef(forceExpand);
  const searchChange = lastForce.current !== forceExpand;
  useEffect(() => { lastForce.current = forceExpand; });
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  // The header row (Item / D1 / D2 / …) and the body rows below scroll
  // horizontally as two separate elements — kept in sync here — so that
  // adding more shoot days, which makes the row wider than the screen,
  // scrolls the header along with the body instead of the header just
  // getting cut off.
  const [copyMenu, setCopyMenu] = useState(null); // { index, top, left }
  const copyMenuRef = useRef(null);
  const dayShort = (d) => d.label.replace("Day ", "D");
  // A column can stand for several days ("same equipment as", see
  // lib/dayLinks.js): D1 with D3 following it reads "D1/D3".
  const colShort = (d) => [d, ...(d.followers || [])].map(dayShort).join("/");
  function openCopyMenu(e, index) {
    const r = e.currentTarget.getBoundingClientRect();
    const k = fixedScale(e.currentTarget);
    setCopyMenu((m) => (m?.index === index ? null : { index, top: r.bottom / k + 6, left: (r.left + r.width / 2) / k }));
  }
  useEffect(() => {
    if (!copyMenu) return;
    const close = (e) => { if (!copyMenuRef.current?.contains(e.target)) setCopyMenu(null); };
    const closeNow = () => setCopyMenu(null);
    document.addEventListener("mousedown", close, true);
    document.addEventListener("touchstart", close, true);
    window.addEventListener("scroll", closeNow, true);
    window.addEventListener("resize", closeNow);
    return () => {
      document.removeEventListener("mousedown", close, true);
      document.removeEventListener("touchstart", close, true);
      window.removeEventListener("scroll", closeNow, true);
      window.removeEventListener("resize", closeNow);
    };
  }, [copyMenu]);

  function syncScroll(fromRef, toRef) {
    return () => { if (toRef.current) toRef.current.scrollLeft = fromRef.current.scrollLeft; };
  }

  function submitCustom() {
    if (!newCustomName.trim()) return;
    onAddCustomItem(newCustomName);
    setNewCustomName("");
  }

  return (
    <div id={id} style={{ marginBottom: 32, border: "1px solid var(--border)", borderRadius: 4, scrollMarginTop: 16 }}>
      {copyMenu && days[copyMenu.index] && (
        <div
          ref={copyMenuRef}
          className="m-pop"
          style={{
            position: "fixed", top: copyMenu.top, left: copyMenu.left, transform: "translateX(-50%)", zIndex: 200,
            background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 4, boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
          }}
        >
          {days.length > 1 && <div style={{ display: "flex", alignItems: "center", gap: 4, padding: 6 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", padding: "0 4px 0 2px" }}>Copy</span>
            {days.map((d, i) => i === copyMenu.index ? null : (
              <button
                key={d.id}
                onClick={() => { onCopyDay(d.id, days[copyMenu.index].id); setCopyMenu(null); }}
                title={`Copy ${colShort(d)} into ${colShort(days[copyMenu.index])}`}
                className="pop-item"
                style={{ minWidth: 40, padding: "6px 8px", border: "1px solid var(--border2)", borderRadius: 3, color: "var(--text)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                {colShort(d)}
              </button>
            ))}
          </div>}
          {days[copyMenu.index].followers && onUnlinkDay && (
            // A shared column: give any of its days its own column again.
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: days.length > 1 ? "0 6px 6px" : 6 }}>
              <span style={{ fontSize: 12, color: "var(--muted)", padding: "0 4px 0 2px" }}>Split</span>
              {[days[copyMenu.index], ...days[copyMenu.index].followers].map((f) => (
                <button
                  key={f.id}
                  onClick={() => { onUnlinkDay(f.id); setCopyMenu(null); }}
                  title={`Give ${dayShort(f)} its own column again (it keeps these numbers; the other days stay linked)`}
                  className="pop-item"
                  style={{ minWidth: 40, padding: "6px 8px", border: "1px solid var(--border2)", borderRadius: 3, color: "var(--text)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {dayShort(f)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="sticky-top" style={{ position: "sticky", top: 0, zIndex: 6, borderRadius: bodyOpen ? "4px 4px 0 0" : "4px", overflow: "hidden" }}>
        <div
          onClick={onToggle}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            padding: "10px 14px", cursor: "pointer",
            // Open: a solid accent bar. Folded: an outlined one (owner's
            // call: a folded section should look folded).
            ...(collapsed
              ? { background: "var(--surface)", color: "var(--accent)", boxShadow: "inset 0 0 0 1.5px var(--accent)", borderRadius: bodyOpen ? "4px 4px 0 0" : 4 }
              : { background: "var(--accent)", color: "var(--accent-text)" }),
          }}
        >
          <span className="stencil" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            {dept}
          </span>
        </div>
        {showColumns && (
          <div
            ref={headerScrollRef}
            onScroll={syncScroll(headerScrollRef, bodyScrollRef)}
            className="mf-pad"
            style={{
              display: "flex", alignItems: "center", width: "100%", paddingTop: 6, paddingBottom: 6,
              borderBottom: "1px solid var(--border)", background: "var(--surface)", overflowX: "auto",
            }}
          >
            <div className="mf-item-col" style={{ flex: 1, maxWidth: 220, fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Item</div>
            <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
              {perDayQty ? (
                <>
                  {days.length > 1 && (
                    <div style={{ width: 40, flexShrink: 0, textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" }}>
                      Max
                    </div>
                  )}
                  {days.length === 1 && !days[0].followers ? (
                    <div style={{ ...dayHeadStyle, fontSize: 10.5, cursor: "default" }}>Qty</div>
                  ) : days.map((d, i) => (
                    // Tapping a day heading offers "copy from" any other
                    // day. The dot is positioned below the label so it
                    // never shifts the label off-centre from its column.
                    <button
                      key={d.id}
                      onClick={(e) => openCopyMenu(e, i)}
                      style={dayHeadStyle}
                      title={d.followers ? `${colShort(d)} share one list: copy into them, or split a day off` : `Copy quantities from another day into ${dayShort(d)}`}
                    >
                      {d.followers ? (
                        <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1.15, color: "var(--accent)" }}>
                          {[d, ...d.followers].map((x) => <span key={x.id}>{dayShort(x)}</span>)}
                        </span>
                      ) : dayShort(d)}
                      <span style={{ position: "absolute", left: "50%", bottom: -1, transform: "translateX(-50%)", width: 3, height: 3, borderRadius: "50%", background: "currentColor", opacity: 0.7 }} />
                    </button>
                  ))}
                </>
              ) : (
                <div style={{ width: 40, flexShrink: 0, textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" }} title="Same quantity applies to every shoot day">
                  Qty
                </div>
              )}
              <div style={{ width: 24, flexShrink: 0 }} />
              <button
                onClick={onAddDay}
                style={{ width: 24, flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", justifyContent: "center" }}
                title="Add another shoot day"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
      <Fold open={bodyOpen} still={searchChange}>
        <div
          ref={bodyScrollRef}
          onScroll={syncScroll(bodyScrollRef, headerScrollRef)}
          style={{ background: "var(--surface)", overflowX: "auto", borderRadius: "0 0 4px 4px" }}
        >
          {flatItems.length > 0 && (() => {
            const any = flatItems.some(isPicked);
            return (
            <Fold open={!picksOnly || any} still={searchChange}>
            <div style={{ minWidth: "fit-content" }}>
              <Presence still={searchChange}>{(picksOnly && any ? flatItems.filter(isPicked) : flatItems).map((c) => (
                <ManifestItemRow
                  key={c.id}
                  item={c}
                  days={days}
                  perDayQty={perDayQty}
                  entry={itemData[c.id]}
                  onQtyChange={(dayId, qty) => onQtyChange(c.id, dayId, qty)}
                  onNoteChange={(note) => onNoteChange(c.id, note)}
                  onNoteHiddenChange={(hidden) => onNoteHiddenChange(c.id, hidden)}
                />
              ))}</Presence>
            </div>
            </Fold>
            );
          })()}

          {(subcats || []).map((sub) => {
            if (!data[sub] || data[sub].length === 0) return null;
            const subKey = `${dept}::${sub}`;
            const subCollapsed = !forceExpand && !!(collapsedSubcats && collapsedSubcats[subKey]);
            const subPicked = data[sub].some(isPicked);
            // Under a folded category every subcategory is folded too unless
            // opened there (peek); folded ones show only their picked items.
            const folded = collapsed ? !peek.has(sub) : subCollapsed;
            const subOpen = !folded || subPicked;
            const items = folded && subPicked ? data[sub].filter(isPicked) : data[sub];
            return (
              <div key={sub} style={{ minWidth: "fit-content" }}>
                <div
                  onClick={() => (collapsed ? togglePeek(sub) : onToggleSubcat(sub))}
                  style={{
                    // A small, spaced-out label in the accent colour, so it reads
                    // differently from the item names under it.
                    display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                    fontSize: 10.5, fontWeight: 700, color: "var(--accent)", padding: "9px 14px 7px",
                    textTransform: "uppercase", letterSpacing: "0.16em", background: "var(--surface2)",
                  }}
                >
                  {folded ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  {sub}
                </div>
                <Fold open={subOpen} still={searchChange}><Presence still={searchChange}>{items.map((c) => (
                  <ManifestItemRow
                    key={c.id}
                    item={c}
                    days={days}
                    perDayQty={perDayQty}
                    entry={itemData[c.id]}
                    onQtyChange={(dayId, qty) => onQtyChange(c.id, dayId, qty)}
                    onNoteChange={(note) => onNoteChange(c.id, note)}
                    onNoteHiddenChange={(hidden) => onNoteHiddenChange(c.id, hidden)}
                    />
                ))}</Presence></Fold>
              </div>
            );
          })}

          {customItems && (() => {
            const any = customItems.some(isPicked);
            return (
            <Fold open={!picksOnly || any} still={searchChange}>
            <div style={{ minWidth: "fit-content" }}>
              <Presence still={forceExpand || searchChange}>{(picksOnly && any ? customItems.filter(isPicked) : customItems).map((c) => (
                <ManifestItemRow
                  key={c.id}
                  item={c}
                  days={days}
                  perDayQty={perDayQty}
                  entry={itemData[c.id]}
                  onQtyChange={(dayId, qty) => onQtyChange(c.id, dayId, qty)}
                  onNoteChange={(note) => onNoteChange(c.id, note)}
                  onNoteHiddenChange={(hidden) => onNoteHiddenChange(c.id, hidden)}
                  onDelete={() => onRemoveCustomItem(c.id)}
                />
              ))}</Presence>
              {!picksOnly && <div style={{ display: "flex", gap: 6, padding: "8px 14px", minWidth: "fit-content" }}>
                <Combobox
                  value={newCustomName}
                  onChange={setNewCustomName}
                  options={recentCustomNames || []}
                  onKeyDown={(e) => { if (e.key === "Enter") submitCustom(); }}
                  placeholder="New item name…"
                  style={{ flex: 1, minWidth: 160 }}
                  inputStyle={{ fontSize: 12.5, padding: "5px 8px" }}
                />
                <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={submitCustom} disabled={!newCustomName.trim()}>
                  <Plus size={12} /> Add
                </button>
              </div>}
            </div>
            </Fold>
            );
          })()}
        </div>
      </Fold>
    </div>
  );
}

const dayHeadStyle = {
  width: 40, flexShrink: 0, position: "relative", padding: "2px 0", background: "none", border: "none",
  textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase",
  cursor: "pointer", fontFamily: "inherit",
};
