import { useState, useEffect } from "react";
import {
  Plus, Trash2, Pencil, Search, Printer, Copy, MoreVertical,
} from "lucide-react";
import { formatShootDateRange } from "../lib/utils.js";


export function ProjectListView({ projects, catalog, isFiltered, onOpen, onEdit, onExport, onDuplicate, onDelete, onFilterAttr, onCreateNew }) {
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
      .filter((c) => c && matchTest(c))
      .map((c) => c.name);
    return [...new Set(names)];
  }
  return (
    <>
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
            style={{ position: "relative", minWidth: 0, border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: 4, background: "var(--surface)", cursor: "pointer", padding: "8px 12px 12px", display: "flex", flexDirection: "column" }}
            onClick={() => onOpen(p.id)}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 3 }}>
              {p.tag && (
                <span
                  onClick={(e) => attr(e, "tag", p.tag)}
                  title="Filter by this tag"
                  style={{
                    fontWeight: 700, fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase",
                    color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 2, padding: "1px 4px",
                    cursor: "pointer", flexShrink: 0, marginRight: 4,
                  }}
                >
                  {p.tag}
                </span>
              )}
              <span
                onClick={(e) => attr(e, "name", p.name)}
                title="Filter by this project name"
                style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3, color: "var(--text)", textTransform: "uppercase", cursor: "pointer", marginRight: 4 }}
              >
                {p.name}
              </span>
              {formatShootDateRange(p.days) && (
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, color: "var(--muted2)" }}>{formatShootDateRange(p.days)}</span>
              )}
            </div>
            <div data-card-menu style={{ position: "relative", flexShrink: 0, margin: "-4px -8px 0 0" }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMenuId((id) => (id === p.id ? null : p.id))}
                title="More"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 6, display: "flex" }}
              >
                <MoreVertical size={16} />
              </button>
              {menuId === p.id && (
                <div style={{
                  position: "absolute", top: "100%", right: 0, zIndex: 30, minWidth: 170, padding: 4,
                  background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 4, boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
                }}>
                  <MenuItem icon={<Pencil size={14} />} label="Edit project" onClick={() => { setMenuId(null); onEdit(p); }} />
                  <MenuItem icon={<Printer size={14} />} label="Preview" onClick={() => { setMenuId(null); onExport(p); }} />
                  <MenuItem icon={<Copy size={14} />} label="Duplicate" onClick={() => { setMenuId(null); onDuplicate(p.id); }} />
                  <MenuItem icon={<Trash2 size={14} />} label="Delete" danger onClick={() => { setMenuId(null); setConfirmId(p.id); }} />
                </div>
              )}
            </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, rowGap: 3, fontSize: 11, color: "var(--muted)" }}>
              {(p.productionHouse || p.producer) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                  {p.productionHouse && (
                    <span
                      onClick={(e) => attr(e, "productionHouse", p.productionHouse)}
                      title="Filter by this production house"
                      style={{ fontWeight: 700, letterSpacing: 0.3, color: "var(--text)", cursor: "pointer" }}
                    >
                      {p.productionHouse}
                    </span>
                  )}
                  {p.producer && <span>{p.producer}</span>}
                </span>
              )}
              {(p.rentalHouse || p.gaffer) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                  {p.rentalHouse && (
                    <span
                      onClick={(e) => attr(e, "rentalHouse", p.rentalHouse)}
                      title="Filter by this rental house"
                      style={{ fontWeight: 700, letterSpacing: 0.3, color: "var(--text)", cursor: "pointer" }}
                    >
                      {p.rentalHouse}
                    </span>
                  )}
                  {p.gaffer && <span>{p.gaffer}</span>}
                </span>
              )}
            </div>
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
            {p.note && (
              <div
                title={p.note}
                style={{
                  fontSize: 10.5, color: "var(--muted2)", marginTop: 2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}
              >
                {p.note.replace(/\s*\n+\s*/g, " · ")}
              </div>
            )}
            {emptyDays.length > 0 && emptyDays.length < (p.days || []).length && (
              <div style={{ fontSize: 10.5, color: "var(--accent)", marginTop: 4 }} title="No items entered yet for these days">
                ⚠ No items: {emptyDays.map((d) => d.label.replace("Day ", "D")).join(", ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
    {confirmId && (() => {
      const target = projects.find((p) => p.id === confirmId);
      if (!target) return null;
      return (
        <div className="no-print" style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16,
        }}>
          <div style={{ background: "var(--surface)", borderRadius: 6, width: "100%", maxWidth: 340, padding: 22, border: "1px solid var(--border2)" }}>
            <div className="stencil" style={{ fontSize: 14, marginBottom: 10 }}>Delete Project</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
              Delete "{target.name}"? This can't be undone.
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
    </>
  );
}

const oneLine = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="pop-item"
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px",
        border: "none", borderRadius: 3, cursor: "pointer", textAlign: "left",
        fontFamily: "inherit", fontSize: 13, color: danger ? "var(--danger)" : "var(--text)",
      }}
    >
      {icon} {label}
    </button>
  );
}
