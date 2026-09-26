// The owner's list of schedule step types. Each has its own colour — the
// calendars colour events by step type, not by project. The "shoot" type
// is special: its steps become the shoot days (day columns) of the
// project's equipment list, so it can be renamed and recoloured but not
// removed.

export const SWATCHES = [
  "#7C8CFF", "#3FA7E0", "#2FB5A4", "#5BBF6A", "#B8B04A", "#F2B53A",
  "#F08A4B", "#E5484D", "#E86BB0", "#C77DFF", "#A0785A", "#8E8E8A",
];

export const DEFAULT_STEP_TYPES = [
  { id: "kickoff", name: "Kick-off Meeting", color: "#7C8CFF" },
  { id: "scouting", name: "Scouting", color: "#2FB5A4" },
  { id: "recce", name: "Recce", color: "#3FA7E0" },
  { id: "travel", name: "Travel", color: "#8E8E8A" },
  { id: "camtest", name: "Camera Test", color: "#C77DFF" },
  { id: "prelight", name: "Prelight", color: "#F2B53A" },
  { id: "rehearsal", name: "Rehearsal", color: "#F08A4B" },
  { id: "shoot", name: "Shooting", color: "#E5484D", shoot: true },
  { id: "offline", name: "Offline Review", color: "#5BBF6A" },
  { id: "grading", name: "Grading Session", color: "#E86BB0" },
];

const UNKNOWN = { id: "", name: "Step", color: "#8E8E8A" };

export function typeOf(types, typeId) {
  return types.find((t) => t.id === typeId) || UNKNOWN;
}

export function shootTypeId(types) {
  return (types.find((t) => t.shoot) || DEFAULT_STEP_TYPES.find((t) => t.shoot)).id;
}
