// Each equipment list (a row in BOXGO's `projects` table) belongs to the
// Project with the same id. They share the job's name, tag, houses,
// Producer, Gaffer and shoot days, kept in step both ways:
//   - editing a Project pushes those into its list (equipmentPatch), and
//   - editing a list in the equipment list composer (v1.0 screens: Edit
//     project, + add day…) pulls them into its Project (projectWithList).
// These functions are the only bridge between the two.

import { relabelDays, uid } from "../../lib/utils.js";
import { addDays } from "../shared/dates.js";
import { shootTypeId } from "../schedule/stepTypes.js";
import { sortSteps, stepDays } from "../schedule/steps.js";

function roleIndex(people, exact, loose) {
  const list = people || [];
  const i = list.findIndex((x) => (x.role || "").trim().toLowerCase() === exact);
  return i >= 0 ? i : list.findIndex((x) => loose.test(x.role || ""));
}

function findRole(people, exact, loose) {
  const i = roleIndex(people, exact, loose);
  return i >= 0 ? (people[i].name || "").trim() : "";
}

const PRODUCER = ["producer", /producer/i, "Producer"];
const GAFFER = ["gaffer", /gaffer/i, "Gaffer"];

// Shooting steps become the equipment list's shoot days. A multi-day step
// gives one day per date: the first keeps the step's id, the rest are
// "<id>~1", "<id>~2"… so moving a step keeps each day's quantities.
function dayIds(step) {
  const n = Math.max(stepDays(step).length, 1);
  return Array.from({ length: n }, (_, i) => (i === 0 ? step.id : `${step.id}~${i}`));
}

export function shootDaysOf(project, types) {
  const shootId = shootTypeId(types);
  const out = [];
  for (const s of sortSteps(project.steps).filter((s) => s.typeId === shootId)) {
    const dates = stepDays(s);
    dayIds(s).forEach((id, i) => {
      out.push({ id, date: dates[i] || "", location: s.mode === "online" ? "" : (s.location || "") });
    });
  }
  return out;
}

// What the equipment list should show for this Project. With no Shooting
// steps yet, the list's days are left as they are.
export function equipmentFields(project, types, list) {
  const fields = {
    name: project.name || "",
    tag: project.tag || "",
    productionHouse: project.productionHouse || "",
    rentalHouse: project.rentalHouse || "",
    producer: findRole(project.people, PRODUCER[0], PRODUCER[1]),
    gaffer: findRole(project.people, GAFFER[0], GAFFER[1]),
  };
  const days = shootDaysOf(project, types);
  if (days.length) {
    const old = new Map((list?.days || []).map((d) => [d.id, d]));
    fields.days = relabelDays(days.map((d) => ({ ...d, projectLabel: old.get(d.id)?.projectLabel || "" })));
  }
  return fields;
}

// Only the fields that differ from the list as it is, or null.
export function equipmentPatch(project, types, list) {
  const fields = equipmentFields(project, types, list);
  const patch = {};
  const dayKey = (days) => JSON.stringify((days || []).map((d) => [d.id, d.label, d.date || "", d.location || "", d.projectLabel || ""]));
  for (const [k, v] of Object.entries(fields)) {
    if (k === "days" ? dayKey(v) !== dayKey(list.days) : (list[k] || "") !== v) patch[k] = v;
  }
  return Object.keys(patch).length ? patch : null;
}

function withRole(people, [exact, loose, role], value) {
  const list = people || [];
  const i = roleIndex(list, exact, loose);
  if (i >= 0) return (list[i].name || "").trim() === value ? list : list.map((p, k) => (k === i ? { ...p, name: value } : p));
  return value ? [...list, { id: uid(), role, name: value, phone: "", email: "" }] : list;
}

const peopleKey = (people) => JSON.stringify((people || []).map((p) => [p.id, p.role || "", p.name || "", p.phone || "", p.email || ""]));
const stepsKey = (steps) => JSON.stringify((steps || []).map((s) => [
  s.id, s.typeId, s.start || "", s.end || "", s.time || "", s.endTime || "", s.mode || "offline",
  s.location || "", s.link || "", s.note || "", !!s.confirmed,
]));

