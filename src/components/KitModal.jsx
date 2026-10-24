import { useState } from "react";
import { X, ChevronRight, Package } from "lucide-react";
import { dayColumns } from "../lib/dayLinks.js";
import { applyKit, kitFromProject, kitSummary, KIT_MODES } from "../lib/kits.js";
import { orderedKeys } from "../lib/utils.js";

// The composer's "+ Add kit" window (owner's call): pick a kit, the days it
// goes on and what happens to gear already in the list (Replace / Add /
// Keep higher), with a preview of every change before anything is added.
export function AddKitModal({ kits, project, catalog, departments, onApply, onClose }) {
  const [kit, setKit] = useState(kits.length === 1 ? kits[0] : null);
  const [mode, setMode] = useState("higher");
  const days = project.days || [];
  // Linked days are one column here too (they always stay equal).
  const cols = project.perDayQty && days.length > 1 ? dayColumns(days, project.dayLinks) : [];
  const [picked, setPicked] = useState(() => new Set(cols.map((c) => c.id)));
  const colLabel = (c) => [c, ...(c.followers || [])].map((d) => d.label.replace("Day ", "D")).join("/");
  const allPicked = cols.length > 0 && picked.size === cols.length;
  const toggle = (id) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const preview = kit ? applyKit(project, kit, [...picked], mode, catalog) : null;
  const changed = (ch) => ch.after.some((v, i) => v !== ch.before[i]);
  const count = preview ? preview.changes.filter(changed).length : 0;
  const byDept = {};
  (preview?.changes || []).forEach((ch) => { (byDept[ch.department] = byDept[ch.department] || []).push(ch); });
  const dayText = cols.length && !allPicked ? ` to ${cols.filter((c) => picked.has(c.id)).map(colLabel).join(", ")}` : "";

  return (
    <Window onClose={onClose}>
      {!kit ? (
        <>
          <Head title="Add kit" onClose={onClose} />
          <div style={styles.hint}>Adds a kit's gear to this list. Nothing already in the list is removed.</div>
          {kits.map((k) => {
            const { count: n, depts } = kitSummary(k, catalog);
            return (
              <button key={k.id} className="row" onClick={() => setKit(k)} style={styles.kitRow}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700, color: "var(--accent)" }}>{k.name}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{n} item{n === 1 ? "" : "s"}{depts.length ? ` · ${depts.join(", ")}` : ""}</span>
                </span>
                <ChevronRight size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
              </button>
            );
          })}
        </>
      ) : (
        <>
          <Head title={kit.name} onBack={kits.length > 1 ? () => setKit(null) : null} onClose={onClose} />
          {cols.length > 0 && (
            <>
              <div style={styles.label}>Add to</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                <Chip on={allPicked} onClick={() => setPicked(allPicked ? new Set() : new Set(cols.map((c) => c.id)))}>All days</Chip>
                {cols.map((c) => <Chip key={c.id} on={picked.has(c.id)} onClick={() => toggle(c.id)}>{colLabel(c)}</Chip>)}
              </div>
            </>
          )}
          <div style={styles.label}>Already in the list</div>
          <div style={{ display: "flex", gap: 2, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: 2, marginBottom: 4 }}>
            {KIT_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                title={m.hint}
                style={{
                  flex: 1, border: "none", borderRadius: 3, padding: "7px 0", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  background: mode === m.id ? "var(--accent)" : "transparent", color: mode === m.id ? "var(--accent-text)" : "var(--muted)",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div style={{ ...styles.hint, marginBottom: 12 }}>{KIT_MODES.find((m) => m.id === mode).hint}.</div>

          {orderedKeys(byDept, Object.keys(departments)).map((dept) => (
            <div key={dept} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 2 }}>{dept}</div>
              {byDept[dept].map((ch) => (
                <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderTop: "1px solid var(--border)", fontSize: 12.5 }}>
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 500, color: changed(ch) ? "var(--text)" : "var(--muted)", overflowWrap: "anywhere" }}>{ch.name}</span>
                  <span style={{ flexShrink: 0, fontWeight: changed(ch) ? 800 : 500, fontSize: changed(ch) ? 12.5 : 11.5, color: changed(ch) ? "var(--accent)" : "var(--muted)" }}>{changeText(ch, mode)}</span>
                </div>
              ))}
            </div>
          ))}
          {preview && preview.changes.length === 0 && <div style={styles.hint}>This kit's items are no longer in your catalog.</div>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={count === 0 || (cols.length > 0 && picked.size === 0)}
              onClick={() => onApply(kit, [...picked], mode)}
            >
              {count === 0 ? "Nothing to change" : `Add ${count} item${count === 1 ? "" : "s"}${dayText}`}
            </button>
          </div>
        </>
      )}
    </Window>
  );
}

