import { useState, useEffect } from "react";
import {
  Plus, Trash2, Pencil, Search, Printer, Copy, MoreVertical, FolderInput, FolderMinus,
} from "lucide-react";
import { formatShootDateRange, inCardPreview } from "../lib/utils.js";


// A project with `ghost: true` (owner only: a Calendar project that has no
// equipment list yet) shows greyed out; tapping it calls onCreateFromGhost.
// `cancelledIds` (owner only): lists whose job is Cancelled get a faded
// card and a "Cancelled" mark (only here, never in the preview or PDF).
// `listOnly` (owner only): Delete removes just the equipment list — the
// project stays in Projects — so the wording says so.
// `previewOff`: camera / lens (sub)categories left out of the camera and
// lens lines (set in the Master Catalog).
// `listMeta` (owner only; null until known): each list's project and
// version ({ v, note, count }), shown under the project note (one row);
// lists in no project get a "No project" mark. With it, the ⋮ menu offers Add to project… /
// Remove from project (onAddToProject / onRemoveFromProject).
export function ProjectListView({ projects, catalog, isFiltered, onOpen, onEdit, onExport, onDuplicate, onDelete, onFilterAttr, onCreateNew, onCreateFromGhost, listOnly, cancelledIds, listMeta, onAddToProject, onRemoveFromProject, previewOff }) {
  const [confirmId, setConfirmId] = useState(null);
  const [projSearch, setProjSearch] = useState("");
  const [menuId, setMenuId] = useState(null); // project whose ⋮ menu is open
  useEffect(() => {
    if (!menuId) return;
    const close = (e) => { if (!e.target.closest?.("[data-card-menu]")) setMenuId(null); };
    const closeNow = () => setMenuId(null);
    document.addEventListener("mousedown", close, true);
    document.addEventListener("touchstart", close, true);
    window.addEventListener("scroll", closeNow, true);
    return () => {
      document.removeEventListener("mousedown", close, true);
      document.removeEventListener("touchstart", close, true);
      window.removeEventListener("scroll", closeNow, true);
    };
  }, [menuId]);
  if (projects.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--muted)" }}>
        <div style={{ fontSize: 15, marginBottom: 4 }}>{isFiltered ? "No matching projects" : "No projects yet"}</div>
        <div style={{ fontSize: 13, marginBottom: isFiltered ? 0 : 16 }}>
          {isFiltered ? "Clear the filter to see all projects." : "Create your first project to start building a shoot's equipment list."}
        </div>
        {!isFiltered && (
          <button className="btn btn-primary" onClick={onCreateNew} style={{ margin: "0 auto" }}>
            <Plus size={14} /> Create New
          </button>
        )}
      </div>
    );
  }
  const q = projSearch.trim().toLowerCase();
  const visibleProjects = q
    ? projects.filter((p) =>
        [p.name, p.tag, p.productionHouse, p.rentalHouse, p.producer, p.gaffer].some((v) => (v || "").toLowerCase().includes(q))
      )
    : projects;
  function attr(e, field, value) {
    e.stopPropagation();
    if (value) onFilterAttr(field, value);
  }
  function usedModels(project, matchTest) {
    const ids = Object.keys(project.itemData || {}).filter((id) => {
      const entry = project.itemData[id];
      return Object.values(entry.quantities || {}).some((q) => q > 0);
    });
    const names = ids
      .map((id) => catalog.find((c) => c.id === id))
      .filter((c) => c && matchTest(c) && inCardPreview(c, previewOff))
      .map((c) => c.name);
    return [...new Set(names)];
  }
  return (
    // Same width as the owner's Projects page (1280 less its margins), so
    // the cards are the same size on wide screens too.
    <div style={{ maxWidth: 1236, margin: "0 auto" }}>
    <div style={{ position: "relative", marginBottom: 14 }}>
      <Search size={14} style={{ position: "absolute", left: 9, top: 9, color: "var(--muted)" }} />
      <input
        value={projSearch}
        onChange={(e) => setProjSearch(e.target.value)}
        placeholder="Search projects…"
        style={{ width: "100%", paddingLeft: 30, fontSize: 13 }}
      />
    </div>
    <button className="new-project-row-btn btn btn-primary" onClick={onCreateNew} style={{ width: "100%", justifyContent: "center", marginBottom: 12 }}>
      <Plus size={14} /> Create New
    </button>
    {visibleProjects.length === 0 && (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
        <div style={{ fontSize: 14 }}>No projects match your search.</div>
      </div>
    )}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
      <button
        className="new-project-card"
        onClick={onCreateNew}
        style={{
          border: "1px dashed var(--border2)", borderRadius: 4, background: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
          color: "var(--accent)", minHeight: 96, fontSize: 13, fontWeight: 600,
        }}
      >
        <Plus size={18} /> Create New
      </button>
      {visibleProjects.map((p) => {
        const bodies = usedModels(p, (c) => /camera/i.test(c.department));
        const lenses = usedModels(p, (c) => /lens/i.test(c.department) || /lens/i.test(c.subcategory || ""));
        const emptyDays = (p.days || []).filter(
          (d) => !Object.values(p.itemData || {}).some((entry) => (entry.quantities?.[d.id] || 0) > 0)
        );
        return (
          <div
            key={p.id}
            className="m-card"
            style={{
              position: "relative", minWidth: 0, border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: 4, background: "var(--surface)", cursor: "pointer", padding: "8px 12px 12px", display: "flex", flexDirection: "column",
              ...(p.ghost ? { opacity: 0.45, borderStyle: "dashed", borderLeftColor: "var(--border2)", background: "transparent" } : {}),
              ...(cancelledIds?.has(p.id) ? { opacity: 0.6, borderLeftColor: "var(--danger)" } : {}),
            }}
            title={p.ghost ? "No equipment list yet — tap to create one" : undefined}
            onClick={() => (p.ghost ? onCreateFromGhost(p) : onOpen(p.id))}
          >
            {/* Flowing text: the dates follow the name and a long name wraps;
                the tag floats in the top right corner, so only the first
                line makes room for it. */}
            <div style={{ minWidth: 0, fontSize: 13, lineHeight: "18px", marginBottom: 3 }}>
              {p.tag && (
                <span
                  className="tag-box"
                  onClick={(e) => attr(e, "tag", p.tag)}
                  title="Filter by this tag"
                  style={{ float: "right", marginLeft: 8, marginTop: 2, fontWeight: 700, letterSpacing: 0.4, color: "var(--accent)", cursor: "pointer" }}
                >
                  {p.tag}
                </span>
              )}
              <span
                onClick={(e) => attr(e, "name", p.name)}
                title="Filter by this project name"
                style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3, color: "var(--text)", textTransform: "uppercase", cursor: "pointer", marginRight: 7, overflowWrap: "anywhere" }}
              >
                {p.name || (listMeta && !listMeta[p.id] ? <span style={{ color: "var(--muted)" }}>Untitled list</span> : null)}
              </span>
              {formatShootDateRange(p.days) && (
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, color: "var(--muted2)", whiteSpace: "nowrap" }}>{formatShootDateRange(p.days)}</span>
              )}
              {cancelledIds?.has(p.id) && (
                <span className="tag-box" style={{ marginLeft: 6, fontWeight: 800, letterSpacing: 0.5, color: "var(--danger)", verticalAlign: "middle", position: "relative", top: -1 }}>Cancelled</span>
              )}
              {listMeta && !p.ghost && !listMeta[p.id] && (
                // A draft: "No project" on its own line under the name.
                <div style={{ marginTop: 3, lineHeight: "14px" }}>
                  <span className="tag-box" style={{ fontWeight: 800, letterSpacing: 0.5, color: "var(--muted)" }} title="This list isn't in any project (a draft)">No project</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, rowGap: 3, fontSize: 11, color: "var(--muted)" }}>
              {(p.productionHouse || p.producer) && (
                <span style={pairLine}>
                  {p.productionHouse && (
                    <span
                      onClick={(e) => attr(e, "productionHouse", p.productionHouse)}
                      title="Filter by this production house"
                      style={{ fontWeight: 700, letterSpacing: 0.3, color: "var(--text)", cursor: "pointer" }}
                    >
                      {p.productionHouse}
                    </span>
                  )}
                  {p.productionHouse && p.producer && " "}{p.producer && <span>{p.producer}</span>}
                </span>
              )}
              {(p.rentalHouse || p.gaffer) && (
                <span style={pairLine}>
                  {p.rentalHouse && (
                    <span
                      onClick={(e) => attr(e, "rentalHouse", p.rentalHouse)}
                      title="Filter by this rental house"
                      style={{ fontWeight: 700, letterSpacing: 0.3, color: "var(--text)", cursor: "pointer" }}
                    >
                      {p.rentalHouse}
                    </span>
                  )}
                  {p.rentalHouse && p.gaffer && " "}{p.gaffer && <span>{p.gaffer}</span>}
                </span>
              )}
            </div>
            {p.note && (
              <div
                title={p.note}
                style={{
                  fontSize: 10.5, color: "var(--muted2)", marginTop: 4,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}
              >
                {p.note.replace(/\s*\n+\s*/g, " · ")}
              </div>
            )}
            {/* The version and its list note, under the project note: one
                row, the note cut with "…" (the version and "N lists" stay). */}
            {(() => {
              const m = listMeta?.[p.id];
              const draftNote = listMeta && !p.ghost && !m ? p.listNote : "";
              if (draftNote) {
                return <div title={draftNote} style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4, ...oneLine }}>{draftNote}</div>;
              }
              if (!m || (m.count < 2 && !m.note)) return null;
              return (
                <div title={m.note || undefined} style={{ display: "flex", fontSize: 10.5, color: "var(--muted)", marginTop: 4, minWidth: 0, whiteSpace: "nowrap" }}>
                  <b style={{ color: "var(--accent)", flexShrink: 0 }}>V{m.v}</b>
                  {m.note && <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>&nbsp;· {m.note}</span>}
                  {m.count > 1 && <span style={{ color: "var(--muted2)", flexShrink: 0 }}>&nbsp;· {m.count} lists</span>}
                </div>
              );
            })()}
            {(() => {
              const locs = [...new Set((p.days || []).map((d) => d.location).filter(Boolean))];
              return locs.length > 0 ? (
                <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>{locs.join(" · ")}</div>
              ) : null;
            })()}
            {bodies.length > 0 && (
              <div title={bodies.join(" · ")} style={{ fontSize: 10.5, color: "var(--muted2)", marginTop: 5, ...oneLine }}>{bodies.join(" · ")}</div>
            )}
            {lenses.length > 0 && (
              <div title={lenses.join(" · ")} style={{ fontSize: 10.5, color: "var(--muted2)", marginTop: 2, ...oneLine }}>{lenses.join(" · ")}</div>
            )}
            {/* The card's foot: a warning about empty days at the left, the
                ⋮ menu in the bottom right corner. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 4, minWidth: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {emptyDays.length > 0 && emptyDays.length < (p.days || []).length && (
                  <div style={{ fontSize: 10.5, color: "var(--accent)" }} title="No items entered yet for these days">
                    ⚠ No items: {emptyDays.map((d) => d.label.replace("Day ", "D")).join(", ")}
                  </div>
                )}
              </div>
              {p.ghost ? (
                <span style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 700, color: "var(--muted)" }}>
                  <Plus size={12} /> List
                </span>
              ) : (
              <div data-card-menu style={{ position: "relative", flexShrink: 0, margin: "-6px -8px -8px 0" }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setMenuId((id) => (id === p.id ? null : p.id))}
                  title="More"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 6, display: "flex" }}
                >
                  <MoreVertical size={16} />
                </button>
                {menuId === p.id && (
                  <div className="m-pop m-up" style={{
                    position: "absolute", bottom: "100%", right: 0, zIndex: 30, minWidth: 150, padding: 4,
                    background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 4, boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
                  }}>
                    <MenuItem icon={<Pencil size={13} />} label={listMeta && !listMeta[p.id] ? "Edit list" : "Edit project"} onClick={() => { setMenuId(null); onEdit(p); }} />
                    <MenuItem icon={<Printer size={13} />} label="Preview" onClick={() => { setMenuId(null); onExport(p); }} />
                    <MenuItem icon={<Copy size={13} />} label="Duplicate" onClick={() => { setMenuId(null); onDuplicate(p.id); }} />
                    {listMeta && !listMeta[p.id] && onAddToProject && (
                      <MenuItem icon={<FolderInput size={13} />} label="Add to project…" onClick={() => { setMenuId(null); onAddToProject(p.id); }} />
                    )}
                    {listMeta?.[p.id] && onRemoveFromProject && (
                      <MenuItem icon={<FolderMinus size={13} />} label="Remove from project" onClick={() => { setMenuId(null); onRemoveFromProject(p.id); }} />
                    )}
                    <MenuItem icon={<Trash2 size={13} />} label={listOnly ? "Delete list" : "Delete"} danger onClick={() => { setMenuId(null); setConfirmId(p.id); }} />
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
    {confirmId && (() => {
      const target = projects.find((p) => p.id === confirmId);
      if (!target) return null;
      return (
        <div className="no-print m-overlay" style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16,
        }}>
          <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 340, padding: 22, border: "1px solid var(--border2)" }}>
            <div className="stencil" style={{ fontSize: 14, marginBottom: 10 }}>{listOnly ? "Delete Equipment List" : "Delete Project"}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
              {listOnly && listMeta?.[target.id]
                ? listMeta[target.id].count > 1
                  ? <>Delete V{listMeta[target.id].v} of "{target.name}"? The project and its other lists stay.</>
                  : <>Delete the equipment list for "{target.name}"? The project, its schedule and files stay in Projects.</>
                : target.name ? <>Delete "{target.name}"? This can't be undone.</> : <>Delete this untitled list? This can't be undone.</>}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmId(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: "var(--danger)", borderColor: "var(--danger)", color: "#FFFFFF" }}
                onClick={() => { onDelete(confirmId); setConfirmId(null); }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      );
    })()}
    </div>
  );
}

const oneLine = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
// A house and its person (Producer / Gaffer) stay together on one line,
// cut off with "…" when longer than the card.
const pairLine = { display: "block", minWidth: 0, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="pop-item"
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px",
        border: "none", borderRadius: 3, cursor: "pointer", textAlign: "left",
        fontFamily: "inherit", fontSize: 12, color: danger ? "var(--danger)" : "var(--text)",
      }}
    >
      {icon} {label}
    </button>
  );
}
