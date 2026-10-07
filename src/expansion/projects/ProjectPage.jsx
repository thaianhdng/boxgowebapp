import { useEffect, useMemo, useState } from "react";
import { Section, Toggle } from "../shared/ui.jsx";
import { monthKey, todayStr, wdm } from "../shared/dates.js";
import { typeOf, shootTypeId } from "../schedule/eventTypes.js";
import { isTentative, occurrences } from "../schedule/events.js";
import { MonthGrid, MonthHeader, MonthKey } from "../calendar/MonthGrid.jsx";
import { ScheduleSection } from "../schedule/ScheduleSection.jsx";
import { InfoStrip } from "./InfoStrip.jsx";
import { EquipmentPanel } from "./EquipmentPanel.jsx";
import { ProjectForm } from "../shared/ProjectForm.jsx";
import { listLike } from "./sync.js";
import { SET_STATUSES, setStatus, staleSoftLock, statusInfo, statusOf } from "./status.js";
import { FilesSection } from "../files/FilesSection.jsx";
import { ListTarget, nextV } from "./ListTarget.jsx";
import { Modal } from "../shared/ui.jsx";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

// Jump bar at the top of the page: each section of the job.
const JUMPS = [["Calendar", "x-calendar"], ["Schedule", "x-schedule"], ["Equipment", "x-equipment"], ["Files", "x-files"]];

// The project's calendar starts open; folding it is remembered on this
// device.
const CAL_KEY = "boxgo-x-project-calendar";
function readCalOpen() {
  try { return localStorage.getItem(CAL_KEY) !== "closed"; } catch { return true; }
}

// Soft lock / Confirmed / Cancelled, set here; a Confirmed project shows
// Shooting during its shoot days and Done after them.
function StatusBar({ project, types, onChange }) {
  const set = setStatus(project, types);
  const shown = statusOf(project, types);
  const auto = shown !== set && statusInfo(shown);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="stencil" style={{ fontSize: 11, color: "var(--muted)" }}>Status</span>
        <Toggle
          options={SET_STATUSES.map((id) => [id, statusInfo(id).name])}
          value={set}
          onChange={onChange}
          style={{ flex: "0 1 340px", minWidth: 0 }}
        />
        {auto && (
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: auto.color }}>
            {auto.id === "shooting" ? "● Shooting now" : "✓ Done"}
          </span>
        )}
      </div>
      {staleSoftLock(project, types) && (
        <div style={{ fontSize: 11.5, color: "var(--accent)", marginTop: 6 }}>⚠ Its shoot dates have passed: confirm or cancel it?</div>
      )}
    </div>
  );
}

// Which month the project's calendar opens on: the month of its next
// event from today, else its last one, else this month.
function startMonth(project) {
  const today = todayStr();
  const dates = (project.events || []).flatMap((s) => [s.start, s.end]).filter(Boolean).sort();
  return monthKey(dates.find((d) => d >= today) || dates[dates.length - 1] || today);
}

