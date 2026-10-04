import { eachDay } from "../shared/dates.js";

// A step: { id, typeId, start, end, time, endTime, mode: "offline"|"online",
//           location, link, note, confirmed }
// `end` is "" for a single-day step.

// Steps are ordered by date, then time (all-day first), then the order of
// step types in the Step types list (so Prelight comes before Shooting on
// the same day), then the order they were added. No date sorts last.
function typeRank(types) {
  const rank = new Map((types || []).map((t, i) => [t.id, i]));
  return (typeId) => (rank.has(typeId) ? rank.get(typeId) : 999);
}

export function compareSteps(a, b, types, dateA = a.start, dateB = b.start) {
  const rank = typeRank(types);
  return (dateA || "9999-99-99").localeCompare(dateB || "9999-99-99") ||
    (a.time || "").localeCompare(b.time || "") ||
    rank(a.typeId) - rank(b.typeId);
}

export function sortSteps(steps, types) {
  return [...(steps || [])].sort((a, b) => compareSteps(a, b, types));
}

export function stepDays(step) {
  return eachDay(step.start, step.end);
}

// Every step of every project, one entry per calendar day it covers:
// { date, step, project, projectId, dayIndex, dayCount }
export function occurrences(projectsById, types) {
  const out = [];
  for (const [projectId, project] of Object.entries(projectsById)) {
    for (const step of project.steps || []) {
      const days = stepDays(step);
      days.forEach((date, i) => out.push({ date, step, project, projectId, dayIndex: i, dayCount: days.length }));
    }
  }
  return out.sort((a, b) => compareSteps(a.step, b.step, types, a.date, b.date));
}

// Date span of a project's dated steps: { first, last } or null.
export function projectSpan(project) {
  const dates = (project.steps || []).flatMap(stepDays).sort();
  return dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null;
}
