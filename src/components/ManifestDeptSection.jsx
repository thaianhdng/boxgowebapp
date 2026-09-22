import { useState, useRef } from "react";
import {
  Plus, Copy, ChevronDown, ChevronRight,
} from "lucide-react";
import { Combobox } from "./Combobox.jsx";
import { ManifestItemRow } from "./ManifestItemRow.jsx";


export function ManifestDeptSection({
  id, dept, color, subcats, data, days, itemData, perDayQty, collapsed, onToggle, onQtyChange, onNoteChange, onNoteHiddenChange,
  customItems, onAddCustomItem, onRemoveCustomItem, collapsedSubcats, onToggleSubcat, forceExpand, onAddDay, onCopyPreviousDay, recentCustomNames,
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
            style={{
              display: "flex", alignItems: "center", width: "100%", padding: "6px 14px",
              borderBottom: "1px solid var(--border)", background: "var(--surface)", overflowX: "auto",
            }}
          >
            <div style={{ flex: 1, minWidth: 160, maxWidth: 220, fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Item</div>
            <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
              {perDayQty ? (
                <>
                  {days.length > 1 && (
                    <div style={{ width: 40, flexShrink: 0, textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" }}>
                      Max
                    </div>
                  )}
                  {days.map((d, i) => (
                    <div key={d.id} style={{ width: 40, flexShrink: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                      {d.label.replace("Day ", "D")}
                      {days.length > 1 && i > 0 && (
                        <button
                          onClick={() => onCopyPreviousDay(i)}
                          style={{
                            position: "absolute", left: "100%", marginLeft: 2, top: "50%", transform: "translateY(-50%)",
                            background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 0,
                          }}
                          title={`Copy ${d.label.replace("Day ", "D")}'s quantities from the day before`}
                        >
                          <Copy size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ width: 40, flexShrink: 0, textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }} title="Same quantity applies to every shoot day">
                  Qty
                </div>
              )}
              <div style={{ width: 22, flexShrink: 0 }} />
              <button
                onClick={onAddDay}
                style={{ width: 22, flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", justifyContent: "center" }}
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
            <div style={{ minWidth: "max-content" }}>
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
              <div key={sub} style={{ minWidth: "max-content" }}>
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
            <div style={{ minWidth: "max-content" }}>
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
              <div style={{ display: "flex", gap: 6, padding: "8px 14px", minWidth: "max-content" }}>
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
