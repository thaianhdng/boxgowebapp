import { useState, useEffect, useRef } from "react";
import { formatDMY } from "../lib/utils.js";


const plural = (n, word) => `${n} ${word}${n !== 1 ? "s" : ""}`;

// The non-project parts of a backup, each restored (replacing what's in the
// app now) only if ticked. `has` decides whether the backup contains it at
// all; sections a backup doesn't carry aren't offered.
export const RESTORE_SECTIONS = [
  { key: "catalog", label: "Master catalog", detail: (d) => `${plural((d.catalog || []).length, "item")}, with its categories and sub-categories`, has: (d) => !!d.catalog },
  { key: "brands", label: "Brands", detail: (d) => plural((d.brands || []).length, "brand"), has: (d) => !!d.brands },
  { key: "projectTags", label: "Project tags", detail: (d) => plural((d.projectTags || []).length, "tag"), has: (d) => !!d.projectTags },
  { key: "productionHouses", label: "Production houses", detail: (d) => plural((d.productionHouses || []).length, "house"), has: (d) => !!d.productionHouses },
  { key: "rentalHouses", label: "Rental houses", detail: (d) => plural((d.rentalHouses || []).length, "house"), has: (d) => !!d.rentalHouses },
  { key: "templates", label: "Templates", detail: (d) => plural((d.templates || []).length, "template"), has: (d) => (d.templates || []).length > 0 },
  { key: "profile", label: "Your profile", detail: () => "Name, email, phone, and what's shown on the PDF", has: (d) => !!(d.userName || d.userEmail || d.userPhone || typeof d.includeUsernameInPdf === "boolean") },
  { key: "appearance", label: "Appearance", detail: () => "Theme, accent colour and font", has: (d) => !!(d.theme || d.accentId || d.fontId) },
];


// Lets the user pick what to take from a backup. Calls onRestore with
// { projects: Set of indexes into data.projects, <section key>: true, … }.
export function RestoreModal({ data, currentProjectIds, onCancel, onRestore }) {
  const backupProjects = data.projects || [];
  const sections = RESTORE_SECTIONS.filter((s) => s.has(data));
  const [projectSel, setProjectSel] = useState(() => new Set(backupProjects.map((_, i) => i)));
  const [sectionSel, setSectionSel] = useState(() => new Set(sections.map((s) => s.key)));
  const [showProjects, setShowProjects] = useState(false);
  const allProjectsRef = useRef(null);

  const allProjects = projectSel.size === backupProjects.length;
  const someProjects = projectSel.size > 0 && !allProjects;
  useEffect(() => { if (allProjectsRef.current) allProjectsRef.current.indeterminate = someProjects; }, [someProjects]);

  const toggleProject = (i) => setProjectSel((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });
  const toggleSection = (key) => setSectionSel((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const overwrites = backupProjects.filter((p, i) => projectSel.has(i) && currentProjectIds.has(p.id)).length;
  const nothingSelected = projectSel.size === 0 && sectionSel.size === 0;

  return (
    <div className="no-print" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16,
    }}>
      <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 420, maxHeight: "calc(100vh - 32px)", display: "flex", flexDirection: "column", border: "1px solid var(--border2)" }}>
        <div style={{ padding: "22px 22px 0" }}>
          <div className="stencil" style={{ fontSize: 14, marginBottom: 10 }}>Restore Backup</div>
          {data.userName && (
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
              Backed up by {data.userName}
            </div>
          )}
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
            Made {data.exportedAt ? formatDMY(data.exportedAt.slice(0, 10)) : "at an unknown time"}. Tick what you want to restore:
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "0 22px" }}>
          {backupProjects.length > 0 && (
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <label style={rowStyle}>
                  <input
                    ref={allProjectsRef}
                    type="checkbox"
                    checked={allProjects}
                    onChange={() => setProjectSel(allProjects ? new Set() : new Set(backupProjects.map((_, i) => i)))}
                    style={boxStyle}
                  />
                  <span>
                    <div style={labelStyle}>Projects</div>
                    <div style={detailStyle}>{projectSel.size} of {plural(backupProjects.length, "project")} selected</div>
                  </span>
                </label>
                <button
                  onClick={() => setShowProjects((v) => !v)}
                  style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "10px 0", fontFamily: "inherit", whiteSpace: "nowrap" }}
                >
                  {showProjects ? "Hide list" : "Choose…"}
                </button>
              </div>
              {showProjects && (
                <div style={{ paddingLeft: 28 }}>
                  {backupProjects.map((p, i) => (
                    <label key={i} style={{ ...rowStyle, padding: "6px 0" }}>
                      <input type="checkbox" checked={projectSel.has(i)} onChange={() => toggleProject(i)} style={boxStyle} />
                      <span style={{ fontSize: 13, color: "var(--text)" }}>
                        {p.name || "Untitled project"}
                        {currentProjectIds.has(p.id) && <span style={{ color: "var(--muted2)", fontSize: 11 }}> · replaces current</span>}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {sections.map((s) => (
            <label key={s.key} style={rowStyle}>
              <input type="checkbox" checked={sectionSel.has(s.key)} onChange={() => toggleSection(s.key)} style={boxStyle} />
              <span>
                <div style={labelStyle}>{s.label}</div>
                <div style={detailStyle}>{s.detail(data)}</div>
              </span>
            </label>
          ))}
        </div>

        <div style={{ padding: "12px 22px 22px" }}>
          <div style={{ fontSize: 12, color: "#AA0000", marginBottom: 16, lineHeight: 1.45 }}>
            Ticked sections replace what's in the app now. Ticked projects are added
            {overwrites > 0 ? ` (${overwrites} you still have will be overwritten by the backup's version)` : ""}; your other current projects are kept. This can't be undone.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={nothingSelected}
              style={nothingSelected ? { opacity: 0.5, cursor: "default" } : undefined}
              onClick={() => onRestore({ projects: projectSel, ...Object.fromEntries([...sectionSel].map((k) => [k, true])) })}
            >
              Restore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const rowStyle = { display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", cursor: "pointer" };
const boxStyle = { marginTop: 2, width: 16, height: 16, accentColor: "var(--accent)", flexShrink: 0, cursor: "pointer" };
const labelStyle = { fontSize: 13, fontWeight: 700, color: "var(--text)" };
const detailStyle = { fontSize: 11.5, color: "var(--muted)", marginTop: 1 };
