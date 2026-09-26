import { eachDay } from "../shared/dates.js";

// A step: { id, typeId, start, end, time, endTime, mode: "offline"|"online",
//           location, link, note, confirmed }
// `end` is "" for a single-day step.

export function sortKey(step) {
  // No date sorts last; an all-day step sorts before timed ones that day.
  return `${step.start || "9999-99-99"} ${step.time || ""}`;
}

export function sortSteps(steps) {
  return [...(steps || [])].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

export function stepDays(step) {
  return eachDay(step.start, step.end);
}

// Every step of every project, one entry per calendar day it covers:
// { date, step, project, projectId, dayIndex, dayCount }
export function occurrences(projectsById) {
  const out = [];
  for (const [projectId, project] of Object.entries(projectsById)) {
    for (const step of project.steps || []) {
      const days = stepDays(step);
      days.forEach((date, i) => out.push({ date, step, project, projectId, dayIndex: i, dayCount: days.length }));
    }
  }
  return out.sort((a, b) =>
    a.date.localeCompare(b.date) || (a.step.time || "").localeCompare(b.step.time || "")
  );
}

// Date span of a project's dated steps: { first, last } or null.
export function projectSpan(project) {
  const dates = (project.steps || []).flatMap(stepDays).sort();
  return dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null;
}
