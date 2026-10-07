// A Project has up to MAX_VERSIONS equipment lists (rows in BOXGO's
// `projects` table): its versions V1, V2… (`project.lists`, see linksOf).
// A list belongs to one Project at most; a list in none is a draft ("No
// project"). Every version shares the job's name, tag, houses, Producer,
// Gaffer and shoot days, kept in step both ways:
//   - editing a Project pushes those into its lists (equipmentPatch), and
//   - editing a list in the equipment list composer (v1.0 screens: Edit
//     project, + add day…) pulls them into its Project (projectWithList),
//     and from there into its other versions.
// These functions are the only bridge between the two.

import { relabelDays, uid } from "../../lib/utils.js";
import { shootTypeId } from "../schedule/eventTypes.js";
import { sortEvents, eventDays } from "../schedule/events.js";

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

// Shoot days work like the equipment list's days: one Shooting event per
// day (date, location, type of shooting in `label`), consecutive or not.
// Older Projects could have a multi-day Shooting event; it splits into one
// event per date with ids "<id>", "<id>~1", "<id>~2"… — the same ids its
// equipment list days already had, so quantities stay attached.
export function splitShootRanges(events, types) {
  const shootId = shootTypeId(types);
  let changed = false;
  const out = [];
  for (const s of events || []) {
    if (s.typeId === shootId && s.start && s.end && s.end > s.start) {
      changed = true;
      eventDays(s).forEach((date, i) => out.push({ ...s, id: i === 0 ? s.id : `${s.id}~${i}`, start: date, end: "" }));
    } else out.push(s);
  }
  return changed ? out : null;
}

export function shootDaysOf(project, types) {
  const shootId = shootTypeId(types);
  const events = splitShootRanges(project.events, types) || project.events || [];
  return sortEvents(events, types).filter((s) => s.typeId === shootId).map((s) => ({
    id: s.id, date: s.start || "", location: s.mode === "online" ? "" : (s.location || ""), label: s.label,
  }));
}

// What the equipment list should show for this Project. With no Shooting
// events, the list's days are left as they are.
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
    // An event from before shoot days had a label keeps the list's own.
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
const eventsKey = (events) => JSON.stringify((events || []).map((s) => [
  s.id, s.typeId, s.start || "", s.end || "", s.time || "", s.endTime || "", s.mode || "offline",
  s.location || "", s.link || "", s.note || "", !!s.confirmed, s.label || "",
]));

// A day's location on an event: a location means it's offline; no location
// keeps an online event online.
function placeOf(event, day) {
  const loc = day.location || "";
  if (loc) return { mode: "offline", location: loc };
  return event.mode === "online" ? {} : { location: "" };
}

// The Project updated with what one of its equipment lists now says, or
// null when they already agree. Each list day is the Shooting event with the same id:
// its date, location and type of shooting are copied over. New days become
// new Shooting events (tentative until confirmed); events whose day was
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
  const events = [];
  for (const s of splitShootRanges(project.events, types) || project.events || []) {
    if (s.typeId !== shootId) { events.push(s); continue; }
    const d = days.get(s.id);
    if (!d) continue;
    used.add(s.id);
    events.push({ ...s, start: d.date || "", end: "", ...placeOf(s, d), label: d.projectLabel || "" });
  }
  for (const d of list.days || []) {
    if (used.has(d.id)) continue;
    events.push({
      id: d.id, typeId: shootId, start: d.date || "", end: "", time: "", endTime: "",
      mode: "offline", location: d.location || "", link: "", note: "", confirmed: false, label: d.projectLabel || "",
    });
  }
  next.events = events;

  const same = ["name", "tag", "productionHouse", "rentalHouse"].every((k) => (next[k] || "") === (project[k] || "")) &&
    peopleKey(next.people) === peopleKey(project.people) &&
    eventsKey(next.events) === eventsKey(project.events);
  return same ? null : next;
}

const EMPTY = () => ({ name: "", tag: "", productionHouse: "", rentalHouse: "", notes: "", people: [], events: [], createdAt: Date.now() });

// A Project made from an equipment list (Create New's "A new project",
// or a draft added to a new project), or from what the shared
// Create New window returns (a Calendar project: its days become
// tentative Shooting events).
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

// ---- Versions -----------------------------------------------------------

export const MAX_VERSIONS = 5;

// A Project's equipment lists: [{ id, v, note }] in the order they were
// made. Projects from before versions (no `lists` field) have one list at
// most: the one with the Project's own id, as V1. Links to lists that no
// longer exist (deleted, or not loaded) are kept but not counted.
export function linksOf(id, project, listIds) {
  const links = Array.isArray(project.lists) ? project.lists : listIds.has(id) ? [{ id, v: 1, note: "" }] : [];
  return links.filter((l) => listIds.has(l.id));
}

// The links as saved, with the legacy V1 written out.
export function savedLinks(id, project, listIds) {
  return Array.isArray(project.lists) ? project.lists : listIds.has(id) ? [{ id, v: 1, note: "" }] : [];
}

// The version shown in the equipment list composer's project list: the
// one the owner made current, else the newest.
export function currentLink(links, project) {
  if (!links.length) return null;
  return links.find((l) => l.id === project.currentList) || links.reduce((a, b) => (b.v > a.v ? b : a));
}

// list id -> { projectId, link } for every linked list (first Project wins
// if a list were ever linked twice).
export function ownersOf(projects, listIds) {
  const owners = new Map();
  for (const [pid, p] of Object.entries(projects)) {
    for (const l of linksOf(pid, p, listIds)) if (!owners.has(l.id)) owners.set(l.id, { projectId: pid, link: l });
  }
  return owners;
}

// A list made to fit a Project it joins: the Project's name, tag, houses,
// Producer, Gaffer and shoot days. When its days aren't the Project's
// (another job's list), quantities move across day by day, in order; a
// Project with more days gives the extra ones the first day's numbers on an
// "all days same" list, nothing on a per-day one.
export function fitList(list, project, types) {
  const f = equipmentFields(project, types, list);
  if (!f.days) return { ...list, ...f };
  const oldDays = list.days || [];
  const newIds = new Set(f.days.map((d) => d.id));
  if (oldDays.length && oldDays.every((d) => newIds.has(d.id))) return { ...list, ...f };
  const itemData = {};
  for (const [cid, entry] of Object.entries(list.itemData || {})) {
    const q = entry.quantities || {};
    const quantities = {};
    f.days.forEach((d, i) => {
      const src = oldDays[i] ? q[oldDays[i].id] : !list.perDayQty && oldDays[0] ? q[oldDays[0].id] : undefined;
      if (src != null) quantities[d.id] = src;
    });
    itemData[cid] = { ...entry, quantities };
  }
  return { ...list, ...f, itemData };
}
