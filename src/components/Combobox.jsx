import { useState } from "react";


export function Combobox({ value, onChange, options, placeholder, style, inputStyle, autoFocus, onKeyDown }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = (options || [])
    .filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);

  return (
    <div style={{ position: "relative", ...style }}>
      <input
        style={{ width: "100%", ...inputStyle }}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => { onChange(e.target.value); setQuery(e.target.value); setOpen(true); }}
        onFocus={(e) => { setOpen(true); setQuery(""); e.target.select(); }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% - 1px)", left: 0, right: 0, zIndex: 30,
          background: "var(--surface)", border: "1px solid var(--border2)", borderTop: "none",
          borderRadius: "0 0 3px 3px", maxHeight: 160, overflowY: "auto",
          boxShadow: "0 4px 10px rgba(27,27,24,0.12)",
        }}>
          {filtered.map((o) => (
            <div
              key={o}
              onMouseDown={(e) => { e.preventDefault(); onChange(o); setOpen(false); }}
              className="row"
              style={{ padding: "7px 10px", fontSize: 12, cursor: "pointer" }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
