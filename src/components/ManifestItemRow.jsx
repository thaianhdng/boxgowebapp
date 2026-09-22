import { useState } from "react";
import {
  Trash2, StickyNote,
} from "lucide-react";
import { QtyDropdown } from "./QtyDropdown.jsx";


export function ManifestItemRow({ item, days, perDayQty, entry, onQtyChange, onNoteChange, onNoteHiddenChange, onDelete }) {
  const [isAdding, setIsAdding] = useState(false);
  const quantities = entry?.quantities || {};
  const hasText = !!(entry?.notes && entry.notes.trim());
  const isHidden = !!entry?.noteHidden;
  const hasVisibleNote = hasText && !isHidden;
  const showNoteField = hasVisibleNote || isAdding;
  const qtyValues = Object.values(quantities).filter((q) => q > 0);
  const peak = qtyValues.length > 0 ? Math.max(...qtyValues) : 0;

  function handleNoteIconClick() {
    if (hasText && !isHidden) {
      onNoteHiddenChange(true);
      setIsAdding(false);
    } else if (hasText && isHidden) {
      onNoteHiddenChange(false);
    } else {
      setIsAdding((v) => !v);
    }
  }

  return (
    <>
      <div className="row" style={{
        display: "flex", alignItems: "center", width: "100%", minWidth: "max-content", padding: "6px 14px",
        borderTop: "1px solid var(--border)", fontSize: 13,
      }}>
        <div style={{ flex: 1, minWidth: 160, maxWidth: 220, whiteSpace: "normal", wordBreak: "break-word" }}>
          <div style={{ fontWeight: 600 }}>
            {item.name}
          </div>
          {item.note && (
            <div
              title={item.note}
              style={{
                fontSize: 11, color: "var(--muted2)", marginTop: 1,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220,
              }}
            >
              {item.note.replace(/\s*\n+\s*/g, " · ")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
          {perDayQty ? (
            <>
              {days.length > 1 && (
                <div style={{ width: 40, flexShrink: 0, textAlign: "center", fontSize: 13, fontWeight: 800, color: peak > 0 ? "var(--accent)" : "var(--faint)" }} title="Highest quantity needed on any single day">
                  {peak}
                </div>
              )}
              {days.map((d) => {
                const qty = quantities[d.id] || 0;
                return (
                  <QtyDropdown key={d.id} value={qty} onChange={(n) => onQtyChange(d.id, n)} />
                );
              })}
            </>
          ) : (
            // "All days same" mode: one shared value for every day. We
            // reuse `peak` (the max across whatever's stored) as that
            // value, and write through the first day's id — setItemQty
            // fans the write out to every day when this mode is on.
            <QtyDropdown value={peak} onChange={(n) => onQtyChange(days[0]?.id, n)} />
          )}
          <button
            onClick={handleNoteIconClick}
            style={{ width: 24, flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: hasVisibleNote ? "var(--accent)" : (hasText && isHidden ? "var(--muted)" : "var(--faint)"), display: "flex", justifyContent: "center" }}
            title={hasVisibleNote ? "Hide note" : (hasText && isHidden ? "Show note" : "Add note")}
          >
            <StickyNote size={18} />
          </button>
          {onDelete ? (
            <button onClick={onDelete} style={{ width: 24, flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", justifyContent: "center" }} title="Remove item">
              <Trash2 size={17} />
            </button>
          ) : (
            <div style={{ width: 24, flexShrink: 0 }} />
          )}
        </div>
      </div>
      {showNoteField && (
        <div style={{ padding: "0 14px 8px 14px", minWidth: "max-content" }}>
          <input
            autoFocus={isAdding && !hasText}
            value={entry?.notes || ""}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Note for this item…"
            style={{
              width: "100%", maxWidth: 360, fontSize: 12, padding: "4px 2px",
              border: "none", borderBottom: "1px solid var(--border2)", borderRadius: 0, background: "none",
            }}
          />
        </div>
      )}
    </>
  );
}
