import { useEffect, useState } from "react";
import { CheckCheck, Palette, Plus } from "lucide-react";
import { Section, smallBtn } from "../shared/ui.jsx";
import { typeOf, shootTypeId } from "./eventTypes.js";
import { sortEvents } from "./events.js";
import { EventRow } from "./EventRow.jsx";
import { EventModal, newEvent } from "./EventModal.jsx";

// Shoot days are listed here but changed in the project's Edit window
// (onEditShootDays); their Tentative / Confirmed switch works here.
export function ScheduleSection({ events, types, request, onChange, onManageTypes, onEditShootDays, highlightDate }) {
  const [editing, setEditing] = useState(null); // { event, isNew }
  const list = events || [];

  // From the project's calendar: edit an event tapped there.
  useEffect(() => {
    if (!request) return;
    const cur = list.find((s) => s.id === request.event.id);
    if (cur) openEvent(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.n]);
  const tentative = list.filter((s) => !s.confirmed).length;
  const shootId = shootTypeId(types);
  const sorted = sortEvents(list, types);
  // Shoot days numbered D1, D2… in date order, as in the equipment list.
  const dayNo = new Map(sorted.filter((s) => s.typeId === shootId).map((s, i) => [s.id, i + 1]));
  const lit = (s) => highlightDate && s.start && s.start <= highlightDate && (s.end || s.start) >= highlightDate;

  // The event window returns an array (a Shooting range gives one per date).
  function save(saved) {
    onChange(editing.isNew ? [...list, ...saved] : list.flatMap((s) => (s.id === editing.event.id ? saved : [s])));
    setEditing(null);
  }
  const openEvent = (s) => (s.typeId === shootId ? onEditShootDays() : setEditing({ isNew: false, event: s }));
  const setConfirmed = (ids, confirmed) => onChange(list.map((x) => (ids.includes(x.id) ? { ...x, confirmed } : x)));

  const row = (s, dayLabel) => (
    <div key={s.id} style={{ background: lit(s) ? "var(--surface2)" : "transparent" }}>
      <EventRow
        event={s}
        type={typeOf(types, s.typeId)}
        dayLabel={dayLabel}
        onClick={() => openEvent(s)}
        onToggleConfirmed={() => setConfirmed([s.id], !s.confirmed)}
      />
    </div>
  );

  const items = sorted.map((s) => row(s, dayNo.has(s.id) ? `D${dayNo.get(s.id)}` : ""));

  return (
    <Section
      id="x-schedule"
      title="Schedule"
      right={
        <>
          {tentative > 0 && (
            <button className="btn btn-ghost" style={smallBtn} onClick={() => onChange(list.map((s) => ({ ...s, confirmed: true })))}>
              <CheckCheck size={12} /> Confirm all
            </button>
          )}
          <button className="btn btn-ghost" style={smallBtn} onClick={onManageTypes} title="Event types and colours" aria-label="Event types"><Palette size={12} /></button>
          <button className="btn btn-primary" style={smallBtn} onClick={() => setEditing({ isNew: true, event: highlightDate ? newEvent("", highlightDate) : newEvent("") })} title={highlightDate ? "Add an event on the day picked in the calendar" : "Add an event"}><Plus size={12} /> Add event</button>
        </>
      }
    >
      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--muted2)" }}>No events yet — tap + Add event.</div>
      ) : (
        <div style={{ borderTop: "1px solid var(--border)" }}>{items}</div>
      )}
      {editing && (
        <EventModal
          initial={editing.event}
          isNew={editing.isNew}
          types={types}
          onSave={save}
          onDelete={() => { onChange(list.filter((s) => s.id !== editing.event.id)); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}
    </Section>
  );
}
