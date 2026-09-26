import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { Section } from "../shared/ui.jsx";
import { monthKey, todayStr, wdm } from "../shared/dates.js";
import { typeOf, shootTypeId } from "../schedule/stepTypes.js";
import { occurrences } from "../schedule/steps.js";
import { MonthGrid, MonthHeader } from "../calendar/MonthGrid.jsx";
import { ScheduleSection } from "../schedule/ScheduleSection.jsx";
import { PeopleSection } from "./PeopleSection.jsx";
import { EquipmentPanel } from "./EquipmentPanel.jsx";
import { ProjectInfoModal } from "./ProjectInfoModal.jsx";

// Which month the project's calendar opens on: the month of its next
// step from today, else its last one, else this month.
function startMonth(project) {
  const today = todayStr();
  const dates = (project.steps || []).flatMap((s) => [s.start, s.end]).filter(Boolean).sort();
  return monthKey(dates.find((d) => d >= today) || dates[dates.length - 1] || today);
}

export function ProjectPage({ app, id, project, allProjects, types, actions, intent, onManageTypes }) {
  const [showInfo, setShowInfo] = useState(false);
  const [month, setMonth] = useState(() => startMonth(project));
  const [selDate, setSelDate] = useState(null);
  const noteRef = useRef(null);
  const list = actions.listOf(id);
  const update = (patch) => actions.update(id, (p) => ({ ...p, ...patch }));

  const occ = useMemo(() => occurrences(allProjects), [allProjects]);
  const onSel = selDate ? occ.filter((o) => o.date === selDate) : [];

  useEffect(() => {
    const el = noteRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
  }, [project.notes]);

  return (
    <div>
      <button className="btn btn-ghost" style={{ padding: "3px 8px", fontSize: 11, marginBottom: 14 }} onClick={() => app.go({ screen: "projects" })}>
        <ArrowLeft size={12} /> Projects
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {project.tag && (
            <span style={{ fontWeight: 700, fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 2, padding: "1px 4px", marginRight: 6 }}>{project.tag}</span>
          )}
          <div className="stencil" style={{ fontSize: 20, lineHeight: 1.2, color: "var(--text)", overflowWrap: "anywhere", marginTop: project.tag ? 4 : 0 }}>{project.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
            {[project.productionHouse, project.rentalHouse].filter(Boolean).join(" · ") || "No houses set"}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowInfo(true)}><Pencil size={13} /> Edit</button>
      </div>

      <textarea
        ref={noteRef}
        value={project.notes || ""}
        onChange={(e) => update({ notes: e.target.value })}
        placeholder="Project notes…"
        rows={1}
        style={{ width: "100%", resize: "none", overflow: "hidden", fontSize: 13, padding: "6px 0", marginBottom: 18, border: "none", borderBottom: "1px solid var(--border)", borderRadius: 0, background: "none" }}
      />

      <Section title="Calendar">
        <MonthHeader month={month} onChange={(m) => { setMonth(m); setSelDate(null); }} />
        <MonthGrid month={month} occ={occ} types={types} focusProjectId={id} compact selected={selDate} onSelect={setSelDate} />
        <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 6 }}>
          Faded = tentative · grey dot = another project that day · red dot = clash
        </div>
        {selDate && (
          <div style={{ marginTop: 10, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 4 }}>
            <div className="stencil" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{wdm(selDate)}</div>
            {onSel.length === 0 && <div style={{ fontSize: 12, color: "var(--muted2)" }}>Nothing scheduled.</div>}
            {onSel.map((o, i) => {
              const t = typeOf(types, o.step.typeId);
              const mine = o.projectId === id;
              return (
                <div
                  key={i}
                  onClick={() => !mine && app.go({ screen: "project", projectId: o.projectId })}
                  style={{ fontSize: 12.5, display: "flex", gap: 6, alignItems: "center", padding: "2px 0", cursor: mine ? "default" : "pointer", opacity: o.step.confirmed ? 1 : 0.55 }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: mine ? t.color : "var(--muted2)", flexShrink: 0 }} />
                  <b style={{ color: mine ? t.color : "var(--muted)" }}>{t.name}</b>
                  <span style={{ color: mine ? "var(--text)" : "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {mine ? (o.step.time || "") : o.project.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <ScheduleSection
        steps={project.steps}
        types={types}
        onChange={(steps) => update({ steps })}
        onManageTypes={onManageTypes}
        openShootStep={intent === "addShoot" ? app.route.t : null}
        highlightDate={selDate}
      />

      <EquipmentPanel
        app={app}
        list={list}
        hasShootSteps={(project.steps || []).some((s) => s.typeId === shootTypeId(types))}
        onCreate={(templateId) => actions.createList(id, project, templateId)}
      />

      <PeopleSection people={project.people} onChange={(people) => update({ people })} />

      {showInfo && (
        <ProjectInfoModal
          initial={project}
          app={app}
          onClose={() => setShowInfo(false)}
          onSave={(info) => { update(info); app.addHouses(info); setShowInfo(false); }}
          onDelete={() => {
            const msg = list
              ? `Delete "${project.name}" — its schedule, people and its equipment list?`
              : `Delete "${project.name}" — its schedule and people?`;
            if (!window.confirm(msg)) return;
            setShowInfo(false);
            actions.remove(id);
            app.go({ screen: "projects" });
          }}
        />
      )}
    </div>
  );
}
