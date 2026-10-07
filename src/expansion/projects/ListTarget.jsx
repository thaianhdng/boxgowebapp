import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "../shared/ui.jsx";
import { todayStr } from "../shared/dates.js";
import { formatShootDateRange } from "../../lib/utils.js";
import { shootDates, statusInfo, statusOf } from "./status.js";
import { MAX_VERSIONS, listLike } from "./sync.js";

// Where an equipment list goes: this list's own project (as its next
// version), another project, a new project, or no project (a draft).
//   mode "duplicate": a copy of `listId` → this project / another / none
//   mode "create":    a new list (Create New) → draft / new project / existing
//   mode "attach":    a draft list joins → new project / existing
// onPick gets { projectId } (an existing project; `prefill` too when
// creating), { newProject: true }, or null for no project.
const COPY = {
  duplicate: { title: "Duplicate list", go: "Duplicate" },
  create: { title: "New equipment list", go: "Continue" },
  attach: { title: "Add to a project", go: "Add" },
};

export function ListTarget({ mode, listId, projects, types, actions, onPick, onClose }) {
  const today = todayStr();
  const ownProjectId = listId ? Object.keys(projects).find((pid) => actions.versionsOf(pid).some((v) => v.id === listId)) : null;
  const countOf = (pid) => actions.versionsOf(pid).length;
  const ownFull = ownProjectId && countOf(ownProjectId) >= MAX_VERSIONS;
  const choices = mode === "duplicate"
    ? [ownProjectId && ["same", ownFull ? "This project" : `This project, as V${nextV(projects[ownProjectId], actions, ownProjectId)}`, ownFull ? `It has ${MAX_VERSIONS} lists, the most a project can have.` : ""], ["other", "Another project"], ["none", "Draft list (no project)"]]
    : mode === "create"
      ? [["none", "Draft list (no project)"], ["new", "Create new project"], ["other", "Add to existing project"]]
      : [["new", "Create new project"], ["other", "Add to existing project"]];
  const usable = choices.filter(Boolean);
  const [choice, setChoice] = useState(usable.find((c) => !(c[0] === "same" && ownFull))[0]);
  const [pick, setPick] = useState(null);
  const [q, setQ] = useState("");

  // Projects to pick from: upcoming and shooting ones soonest first, then
  // done ones most recent first. Cancelled ones and this list's own
  // project are left out.
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return Object.entries(projects)
      .filter(([pid]) => pid !== ownProjectId)
      .map(([pid, p]) => ({ pid, p, status: statusOf(p, types, today), dates: shootDates(p, types) }))
      .filter((r) => r.status !== "cancelled")
      .filter((r) => !query || [r.p.name, r.p.tag, r.p.productionHouse, r.p.rentalHouse].some((v) => (v || "").toLowerCase().includes(query)))
      .sort((a, b) => {
        const da = a.status === "done", db = b.status === "done";
        if (da !== db) return da ? 1 : -1;
        const fa = a.dates[0] || "", fb = b.dates[0] || "";
        return da ? fb.localeCompare(fa) : fa.localeCompare(fb);
      });
  }, [projects, q, types, today, ownProjectId]);

  const ready = choice !== "other" || pick;
  function go() {
    if (!ready) return;
    if (choice === "none") return onPick(null);
    if (choice === "new") return onPick({ newProject: true });
    if (choice === "same") return onPick({ projectId: ownProjectId });
    onPick({ projectId: pick, ...(mode === "create" ? { prefill: listLike(pick, projects[pick], types) } : {}) });
  }

  return (
    <Modal
      title={COPY[mode].title}
      onClose={onClose}
      footer={<>
        <span />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!ready} style={{ opacity: ready ? 1 : 0.5 }} onClick={go}>{COPY[mode].go}</button>
        </div>
      </>}
    >
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
        {mode === "duplicate" ? "Where should the copy go?" : mode === "create" ? "Which project is this list for?" : "Which project should this list join?"}
        {" "}A project can have up to {MAX_VERSIONS} lists (V1, V2…).
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {usable.map(([id, label, why]) => {
          const off = id === "same" && ownFull;
          return (
            <button
              key={id}
              type="button"
              disabled={off}
              onClick={() => setChoice(id)}
              style={{
                textAlign: "left", padding: "8px 10px", borderRadius: 4, fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                cursor: off ? "default" : "pointer", opacity: off ? 0.5 : 1,
                border: `1px solid ${choice === id ? "var(--accent)" : "var(--border2)"}`,
                background: choice === id ? "var(--surface2)" : "transparent", color: "var(--text)",
              }}
            >
              <span style={{ color: choice === id ? "var(--accent)" : "var(--muted2)", marginRight: 8 }}>{choice === id ? "●" : "○"}</span>
              {label}
              {why && <div style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)", marginTop: 2 }}>{why}</div>}
            </button>
          );
        })}
      </div>
      {choice === "other" && (
        <div style={{ marginTop: 12 }}>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <Search size={14} style={{ position: "absolute", left: 9, top: 9, color: "var(--muted)" }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" style={{ width: "100%", paddingLeft: 30, fontSize: 13 }} />
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 4 }}>
            {rows.length === 0 && <div style={{ padding: 12, fontSize: 12, color: "var(--muted)" }}>No projects match.</div>}
            {rows.map(({ pid, p, status, dates }) => {
              const n = countOf(pid);
              const full = n >= MAX_VERSIONS;
              return (
                <button
                  key={pid}
                  type="button"
                  disabled={full}
                  onClick={() => setPick(pid)}
                  style={{
                    display: "flex", alignItems: "baseline", gap: 6, width: "100%", textAlign: "left", padding: "7px 10px",
                    border: "none", borderBottom: "1px solid var(--border)", borderLeft: `3px solid ${statusInfo(status).color}`,
                    background: pick === pid ? "var(--surface2)" : "transparent", fontFamily: "inherit", fontSize: 12,
                    color: "var(--text)", cursor: full ? "default" : "pointer", opacity: full ? 0.45 : 1,
                  }}
                >
                  {p.tag && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>{p.tag}</span>}
                  <span style={{ fontWeight: 700, textTransform: "uppercase", minWidth: 0, flex: 1, overflowWrap: "anywhere", color: pick === pid ? "var(--accent)" : "var(--text)" }}>{p.name || "Untitled"}</span>
                  <span style={{ fontSize: 11, color: "var(--muted2)", flexShrink: 0, whiteSpace: "nowrap" }}>
                    {formatShootDateRange(dates.map((date) => ({ date })))}
                    {full ? ` · ${MAX_VERSIONS} lists, full` : n ? ` · ${n} list${n > 1 ? "s" : ""}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

// The number the next version of a project gets (numbers aren't reused).
export function nextV(project, actions, pid) {
  const shown = actions.versionsOf(pid);
  const saved = Array.isArray(project?.lists) ? project.lists : shown;
  return saved.reduce((m, l) => Math.max(m, l.v || 0), 0) + 1;
}