// What one item's numbers do, e.g. "+2", "1 → 2", "already 2".
function changeText(ch, mode) {
  const same = (arr) => arr.every((v) => v === arr[0]);
  const changed = ch.after.some((v, i) => v !== ch.before[i]);
  if (!changed) return same(ch.before) ? `already ${ch.before[0]}` : "no change";
  if (same(ch.before) && same(ch.after)) return ch.before[0] === 0 ? `+${ch.after[0]}` : `${ch.before[0]} → ${ch.after[0]}`;
  return `${ch.before.join("/")} → ${ch.after.join("/")}`;
}

// "Save as kit": the list's gear (each item at its highest number on any
// day) under a name; the name of an existing kit replaces that kit.
export function SaveKitModal({ project, kits, onSave, onClose }) {
  const [name, setName] = useState("");
  const draft = kitFromProject(project, name || "x");
  const n = Object.keys(draft.itemQuantities).length + draft.customItems.length;
  const existing = kits.find((k) => k.name.trim().toLowerCase() === name.trim().toLowerCase());
  const save = () => { if (name.trim() && n > 0) onSave(name.trim()); };
  return (
    <Window onClose={onClose}>
      <Head title="Save as kit" onClose={onClose} />
      <div style={styles.hint}>
        {n === 0
          ? "This list has no gear yet. Pick some items first, then save them as a kit."
          : `Saves this list's ${n} item${n === 1 ? "" : "s"} as a kit, each at its highest number on any day. Only the gear is saved — no days, dates, houses or notes.`}
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); }}
        placeholder="Kit name, e.g. Night Ext kit…"
        style={{ width: "100%", fontSize: 13, marginBottom: 6 }}
      />
      {existing && name.trim() && <div style={{ fontSize: 11.5, color: "var(--accent)", marginBottom: 6 }}>A kit called "{existing.name}" already exists — saving replaces it.</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={!name.trim() || n === 0}>
          <Package size={14} /> {existing && name.trim() ? "Replace kit" : "Save kit"}
        </button>
      </div>
    </Window>
  );
}

function Window({ onClose, children }) {
  return (
    <div className="no-print m-overlay" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 440, maxHeight: "100%", overflowY: "auto", padding: 20, border: "1px solid var(--border2)" }}>
        {children}
      </div>
    </div>
  );
}

function Head({ title, onBack, onClose }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      {onBack && (
        <button onClick={onBack} title="Other kits" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0, display: "flex" }}>
          <ChevronRight size={18} style={{ transform: "rotate(180deg)" }} />
        </button>
      )}
      <div className="stencil" style={{ fontSize: 14, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{title}</div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", padding: 0, display: "flex" }}><X size={18} /></button>
    </div>
  );
}

function Chip({ on, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px", borderRadius: 3, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        border: `1px solid ${on ? "var(--accent)" : "var(--border2)"}`,
        background: on ? "var(--accent)" : "transparent", color: on ? "var(--accent-text)" : "var(--muted)",
      }}
    >
      {children}
    </button>
  );
}

const styles = {
  hint: { fontSize: 11.5, color: "var(--muted)", lineHeight: 1.45, marginBottom: 12 },
  label: { fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted2)", marginBottom: 6 },
  kitRow: {
    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "11px 13px", marginBottom: 8,
    borderRadius: 4, cursor: "pointer", background: "var(--surface2)", color: "var(--text)", fontFamily: "inherit", fontSize: 13,
    border: "1px solid var(--border2)",
  },
};
