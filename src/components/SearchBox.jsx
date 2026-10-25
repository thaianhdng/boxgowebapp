import { useRef } from "react";
import { Search, X } from "lucide-react";

// Every search bar in the app (design rule, owner's call): a magnifier at
// the left and, once something is typed, an X at the right that clears it
// (and keeps the cursor in the box). `style` goes on the wrapper (margins,
// flex); `height` sets the box's height when it must match a button.
export function SearchBox({ value, onChange, placeholder, style, height, autoFocus }) {
  const inputRef = useRef(null);
  return (
    <div style={{ position: "relative", ...style }}>
      <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{ width: "100%", boxSizing: "border-box", paddingLeft: 31, paddingRight: value ? 34 : undefined, fontSize: 13, ...(height ? { height } : {}) }}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          title="Clear search"
          onClick={() => { onChange(""); inputRef.current?.focus(); }}
          style={{
            position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 28, height: 28,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            background: "none", border: "none", cursor: "pointer", color: "var(--muted)",
          }}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