export function ProjectPage({ app, id, project, allProjects, types, actions, intent }) {
  const [showInfo, setShowInfo] = useState(false); // the shared Edit Project window
  const [creatingList, setCreatingList] = useState(false); // Create New, prefilled
  const [month, setMonth] = useState(() => startMonth(project));
  const [selDate, setSelDate] = useState(null);
  const [calOpen, setCalOpenState] = useState(readCalOpen);
  const setCalOpen = (open) => {
    setCalOpenState(open);
    if (!open) setSelDate(null);
    try { localStorage.setItem(CAL_KEY, open ? "open" : "closed"); } catch { /* ignore */ }
  };
  // Opens the schedule's event window from the calendar to edit an event:
  // { event, n } (`n` so the same request can repeat).
  const [eventRequest, setEventRequest] = useState(null);
  // The project's equipment lists (versions); the current one is what the
  // Edit project window edits (every version shares those details).
  const versions = actions.versionsOf(id);
  const list = actions.currentListOf(id);
  const [duplicating, setDuplicating] = useState(null); // list id
  const [deleting, setDeleting] = useState(false);
  const update = (patch) => actions.update(id, (p) => ({ ...p, ...patch }));

  // The header's "Edit project" button, and a card's paperclip (opens
  // the page at its Files).
  useEffect(() => {
    // One-shot: cleared once used, so returning from Preview doesn't
    // open the window again.
    if (intent === "edit") { setShowInfo(true); app.clearIntent(); }
    if (intent === "files") {
      app.clearIntent();
      // After the page has drawn, so it lands in place.
      requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById("x-files")?.scrollIntoView({ block: "start" })));
    }
  }, [intent, app.route.t]);

  // Other projects' events show greyed in this calendar, except cancelled ones.
  const occ = useMemo(() => occurrences(
    Object.fromEntries(Object.entries(allProjects).filter(([pid, p]) => pid === id || statusOf(p, types) !== "cancelled")),
    types,
  ), [allProjects, types, id]);

  const changeStatus = (status) => update({ status });
  const onSel = selDate ? occ.filter((o) => o.date === selDate) : [];

  return (
    <div>
      {/* Stays at the top of the screen while scrolling. */}
      <div className="x-jump sticky-top" style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--bg)", display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
        {JUMPS.map(([label, target]) => (
          <button
            key={target}
            type="button"
            className="stencil"
            onClick={() => {
              if (target === "x-calendar" && !calOpen) setCalOpen(true);
              // After an opened calendar has drawn, so it lands in place.
              requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }));
            }}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 10.5, letterSpacing: "0.06em", color: "var(--muted)" }}
          >
            {label}
          </button>
        ))}
      </div>

      <StatusBar project={project} types={types} onChange={changeStatus} />

      <InfoStrip
        project={project}
        onEditInfo={() => setShowInfo(true)}
        onNotesChange={(notes) => update({ notes })}
      />

      <Section
        title="Calendar"
        id="x-calendar"
        right={
          <button className="btn btn-ghost" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => setCalOpen(!calOpen)}>
            {calOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {calOpen ? "Hide" : "Show"}
          </button>
        }
      >
        {calOpen && (<>
        <MonthHeader month={month} onChange={(m) => { setMonth(m); setSelDate(null); }} />
        <MonthGrid month={month} occ={occ} types={types} focusProjectId={id} compact selected={selDate} onSelect={setSelDate} />
        <div style={{ marginTop: 6 }}>
          <MonthKey month={month} occ={occ} types={types} focusProjectId={id} />
        </div>
        {selDate && (
          // The tapped day: this project's events (tap to edit) and other
          // projects that day. Schedule's + Add event then starts on it.
          <div style={{ marginTop: 10, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 4 }}>
            <div className="stencil" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{wdm(selDate)}</div>
            {onSel.length === 0 && <div style={{ fontSize: 12, color: "var(--muted2)" }}>Nothing scheduled.</div>}
            {onSel.map((o, i) => {
              const t = typeOf(types, o.event.typeId);
              const mine = o.projectId === id;
              return (
                <div
                  key={i}
                  className="row"
                  onClick={() => (mine ? setEventRequest({ event: o.event, n: Date.now() }) : app.go({ screen: "project", projectId: o.projectId, from: app.route.from }))}
                  style={{ fontSize: 12.5, display: "flex", gap: 6, alignItems: "center", padding: "4px 2px", cursor: "pointer", opacity: o.tentative ? 0.55 : 1 }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: mine ? t.color : "var(--muted2)", flexShrink: 0 }} />
                  <b style={{ color: mine ? t.color : "var(--muted)", flexShrink: 0 }}>{t.name}</b>
                  <span style={{ color: mine ? "var(--text)" : "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {mine ? [o.event.label, o.event.time, o.event.location].filter(Boolean).join(" · ") : o.project.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        </>)}
      </Section>

      <ScheduleSection
        events={project.events}
        types={types}
        onChange={(events) => {
          // Shoot days are what a project is built on (and its equipment
          // list's days), so every project keeps at least one.
          if (!events.some((s) => s.typeId === shootTypeId(types)) && (project.events || []).some((s) => s.typeId === shootTypeId(types))) {
            window.alert("Every project needs at least one shoot day — keep at least one.");
            return;
          }
          update({ events });
        }}
        request={eventRequest}
        onEditShootDays={() => setShowInfo(true)}
        tentative={isTentative(project, types)}
        highlightDate={selDate}
      />

      <EquipmentPanel
        app={app}
        versions={versions}
        currentId={list?.id}
        hasShootEvents={(project.events || []).some((s) => s.typeId === shootTypeId(types))}
        onCreate={() => setCreatingList(true)}
        onDuplicate={setDuplicating}
        onSetCurrent={(listId) => actions.setCurrent(id, listId)}
        onSetNote={(listId, note) => actions.setNote(listId, note)}
        onRemove={(listId) => actions.unlink(listId)}
        onDelete={(listId, v) => {
          if (window.confirm(`Delete V${v} of "${project.name}"? Its equipment and quantities go; the project${versions.length > 1 ? " and its other lists" : ""} stay.`)) app.deleteEquipmentList(listId);
        }}
      />

      <FilesSection files={project.files} onChange={(files) => update({ files })} />

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 6 }}>
        <button
          className="btn btn-ghost"
          style={{ padding: "3px 8px", fontSize: 11, color: "var(--danger)" }}
          onClick={() => {
            if (versions.length) { setDeleting(true); return; }
            if (!window.confirm(`Delete "${project.name}" — its schedule and files? This can't be undone.`)) return;
            actions.remove(id);
            app.go({ screen: app.route.from === "calendar" ? "calendar" : "projects" });
          }}
        >
          <Trash2 size={12} /> Delete project
        </button>
      </div>

      {deleting && (
        // With equipment lists: delete them too, or keep them as drafts.
        <Modal title="Delete project" onClose={() => setDeleting(false)} maxWidth={380}>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
            Delete "{project.name}" — its schedule and files? This can't be undone.
            It has {versions.length} equipment list{versions.length > 1 ? "s" : ""}: delete {versions.length > 1 ? "them" : "it"} too, or keep {versions.length > 1 ? "them" : "it"} in Equipment as {versions.length > 1 ? "drafts" : "a draft"} (no project)?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[[false, `Delete the project and ${versions.length > 1 ? `its ${versions.length} lists` : "its list"}`], [true, `Delete the project, keep ${versions.length > 1 ? "the lists" : "the list"}`]].map(([keepLists, text]) => (
              <button
                key={String(keepLists)}
                className="btn btn-primary"
                style={{ justifyContent: "center", ...(keepLists ? {} : { background: "var(--danger)", borderColor: "var(--danger)", color: "#FFFFFF" }) }}
                onClick={() => {
                  setDeleting(false);
                  actions.remove(id, { keepLists });
                  app.go({ screen: app.route.from === "calendar" ? "calendar" : "projects" });
                }}
              >
                {text}
              </button>
            ))}
            <button className="btn btn-ghost" style={{ justifyContent: "center" }} onClick={() => setDeleting(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      {duplicating && (
        <ListTarget
          mode="duplicate"
          listId={duplicating}
          projects={allProjects}
          types={types}
          actions={actions}
          onClose={() => setDuplicating(null)}
          onPick={(t) => { const from = duplicating; setDuplicating(null); app.duplicateEquipmentList(from, t); }}
        />
      )}

      {creatingList && (
        // The equipment list composer's own Create New, starting from this
        // Project's info and Shooting days (template and quantities too).
        <ProjectForm
          app={app}
          prefill={listLike(id, project, types)}
          heading={versions.length ? `New version · V${nextV(project, actions, id)}` : "New equipment list"}
          saveLabel="Create list"
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
