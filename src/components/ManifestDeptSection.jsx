import { useState, useRef, useEffect } from "react";
import {
  Plus, ChevronDown, ChevronRight,
} from "lucide-react";
import { Combobox } from "./Combobox.jsx";
import { fixedScale } from "../lib/fixedPos.js";
import { ManifestItemRow } from "./ManifestItemRow.jsx";


export function ManifestDeptSection({
  id, dept, color, subcats, data, days, itemData, perDayQty, collapsed, onToggle, onQtyChange, onNoteChange, onNoteHiddenChange,
  customItems, onAddCustomItem, onRemoveCustomItem, collapsedSubcats, onToggleSubcat, forceExpand, onAddDay, onCopyDay, recentCustomNames,
}) {
  const total = Object.values(data).reduce((n, arr) => n + arr.length, 0) + (customItems ? customItems.length : 0);
  const [newCustomName, setNewCustomName] = useState("");
  const definedSet = new Set(subcats || []);
  const flatItems = Object.keys(data)
    .filter((k) => k === "" || !definedSet.has(k))
    .flatMap((k) => data[k] || []);
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
          style={{
            position: "fixed", top: copyMenu.top, left: copyMenu.left, transform: "translateX(-50%)", zIndex: 200,
            background: "var(--surface)", border: "1px solid var(--text)", borderRadius: 4, boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 6, maxWidth: 220 }}>
            {days.map((d, i) => i === copyMenu.index ? null : (
              <button
                key={d.id}
                onClick={() => { onCopyDay(i, copyMenu.index); setCopyMenu(null); }}
                title={`Copy ${dayShort(d)} into ${dayShort(days[copyMenu.index])}`}
                style={{ minWidth: 40, padding: "6px 8px", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 3, color: "var(--text)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                {dayShort(d)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ position: "sticky", top: 0, zIndex: 6, borderRadius: collapsed ? "4px" : "4px 4px 0 0", overflow: "hidden" }}>
        <div
          onClick={onToggle}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", background: "var(--accent)", color: "var(--accent-text)", cursor: "pointer",
          }}
        >
          <span className="stencil" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            {dept}
          </span>
        </div>
        {!collapsed && (
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
                  {days.length === 1 ? (
                    <div style={{ ...dayHeadStyle, fontSize: 10.5, cursor: "default" }}>Qty</div>
                  ) : days.map((d, i) => (
                    // Tapping a day heading offers "copy from" any other
                    // day. The dot is positioned below the label so it
                    // never shifts the label off-centre from its column.
                    <button
                      key={d.id}
                      onClick={(e) => openCopyMenu(e, i)}
                      style={dayHeadStyle}
                      title={`Copy quantities from another day into ${dayShort(d)}`}
                    >
                      {dayShort(d)}
                      <span style={{ position: "absolute", left: "50%", bottom: -1, transform: "translateX(-50%)", width: 3, height: 3, borderRadius: "50%", background: "currentColor", opacity: 0.7 }} />
                    </button>
                  ))}
                </>
              ) : (
                <div style={{ width: 40, flexShrink: 0, textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }} title="Same quantity applies to every shoot day">
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
      {!collapsed && (
        <div
          ref={bodyScrollRef}
          onScroll={syncScroll(bodyScrollRef, headerScrollRef)}
          style={{ background: "var(--surface)", overflowX: "auto", borderRadius: "0 0 4px 4px" }}
        >
          {flatItems.length > 0 && (
            <div style={{ minWidth: "fit-content" }}>
              {flatItems.map((c) => (
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
              ))}
            </div>
          )}

          {(subcats || []).map((sub) => {
            if (!data[sub] || data[sub].length === 0) return null;
            const subKey = `${dept}::${sub}`;
            const subCollapsed = !forceExpand && !!(collapsedSubcats && collapsedSubcats[subKey]);
            return (
              <div key={sub} style={{ minWidth: "fit-content" }}>
                <div
                  onClick={() => onToggleSubcat(sub)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                    fontSize: 12, fontWeight: 800, color: "var(--text)", padding: "8px 14px",
                    textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--surface2)",
                  }}
                >
                  {subCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  {sub}
                </div>
                {!subCollapsed && data[sub].map((c) => (
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
                ))}
              </div>
            );
          })}

          {customItems && (
            <div style={{ minWidth: "fit-content" }}>
              {customItems.map((c) => (
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
              ))}
              <div style={{ display: "flex", gap: 6, padding: "8px 14px", minWidth: "fit-content" }}>
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
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const dayHeadStyle = {
  width: 40, flexShrink: 0, position: "relative", padding: "2px 0", background: "none", border: "none",
  textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase",
  cursor: "pointer", fontFamily: "inherit",
};
