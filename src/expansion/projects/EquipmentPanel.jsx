import { useState } from "react";
import { FileSpreadsheet, Plus, SquarePen } from "lucide-react";
import { Section, Toggle, smallBtn } from "../shared/ui.jsx";
import { Combobox } from "../../components/Combobox.jsx";
import { formatShootDateRange } from "../../lib/utils.js";
import { wdm } from "../shared/dates.js";

function usedModels(list, catalog, test) {
  const names = Object.entries(list.itemData || {})
    .filter(([, e]) => Object.values(e.quantities || {}).some((q) => q > 0))
    .map(([id]) => catalog.find((c) => c.id === id))
    .filter((c) => c && test(c))
    .map((c) => c.name);
  return [...new Set(names)];
}

const label = { width: 62, flexShrink: 0, fontSize: 10, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.04em", paddingTop: 2 };

// The list's own settings that used to live in its "Edit project" window:
// quantity mode, each day's type-of-shooting label, save as template.
function ListSettings({ app, list }) {
  const [tplName, setTplName] = useState("");
  const [saved, setSaved] = useState("");
  const setDayLabel = (dayId, projectLabel) =>
    app.updateEquipmentList(list.id, { days: list.days.map((d) => (d.id === dayId ? { ...d, projectLabel } : d)) });
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
      <div style={{ ...label, width: "auto", marginBottom: 6 }}>Quantities</div>
      <Toggle
        options={[[false, "Same every day"], [true, "Per day"]]}
        value={!!list.perDayQty}
        onChange={(perDayQty) => app.updateEquipmentList(list.id, { perDayQty })}
      />
      {(list.days || []).length > 0 && (
        <>
          <div style={{ ...label, width: "auto", margin: "14px 0 6px" }}>Type of shooting, per day</div>
          {list.days.map((d) => (
            <div key={d.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, color: "var(--muted)", width: 86, flexShrink: 0 }}>{d.label.replace("Day ", "D")} · {wdm(d.date) || "no date"}</span>
              <Combobox
                value={d.projectLabel || ""}
                onChange={(v) => setDayLabel(d.id, v)}
                options={app.recentProjectLabels || []}
                placeholder="Type of shooting…"
                style={{ flex: 1, minWidth: 0 }}
                inputStyle={{ fontSize: 12.5, padding: "5px 8px" }}
              />
            </div>
          ))}
        </>
      )}
      <div style={{ ...label, width: "auto", margin: "14px 0 6px" }}>Save as template</div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={tplName} onChange={(e) => { setTplName(e.target.value); setSaved(""); }} placeholder="Template name…" style={{ flex: 1, minWidth: 0, fontSize: 12.5, padding: "5px 8px" }} />
        <button
          className="btn btn-ghost"
          style={smallBtn}
          disabled={!tplName.trim()}
          onClick={() => { app.saveAsTemplate(list.id, tplName); setSaved(tplName.trim()); setTplName(""); }}
        >
          Save
        </button>
      </div>
      {saved && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 5 }}>Saved "{saved}".</div>}
    </div>
  );
}

// The project's equipment list, as a summary, with a way into the
// Equipment List Composer — or a button to start one.
export function EquipmentPanel({ app, list, hasShootSteps, onCreate }) {
  const [templateId, setTemplateId] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const templates = app.templates || [];

  if (!list) {
    return (
      <Section title="Equipment list">
        <div style={{ border: "1px dashed var(--border2)", borderRadius: 4, padding: 14 }}>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
            No equipment list yet. {hasShootSteps
              ? "Its day columns will be this project's Shooting days."
              : "Its day columns come from this project's Shooting steps — add those first, or it starts with one day for tomorrow."}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {templates.length > 0 && (
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={{ fontSize: 13, padding: "6px 8px", maxWidth: "100%" }}>
                <option value="">Start empty</option>
                {templates.map((t) => <option key={t.id} value={t.id}>Start from "{t.name}"</option>)}
              </select>
            )}
            <button className="btn btn-primary" onClick={() => onCreate(templateId || undefined)}><Plus size={13} /> Create equipment list</button>
          </div>
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
    <Section
      title="Equipment list"
      right={<button className="btn btn-ghost" style={smallBtn} onClick={() => setShowSettings((v) => !v)}>{showSettings ? "Hide list settings" : "List settings"}</button>}
    >
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
        {showSettings && <ListSettings app={app} list={list} />}
      </div>
    </Section>
  );
}
