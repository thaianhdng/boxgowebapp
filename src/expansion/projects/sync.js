// The Project is where everything is typed in; its equipment list (a row
// in BOXGO's `projects` table, same id) takes the parts it needs from it.
// These two functions are the only bridge between them.

import { relabelDays } from "../../lib/utils.js";
import { shootTypeId } from "../schedule/stepTypes.js";
import { sortSteps, stepDays } from "../schedule/steps.js";

function findRole(people, exact, loose) {
  const list = people || [];
  const p = list.find((x) => (x.role || "").trim().toLowerCase() === exact)
    || list.find((x) => loose.test(x.role || ""));
  return p ? (p.name || "").trim() : "";
}

// Shooting steps become the equipment list's shoot days. A multi-day step
// gives one day per date: the first keeps the step's id, the rest are
// "<id>~1", "<id>~2"… so moving a step keeps each day's quantities.
export function shootDaysOf(project, types) {
  const shootId = shootTypeId(types);
  const out = [];
  for (const s of sortSteps(project.steps).filter((s) => s.typeId === shootId)) {
    const dates = stepDays(s);
    (dates.length ? dates : [""]).forEach((date, i) => {
      out.push({ id: i === 0 ? s.id : `${s.id}~${i}`, date, location: s.mode === "online" ? "" : (s.location || "") });
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
    producer: findRole(project.people, "producer", /producer/i),
    gaffer: findRole(project.people, "gaffer", /gaffer/i),
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

// A Project made from an equipment list that doesn't have one yet (all
// lists made before Projects existed). Each shoot day becomes a Shooting
// step with the day's own id, so the list's quantities stay attached.
export function projectFromList(list, types) {
  const people = [];
  if (list.producer) people.push({ id: `p-${list.id}-producer`, role: "Producer", name: list.producer, phone: "", email: "" });
  if (list.gaffer) people.push({ id: `p-${list.id}-gaffer`, role: "Gaffer", name: list.gaffer, phone: "", email: "" });
  return {
    name: list.name || "",
    tag: list.tag || "",
    productionHouse: list.productionHouse || "",
    rentalHouse: list.rentalHouse || "",
    notes: "",
    people,
    steps: (list.days || []).map((d) => ({
      id: d.id, typeId: shootTypeId(types), start: d.date || "", end: "", time: "", endTime: "",
      mode: "offline", location: d.location || "", link: "", note: "", confirmed: true,
    })),
    createdAt: list.createdAt || Date.now(),
  };
}
