import { useEffect, useMemo, useState } from "react";
import { Section } from "../shared/ui.jsx";
import { monthKey, todayStr, wdm } from "../shared/dates.js";
import { typeOf, shootTypeId } from "../schedule/stepTypes.js";
import { occurrences } from "../schedule/steps.js";
import { MonthGrid, MonthHeader, MonthKey } from "../calendar/MonthGrid.jsx";
import { ScheduleSection } from "../schedule/ScheduleSection.jsx";
import { InfoStrip } from "./InfoStrip.jsx";
import { EquipmentPanel } from "./EquipmentPanel.jsx";
import { ProjectForm } from "../shared/ProjectForm.jsx";
import { listLike } from "./sync.js";
import { Trash2 } from "lucide-react";

// Which month the project's calendar opens on: the month of its next
// step from today, else its last one, else this month.
function startMonth(project) {
  const today = todayStr();
  const dates = (project.steps || []).flatMap((s) => [s.start, s.end]).filter(Boolean).sort();
  return monthKey(dates.find((d) => d >= today) || dates[dates.length - 1] || today);
}

export function ProjectPage({ app, id, project, allProjects, types, actions, intent, onManageTypes }) {
  const [showInfo, setShowInfo] = useState(false); // the shared Edit Project window
  const [creatingList, setCreatingList] = useState(false); // Create New, prefilled
  const [month, setMonth] = useState(() => startMonth(project));
  const [selDate, setSelDate] = useState(null);
  const list = actions.listOf(id);
  const update = (patch) => actions.update(id, (p) => ({ ...p, ...patch }));

  // The header's "Edit project" button.
  useEffect(() => {
    if (intent === "edit") setShowInfo(true);
  }, [intent, app.route.t]);

  const occ = useMemo(() => occurrences(allProjects), [allProjects]);
  const onSel = selDate ? occ.filter((o) => o.date === selDate) : [];

  return (
    <div>
      <InfoStrip
        project={project}
        onEditInfo={() => setShowInfo(true)}
        onPeopleChange={(people) => update({ people })}
        onNotesChange={(notes) => update({ notes })}
      />

      <Section title="Calendar">
        <MonthHeader month={month} onChange={(m) => { setMonth(m); setSelDate(null); }} />
        <MonthGrid month={month} occ={occ} types={types} focusProjectId={id} compact selected={selDate} onSelect={setSelDate} />
        <div style={{ marginTop: 6 }}>
          <MonthKey month={month} occ={occ} types={types} focusProjectId={id} />
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
        onChange={(steps) => {
          // Shoot days are what a project is built on (and its equipment
          // list's days), so every project keeps at least one.
          if (!steps.some((s) => s.typeId === shootTypeId(types)) && (project.steps || []).some((s) => s.typeId === shootTypeId(types))) {
            window.alert("Every project needs at least one shoot day — keep at least one Shooting step.");
            return;
          }
          update({ steps });
        }}
        labels={app.recentProjectLabels}
        onManageTypes={onManageTypes}
        highlightDate={selDate}
      />

      <EquipmentPanel
        app={app}
        list={list}
        hasShootSteps={(project.steps || []).some((s) => s.typeId === shootTypeId(types))}
        onCreate={() => setCreatingList(true)}
      />

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 6 }}>
        <button
          className="btn btn-ghost"
          style={{ padding: "3px 8px", fontSize: 11, color: "var(--danger)" }}
          onClick={() => {
            const msg = list
              ? `Delete "${project.name}" — its schedule, people and its equipment list? This can't be undone.`
              : `Delete "${project.name}" — its schedule and people? This can't be undone.`;
            if (!window.confirm(msg)) return;
            actions.remove(id);
            app.go({ screen: "projects" });
          }}
        >
          <Trash2 size={12} /> Delete project
        </button>
      </div>

      {creatingList && (
        // The equipment list composer's own Create New, starting from this
        // Project's info and Shooting days (template and quantities too).
        <ProjectForm
          app={app}
          prefill={listLike(id, project, types)}
          onClose={() => setCreatingList(false)}
          onSave={(data) => { setCreatingList(false); app.createEquipmentList(id, data); }}
        />
      )}

      {showInfo && (list ? (
        // With a list: exactly the equipment list's Edit Project (the link
        // then brings any change back into this Project).
        <ProjectForm
          app={app}
          initial={list}
          onSaveAsTemplate={(name) => app.saveAsTemplate(id, name)}
          onClose={() => setShowInfo(false)}
          onSave={(data) => { app.updateEquipmentList(id, data); setShowInfo(false); }}
        />
      ) : (
        <ProjectForm
          app={app}
          noList
          initial={listLike(id, project, types)}
          onClose={() => setShowInfo(false)}
          onSave={(info) => { actions.editInfo(id, info); setShowInfo(false); }}
        />
      ))}
    </div>
  );
}
