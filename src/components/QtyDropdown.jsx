import { useState, useEffect, useRef } from "react";
import { QTY_OPTIONS } from "../constants.js";
import { fixedScale } from "../lib/fixedPos.js";


export function QtyDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [draft, setDraft] = useState(String(value));
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const cancelRef = useRef(false);
  const active = value > 0;

  useEffect(() => { setDraft(String(value)); }, [value]);

  function openMenu() {
    const r = btnRef.current?.getBoundingClientRect();
    const k = fixedScale(btnRef.current);
    const menuWidth = 44;
    if (r) setPos({ top: r.bottom / k + 2, left: (r.left + r.width / 2) / k - menuWidth / 2, width: menuWidth });
    setOpen(true);
  }

  function commit(raw) {
    const n = Math.max(0, Math.min(99, parseInt(raw, 10) || 0));
    if (n !== value) onChange(n);
    setDraft(String(n));
  }

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(e) {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
      commit(draft);
    }
    function handleScroll(e) {
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick, true);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick, true);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open, draft]);

  return (
    <div style={{ position: "relative", flexShrink: 0, width: 40, display: "flex", justifyContent: "center" }}>
      <input
        ref={btnRef}
        value={draft}
        inputMode="numeric"
        onFocus={(e) => { e.target.select(); openMenu(); }}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
        onKeyDown={(e) => {
          if (e.key === "Enter") { commit(draft); setOpen(false); e.target.blur(); }
          if (e.key === "Escape") { cancelRef.current = true; setDraft(String(value)); setOpen(false); e.target.blur(); }
        }}
        // Phones finish typing with the keyboard's "Done" (no Enter on the
        // number pad), which only blurs — so a blur has to save too, or the
        // box keeps showing a number that was never stored.
        onBlur={() => {
          if (cancelRef.current) { cancelRef.current = false; return; }
          commit(draft);
          setOpen(false);
        }}
        style={{
          width: 34, padding: "4px 0", textAlign: "center", lineHeight: "16px",
          fontSize: 13, fontWeight: active ? 800 : 400,
          color: active ? "var(--accent)" : "var(--faint)",
          background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 3, cursor: "text",
        }}
      />
      {open && pos && (
        <div
          ref={menuRef}
          style={{
            position: "fixed", top: pos.top, left: pos.left, zIndex: 200,
            background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 4,
            width: pos.width, maxHeight: 132, overflowY: "auto",
            boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
          }}
        >
          {QTY_OPTIONS.map((n) => (
            <div
              key={n}
              onMouseDown={(e) => { e.preventDefault(); commit(n); setOpen(false); }}
              className="pop-item"
              style={{
                padding: "4px 0", lineHeight: "16px", textAlign: "center", fontSize: 12, cursor: "pointer",
                ...(n === value ? { background: "var(--surface2)" } : {}),
                color: n === value ? "var(--accent)" : "var(--text)",
                fontWeight: n === value ? 700 : 400,
              }}
            >
              {n}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
