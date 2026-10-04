import { eachDay } from "../shared/dates.js";

// An event: { id, typeId, start, end, time, endTime, mode: "offline"|"online",
//           location, link, note, confirmed }
// `end` is "" for a single-day event.

// Events are ordered by date, then time (all-day first), then the order of
// event types in the Event types list (so Prelight comes before Shooting on
// the same day), then the order they were added. No date sorts last.
function typeRank(types) {
  const rank = new Map((types || []).map((t, i) => [t.id, i]));
  return (typeId) => (rank.has(typeId) ? rank.get(typeId) : 999);
}

export function compareEvents(a, b, types, dateA = a.start, dateB = b.start) {
  const rank = typeRank(types);
  return (dateA || "9999-99-99").localeCompare(dateB || "9999-99-99") ||
    (a.time || "").localeCompare(b.time || "") ||
    rank(a.typeId) - rank(b.typeId);
}

export function sortEvents(events, types) {
  return [...(events || [])].sort((a, b) => compareEvents(a, b, types));
}

export function eventDays(event) {
  return eachDay(event.start, event.end);
}

// Every event of every project, one entry per calendar day it covers:
// { date, event, project, projectId, dayIndex, dayCount }
export function occurrences(projectsById, types) {
  const out = [];
  for (const [projectId, project] of Object.entries(projectsById)) {
    for (const event of project.events || []) {
      const days = eventDays(event);
      days.forEach((date, i) => out.push({ date, event, project, projectId, dayIndex: i, dayCount: days.length }));
    }
  }
  return out.sort((a, b) => compareEvents(a.event, b.event, types, a.date, b.date));
}

// Date span of a project's dated events: { first, last } or null.
export function projectSpan(project) {
  const dates = (project.events || []).flatMap(eventDays).sort();
  return dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null;
}
