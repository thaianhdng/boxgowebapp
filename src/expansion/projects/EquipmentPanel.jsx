import { FileSpreadsheet, Plus, SquarePen } from "lucide-react";
import { Section } from "../shared/ui.jsx";
import { formatShootDateRange } from "../../lib/utils.js";

function usedModels(list, catalog, test) {
  const names = Object.entries(list.itemData || {})
    .filter(([, e]) => Object.values(e.quantities || {}).some((q) => q > 0))
    .map(([id]) => catalog.find((c) => c.id === id))
    .filter((c) => c && test(c))
    .map((c) => c.name);
  return [...new Set(names)];
}

const label = { width: 62, flexShrink: 0, fontSize: 10, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.04em", paddingTop: 2 };

// The project's equipment list, as a summary, with a way into the
// Equipment List Composer — or a button to start one.
export function EquipmentPanel({ app, list, hasShootEvents, onCreate }) {

  if (!list) {
    return (
      <Section title="Equipment list">
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
  const itemCount = Object.values(list.itemData || {}).filter((e) => Object.values(e.quantities || {}).some((q) => q > 0)).length;
  const bodies = usedModels(list, catalog, (c) => /camera/i.test(c.department));
  const lenses = usedModels(list, catalog, (c) => /lens/i.test(c.department) || /lens/i.test(c.subcategory || ""));
  const days = list.days || [];
  const lines = [
    ["Days", `${days.length} · ${formatShootDateRange(days) || "no dates"}`],
    ["Items", itemCount ? String(itemCount) : "None yet"],
    bodies.length && ["Camera", bodies.join(", ")],
    lenses.length && ["Lenses", lenses.join(", ")],
  ].filter(Boolean);

  return (
    <Section title="Equipment list">
      <div style={{ border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: 4, padding: "10px 12px", background: "var(--surface)" }}>
        {lines.map(([k, v]) => (
          <div key={k} style={{ display: "flex", gap: 10, fontSize: 12.5, marginBottom: 4 }}>
            <span style={label}>{k}</span>
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => app.openEquipmentList(list.id)}><SquarePen size={13} /> Edit equipment list</button>
          <button className="btn btn-ghost" onClick={() => app.previewEquipmentList(list.id)}><FileSpreadsheet size={13} /> Preview</button>
        </div>
      </div>
    </Section>
  );
}
