import { useState } from "react";
import {
  Pencil, X, BookmarkPlus,
} from "lucide-react";
import { Combobox } from "./Combobox.jsx";
import { Field } from "./Field.jsx";
import { uid, todayStr, addOneDay, cascadeDates } from "../lib/utils.js";


// `initial` edits an existing project. Two extras, used only by the
// owner's Calendar module (src/expansion/): `prefill` starts a *new*
// project from given values, and `noList` is for a project without an
// equipment list — it hides the list-only parts (template, quantity mode,
// save as template) and requires every shoot day to have a date.
// `heading` / `saveLabel` (owner only) replace "New Project" / "Create
// project" when the window makes a list for an existing project or a draft.
// `draft` (owner only): a draft list, in no project — the bare-bone list:
// no production / rental house, Producer or Gaffer (those belong to a
// project), and the name, tag and shoot dates are optional.
export function ProjectFormModal({ initial, prefill, noList, heading, saveLabel, draft, productionHouses, rentalHouses, recentProjectNames, recentProjectLabels, projectTags, templates, onSaveAsTemplate, onManageTags, onClose, onSave }) {
  const start = initial || prefill;
  const [name, setName] = useState(start?.name || "");
  // Editing shows the project's real tag, even none ("—") or one since
  // removed from the tag list; a new project starts on the first tag.
  const [tag, setTag] = useState(initial ? initial.tag || "" : draft ? "" : (start && start.tag) || projectTags[0] || "");
  const tagOptions = draft || (initial && !projectTags.includes(initial.tag || ""))
    ? [...new Set([initial?.tag || "", "", ...projectTags])]
    : projectTags;
  const [productionHouse, setProductionHouse] = useState(start?.productionHouse || "");
  const [producer, setProducer] = useState(start?.producer || "");
  const [rentalHouse, setRentalHouse] = useState(start?.rentalHouse || "");
  const [gaffer, setGaffer] = useState(start?.gaffer || "");
  const [templateId, setTemplateId] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [missingDate, setMissingDate] = useState(false);
  const [dayCount, setDayCount] = useState(start?.days?.length || 1);
  const [perDayQty, setPerDayQty] = useState(start?.perDayQty || false);
  const [dayRows, setDayRows] = useState(
    start?.days?.length
      ? start.days.map((d) => ({ id: d.id, date: d.date, location: d.location || "", projectLabel: d.projectLabel || "" }))
      : [{ id: uid(), date: draft ? "" : todayStr(), location: "", projectLabel: "" }]
  );

  function handleDayCount(n) {
    setDayCount(n);
    setDayRows((prev) => {
      const next = [...prev];
      while (next.length < n) {
        const prevDate = next.length > 0 ? next[next.length - 1].date : "";
        next.push({ id: uid(), date: prevDate ? addOneDay(prevDate) : draft ? "" : todayStr(), location: "", projectLabel: "" });
      }
      while (next.length > n) next.pop();
      return next;
    });
  }

  function updateDayRow(id, patch) {
    setDayRows((prev) => {
      const idx = prev.findIndex((d) => d.id === id);
      if (idx === -1) return prev;
      let next = prev.map((d) => (d.id === id ? { ...d, ...patch } : d));
      if (Object.prototype.hasOwnProperty.call(patch, "date")) next = cascadeDates(next, idx);
      return next;
    });
  }

  function submitSaveTemplate() {
    if (!templateName.trim()) return;
    onSaveAsTemplate(templateName.trim());
    setTemplateName("");
    setShowSaveTemplate(false);
  }

  function submit() {
    if (!name.trim() && !draft) return;
    if (noList && dayRows.some((d) => !d.date)) { setMissingDate(true); return; }
    const days = dayRows.map((d, i) => ({
      id: d.id, label: `Day ${i + 1}`, date: d.date, location: d.location, projectLabel: d.projectLabel,
    }));
    const houses = draft
      ? { productionHouse: "", producer: "", rentalHouse: "", gaffer: "" }
      : { productionHouse: productionHouse.trim(), producer: producer.trim(), rentalHouse: rentalHouse.trim(), gaffer: gaffer.trim() };
    onSave({ name: name.trim(), tag, ...houses, days, perDayQty, templateId: templateId || undefined });
  }

  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto", padding: 22, border: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="stencil" style={{ fontSize: 14 }}>{heading || (initial ? "Edit Project" : "New Project")}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}><X size={18} /></button>
        </div>

        {!initial && !noList && templates.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              style={{ width: "100%", fontSize: 13, fontWeight: 800 }}
            >
              <option value="">Start from scratch</option>
              {templates.map((t) => <option key={t.id} value={t.id}>Start from "{t.name}"</option>)}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <select
            style={{ width: 60, flexShrink: 0, fontSize: 11, fontWeight: 800, textTransform: "uppercase", padding: "0 4px" }}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            title="Project tag"
          >
            {tagOptions.map((t) => <option key={t} value={t}>{t || "—"}</option>)}
          </select>
          <Combobox
            value={name}
            onChange={setName}
            options={recentProjectNames}
            placeholder={draft ? "List name (optional)" : "Project Name"}
            style={{ flex: 1 }}
          />
        </div>

        {!draft && (<>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <select
            value={productionHouse}
            onChange={(e) => setProductionHouse(e.target.value)}
            style={{ flex: 3 }}
          >
            <option value="">Production</option>
            {productionHouses.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <input
            value={producer}
            onChange={(e) => setProducer(e.target.value)}
            placeholder="Producer"
            style={{ flex: 2 }}
          />
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <select
            value={rentalHouse}
            onChange={(e) => setRentalHouse(e.target.value)}
            style={{ flex: 3 }}
          >
            <option value="">Rental</option>
            {rentalHouses.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <input
            value={gaffer}
            onChange={(e) => setGaffer(e.target.value)}
            placeholder="Gaffer"
            style={{ flex: 2 }}
          />
        </div>
        </>)}

        <button
          onClick={onManageTags}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, marginBottom: 16 }}
        >
          <Pencil size={11} /> {draft ? "Manage tags" : "Manage tags, production houses and rental houses"}
        </button>

        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <Field label="Shooting Days" style={{ flex: "0 0 auto", marginBottom: 0 }}>
            <div style={{ display: "flex", gap: 4, background: "var(--surface2)", borderRadius: 4, padding: 3, maxWidth: 280 }}>
              {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => handleDayCount(n)}
                  style={{
                    flex: 1, padding: "6px 0", fontSize: 13, fontWeight: 700, border: "none",
                    borderRadius: 3, cursor: "pointer", minWidth: 26,
                    background: dayCount === n ? "var(--accent)" : "transparent",
                    color: dayCount === n ? "var(--accent-text)" : "var(--text)",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>
          {!noList && (
          <Field label="Equipment Quantities" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
            <div style={{ display: "flex", gap: 4, background: "var(--surface2)", borderRadius: 4, padding: 3 }} title="Whether every shoot day uses the same gear quantities, or each day is entered separately">
              <button
                onClick={() => setPerDayQty(false)}
                style={{
                  flex: 1, padding: "6px 4px", fontSize: 12, fontWeight: 700, border: "none",
                  borderRadius: 3, cursor: "pointer",
                  background: !perDayQty ? "var(--accent)" : "transparent",
                  color: !perDayQty ? "var(--accent-text)" : "var(--text)",
                }}
              >
                All days same
              </button>
              <button
                onClick={() => setPerDayQty(true)}
                style={{
                  flex: 1, padding: "6px 4px", fontSize: 12, fontWeight: 700, border: "none",
                  borderRadius: 3, cursor: "pointer",
                  background: perDayQty ? "var(--accent)" : "transparent",
                  color: perDayQty ? "var(--accent-text)" : "var(--text)",
                }}
              >
                Custom per day
              </button>
            </div>
          </Field>
          )}
        </div>

        <Field label={dayRows.length > 1 ? "Shoot days" : "Shoot day"}>
          {dayRows.map((d, i) => (
            <div key={d.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", width: 20, flexShrink: 0 }}>D{i + 1}</span>
                {/* An empty date reads "Select date" (no date is fine for a draft). */}
                <span style={{ position: "relative", width: 118, flexShrink: 0, display: "flex" }}>
                  <input
                    type="date"
                    style={{ width: "100%", fontSize: 12, padding: "5px 6px", ...(d.date ? {} : { color: "transparent" }) }}
                    value={d.date}
                    onChange={(e) => { updateDayRow(d.id, { date: e.target.value }); setMissingDate(false); }}
                  />
                  {!d.date && <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--muted2)", pointerEvents: "none" }}>Select date</span>}
                </span>
                <Combobox
                  value={d.projectLabel}
                  onChange={(v) => updateDayRow(d.id, { projectLabel: v })}
                  options={recentProjectLabels}
                  placeholder="Shoot type…"
                  style={{ flex: 1 }}
                />
              </div>
              <input
                style={{ width: "calc(100% - 26px)", marginLeft: 26 }}
                value={d.location}
                onChange={(e) => updateDayRow(d.id, { location: e.target.value })}
                placeholder="Location and note"
              />
            </div>
          ))}
          {missingDate && <div style={{ fontSize: 12, color: "var(--danger)" }}>Every shoot day needs a date.</div>}
        </Field>

        {initial && !noList && (
          <div style={{ marginBottom: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            {showSaveTemplate ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  autoFocus
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitSaveTemplate(); }}
                  placeholder="Template name…"
                  style={{ flex: 1, fontSize: 12.5 }}
                />
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={submitSaveTemplate} disabled={!templateName.trim()}>Save</button>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setShowSaveTemplate(false); setTemplateName(""); }}>Cancel</button>
              </div>
            ) : (
              <button
                className="btn btn-ghost"
                onClick={() => setShowSaveTemplate(true)}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <BookmarkPlus size={14} /> Save as Template
              </button>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>{saveLabel || (initial ? "Save changes" : "Create project")}</button>
        </div>
      </div>
    </div>
  );
}
