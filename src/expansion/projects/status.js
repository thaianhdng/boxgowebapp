// A project's status. The owner sets Soft lock, Confirmed or Cancelled
// (`project.status`); a Confirmed project then shows Shooting from its
// first shoot day to its last, and Done after that.
//
// Projects from before statuses existed have none: they count as Done
// when their shoot days are all past (they happened), else Soft lock.

import { todayStr } from "../shared/dates.js";
import { shootTypeId } from "../schedule/eventTypes.js";

export const STATUSES = [
  { id: "shooting", name: "Shooting", color: "#E5484D" },
  { id: "confirmed", name: "Confirmed", color: "#5BBF6A" },
  { id: "softlock", name: "Soft lock", color: "#F2B53A" },
  { id: "done", name: "Done", color: "#8E8E8A" },
  { id: "cancelled", name: "Cancelled", color: "#6A6A66" },
];

// What the owner can pick; Shooting and Done follow from the dates.
export const SET_STATUSES = ["softlock", "confirmed", "cancelled"];

export const statusInfo = (id) => STATUSES.find((s) => s.id === id) || STATUSES[2];

// A project's shoot dates, sorted.
export function shootDates(project, types) {
  const shootId = shootTypeId(types);
  return (project.events || []).filter((s) => s.typeId === shootId && s.start).map((s) => s.start).sort();
}

// The status the owner chose (or the starting one for older projects).
export function setStatus(project, types, today = todayStr()) {
  if (SET_STATUSES.includes(project.status)) return project.status;
  const dates = shootDates(project, types);
  return dates.length && dates[dates.length - 1] < today ? "confirmed" : "softlock";
}

// The status shown: Confirmed becomes Shooting / Done with the dates.
export function statusOf(project, types, today = todayStr()) {
  const set = setStatus(project, types, today);
  if (set !== "confirmed") return set;
  const dates = shootDates(project, types);
  if (!dates.length || dates[0] > today) return "confirmed";
  return dates[dates.length - 1] < today ? "done" : "shooting";
}

// A Soft lock whose shoot days have all gone by: confirm or cancel it.
export function staleSoftLock(project, types, today = todayStr()) {
  const dates = shootDates(project, types);
  return statusOf(project, types, today) === "softlock" && dates.length > 0 && dates[dates.length - 1] < today;
}
