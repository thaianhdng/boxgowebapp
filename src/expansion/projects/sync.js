// Each equipment list (a row in BOXGO's `projects` table) belongs to the
// Project with the same id. They share the job's name, tag, houses,
// Producer, Gaffer and shoot days, kept in step both ways:
//   - editing a Project pushes those into its list (equipmentPatch), and
//   - editing a list in the equipment list composer (v1.0 screens: Edit
//     project, + add day…) pulls them into its Project (projectWithList).
// These functions are the only bridge between the two.

import { relabelDays, uid } from "../../lib/utils.js";
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

// Shoot days work like the equipment list's days: one Shooting step per
// day (date, location, type of shooting in `label`), consecutive or not.
// Older Projects could have a multi-day Shooting step; it splits into one
// step per date with ids "<id>", "<id>~1", "<id>~2"… — the same ids its
// equipment list days already had, so quantities stay attached.
export function splitShootRanges(steps, types) {
  const shootId = shootTypeId(types);
  let changed = false;
  const out = [];
  for (const s of steps || []) {
    if (s.typeId === shootId && s.start && s.end && s.end > s.start) {
      changed = true;
      stepDays(s).forEach((date, i) => out.push({ ...s, id: i === 0 ? s.id : `${s.id}~${i}`, start: date, end: "" }));
    } else out.push(s);
  }
  return changed ? out : null;
}

export function shootDaysOf(project, types) {
  const shootId = shootTypeId(types);
  const steps = splitShootRanges(project.steps, types) || project.steps || [];
  return sortSteps(steps, types).filter((s) => s.typeId === shootId).map((s) => ({
    id: s.id, date: s.start || "", location: s.mode === "online" ? "" : (s.location || ""), label: s.label,
  }));
}

// What the equipment list should show for this Project. With no Shooting
// steps, the list's days are left as they are.
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
    // A step from before shoot days had a label keeps the list's own.
    fields.days = relabelDays(days.map(({ label, ...d }) => ({ ...d, projectLabel: label ?? old.get(d.id)?.projectLabel ?? "" })));
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
  s.location || "", s.link || "", s.note || "", !!s.confirmed, s.label || "",
]));

// A day's location on a step: a location means it's offline; no location
// keeps an online step online.
function placeOf(step, day) {
  const loc = day.location || "";
  if (loc) return { mode: "offline", location: loc };
  return step.mode === "online" ? {} : { location: "" };
}

// The Project updated with what its equipment list now says, or null when
// they already agree. Each list day is the Shooting step with the same id:
// its date, location and type of shooting are copied over. New days become
// new Shooting steps (tentative until confirmed); steps whose day was
// removed go.
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
  for (const s of splitShootRanges(project.steps, types) || project.steps || []) {
    if (s.typeId !== shootId) { steps.push(s); continue; }
    const d = days.get(s.id);
    if (!d) continue;
    used.add(s.id);
    steps.push({ ...s, start: d.date || "", end: "", ...placeOf(s, d), label: d.projectLabel || "" });
  }
  for (const d of list.days || []) {
    if (used.has(d.id)) continue;
    steps.push({
      id: d.id, typeId: shootId, start: d.date || "", end: "", time: "", endTime: "",
      mode: "offline", location: d.location || "", link: "", note: "", confirmed: false, label: d.projectLabel || "",
    });
  }
  next.steps = steps;

  const same = ["name", "tag", "productionHouse", "rentalHouse"].every((k) => (next[k] || "") === (project[k] || "")) &&
    peopleKey(next.people) === peopleKey(project.people) &&
    stepsKey(next.steps) === stepsKey(project.steps);
  return same ? null : next;
}

const EMPTY = () => ({ name: "", tag: "", productionHouse: "", rentalHouse: "", notes: "", people: [], steps: [], createdAt: Date.now() });

// A Project made from an equipment list that doesn't have one yet (new
// lists made in the equipment list composer), or from what the shared
// Create New window returns (a Calendar project: its days become
// tentative Shooting steps).
export function projectFromList(list, types) {
  const base = { ...EMPTY(), createdAt: list.createdAt || Date.now() };
  return projectWithList(base, list, types) || base;
}

// What the shared Create New / Edit window shows for a Project (the same
// fields an equipment list has). Used to prefill it, and for the greyed
// "no equipment list yet" cards in the equipment list composer.
export function listLike(id, project, types) {
  const f = equipmentFields(project, types, null);
  return { id, ...f, days: f.days || [], createdAt: project.createdAt || 0 };
}