// A day's location on a step: a location means it's offline; no location
// keeps an online step online.
function placeOf(step, day) {
  const loc = day.location || "";
  if (loc) return { mode: "offline", location: loc };
  return step.mode === "online" ? {} : { location: "" };
}

// The Project updated with what its equipment list now says, or null when
// they already agree. Shoot days map back onto Shooting steps by id: a
// multi-day step whose days are still consecutive (same place) moves as
// one; otherwise its days split into single-day steps (keeping their ids,
// so quantities stay attached). New days become new Shooting steps; steps
// whose days were all removed go.
export function projectWithList(project, list, types) {
  const next = { ...project };
  for (const k of ["name", "tag", "productionHouse", "rentalHouse"]) {
    if ((list[k] || "") !== (project[k] || "")) next[k] = list[k] || "";
  }
  next.people = withRole(withRole(project.people, PRODUCER, (list.producer || "").trim()), GAFFER, (list.gaffer || "").trim());

  const shootId = shootTypeId(types);
  const days = new Map((list.days || []).map((d) => [d.id, d]));
  const used = new Set();
  const steps = [];
  for (const s of project.steps || []) {
    if (s.typeId !== shootId) { steps.push(s); continue; }
    const ids = dayIds(s);
    const present = ids.filter((id) => days.has(id));
    present.forEach((id) => used.add(id));
    if (!present.length) continue;
    const ds = present.map((id) => days.get(id));
    const together = present.length === ids.length && ds[0].date &&
      ds.every((d, i) => d.date === addDays(ds[0].date, i) && (d.location || "") === (ds[0].location || ""));
    if (together) {
      steps.push({ ...s, start: ds[0].date, end: ds.length > 1 ? ds[ds.length - 1].date : "", ...placeOf(s, ds[0]) });
    } else {
      ds.forEach((d, i) => steps.push({ ...s, id: present[i], start: d.date || "", end: "", ...placeOf(s, d) }));
    }
  }
  for (const d of list.days || []) {
    if (used.has(d.id)) continue;
    steps.push({
      id: d.id, typeId: shootId, start: d.date || "", end: "", time: "", endTime: "",
      mode: "offline", location: d.location || "", link: "", note: "", confirmed: true,
    });
  }
  next.steps = steps;

  const same = ["name", "tag", "productionHouse", "rentalHouse"].every((k) => (next[k] || "") === (project[k] || "")) &&
    peopleKey(next.people) === peopleKey(project.people) &&
    stepsKey(next.steps) === stepsKey(project.steps);
  return same ? null : next;
}

// A Project made from an equipment list that doesn't have one yet (lists
// made before Projects existed, or in the equipment list composer).
export function projectFromList(list, types) {
  return projectWithList(
    { name: "", tag: "", productionHouse: "", rentalHouse: "", notes: "", people: [], steps: [], createdAt: list.createdAt || Date.now() },
    list,
    types,
  ) || { name: "", tag: "", productionHouse: "", rentalHouse: "", notes: "", people: [], steps: [], createdAt: Date.now() };
}

// What the shared Create New / Edit window shows for a Project (the same
// fields an equipment list has). Used to prefill it, and for the greyed
// "no equipment list yet" cards in the equipment list composer.
export function listLike(id, project, types) {
  const f = equipmentFields(project, types, null);
  return { id, ...f, days: f.days || [], createdAt: project.createdAt || 0 };
}

// The Project with info from the shared window applied (name, tag,
// houses, Producer / Gaffer) — for Projects that have no equipment list.
export function projectWithInfo(project, info) {
  return {
    ...project,
    name: info.name, tag: info.tag || "", productionHouse: info.productionHouse || "", rentalHouse: info.rentalHouse || "",
    people: withRole(withRole(project.people, PRODUCER, (info.producer || "").trim()), GAFFER, (info.gaffer || "").trim()),
  };
}
