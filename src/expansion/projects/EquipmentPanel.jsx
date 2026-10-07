import { Copy, FileSpreadsheet, FolderMinus, Plus, SquarePen, Trash2 } from "lucide-react";
import { Section, smallBtn } from "../shared/ui.jsx";
import { formatShootDateRange } from "../../lib/utils.js";
import { MAX_VERSIONS } from "./sync.js";

function usedModels(list, catalog, test) {
  const names = Object.entries(list.itemData || {})
    .filter(([, e]) => Object.values(e.quantities || {}).some((q) => q > 0))
    .map(([id]) => catalog.find((c) => c.id === id))
    .filter((c) => c && test(c))
    .map((c) => c.name);
  return [...new Set(names)];
}

const label = { width: 62, flexShrink: 0, fontSize: 10, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.04em", paddingTop: 2 };

// The project's equipment lists — its versions V1, V2… (up to
// MAX_VERSIONS), each as a summary with its note and a way into the
// Equipment List Composer — or a button to start one. The current version
// is the one the composer's project list shows.
export function EquipmentPanel({ app, versions, currentId, hasShootEvents, onCreate, onDuplicate, onSetCurrent, onSetNote, onRemove, onDelete }) {
  if (!versions.length) {
    return (
      <Section title="Equipment list" id="x-equipment">
        <div style={{ border: "1px dashed var(--border2)", borderRadius: 4, padding: 14 }}>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
            No equipment list yet. {hasShootEvents
              ? "Its shoot days start from this project's Shooting events."
              : "Its shoot days become Shooting events in this project's schedule."}
          </div>
          <button className="btn btn-primary" onClick={onCreate}><Plus size={13} /> Create equipment list</button>
        </div>
      </Section>
    );
  }

  const catalog = app.catalog || [];
  const full = versions.length >= MAX_VERSIONS;
  const days = versions.find((v) => v.id === currentId)?.list?.days || versions[0].list?.days || [];
  const ordered = [...versions].sort((a, b) => b.v - a.v);

  return (
    <Section
      title={versions.length > 1 ? `Equipment lists · ${versions.length}` : "Equipment list"}
      id="x-equipment"
      right={full
        ? <span style={{ fontSize: 11, color: "var(--muted)" }}>{MAX_VERSIONS} lists, the most a project can have</span>
        : <button className="btn btn-ghost" style={smallBtn} onClick={onCreate} title="A new, empty list for this project (or use Duplicate to copy one)"><Plus size={12} /> New version</button>}
    >
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
        {days.length} day{days.length === 1 ? "" : "s"} · {formatShootDateRange(days) || "no dates"}
        {versions.length > 1 && <span style={{ color: "var(--muted2)" }}> · every list follows the project's shoot days</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ordered.map(({ id, v, note, list }) => {
          const current = id === currentId;
          const itemCount = Object.values(list.itemData || {}).filter((e) => Object.values(e.quantities || {}).some((q) => q > 0)).length;
          const bodies = usedModels(list, catalog, (c) => /camera/i.test(c.department));
          const lenses = usedModels(list, catalog, (c) => /lens/i.test(c.department) || /lens/i.test(c.subcategory || ""));
          const lines = [
            ["Items", itemCount ? String(itemCount) : "None yet"],
            bodies.length && ["Camera", bodies.join(", ")],
            lenses.length && ["Lenses", lenses.join(", ")],
          ].filter(Boolean);
          return (
            <div key={id} style={{ border: "1px solid var(--border)", borderLeft: `3px solid ${current ? "var(--accent)" : "var(--border2)"}`, borderRadius: 4, padding: "8px 12px 10px", background: "var(--surface)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span className="stencil" style={{ fontSize: 14, color: current ? "var(--accent)" : "var(--text)", flexShrink: 0 }}>V{v}</span>
                <input
                  key={`${id}:${note || ""}`}
                  defaultValue={note || ""}
                  placeholder="Add a note, e.g. after tech recce"
                  onBlur={(e) => { const t = e.target.value.trim(); if (t !== (note || "")) onSetNote(id, t); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  style={{ flex: 1, minWidth: 0, fontSize: 12.5, padding: "4px 8px" }}
                />
                {versions.length > 1 && (current
                  ? <span className="tag-box" style={{ flexShrink: 0, fontWeight: 800, letterSpacing: 0.5, color: "var(--accent)" }} title="The list shown in Equipment">Current</span>
                  : <button className="btn btn-ghost" style={{ ...smallBtn, flexShrink: 0 }} onClick={() => onSetCurrent(id)} title="Show this list in Equipment">Make current</button>)}
              </div>
              {lines.map(([k, val]) => (
                <div key={k} style={{ display: "flex", gap: 10, fontSize: 12.5, marginBottom: 4 }}>
                  <span style={label}>{k}</span>
                  <span title={val} style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{val}</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <button className={current ? "btn btn-primary" : "btn btn-ghost"} style={smallBtn} onClick={() => app.openEquipmentList(id)}><SquarePen size={12} /> Edit</button>
                <button className="btn btn-ghost" style={smallBtn} onClick={() => app.previewEquipmentList(id)}><FileSpreadsheet size={12} /> Preview</button>
                <button className="btn btn-ghost" style={smallBtn} onClick={() => onDuplicate(id)}><Copy size={12} /> Duplicate</button>
                <button className="btn btn-ghost" style={smallBtn} onClick={() => onRemove(id)} title="Take it out of this project; it stays in Equipment as a draft"><FolderMinus size={12} /> Remove</button>
                <button className="btn btn-ghost" style={{ ...smallBtn, color: "var(--danger)" }} onClick={() => onDelete(id, v)}><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
