import { newProjectId } from "../../lib/utils.js";
import { putProject, updateProject, removeProject } from "../store.js";
import { equipmentPatch, projectWithInfo } from "./sync.js";

// Everything that changes a Project goes through here, so its equipment
// list (if it has one) always gets the latest name, houses, people and
// shoot days straight away.
export function projectActions(app, types) {
  const listOf = (id) => app.projects.find((p) => p.id === id);

  function push(id, project) {
    const list = listOf(id);
    if (!list || !project) return;
    const patch = equipmentPatch(project, types, list);
    if (patch) app.updateEquipmentList(id, patch);
  }

  return {
    // A new Project without an equipment list, from the shared Create New
    // window (its producer / gaffer become People).
    create(info) {
      const id = newProjectId();
      putProject(id, projectWithInfo({ notes: "", people: [], steps: [], createdAt: Date.now() }, info));
      app.addHouses(info);
      return id;
    },
    update(id, updater) {
      const next = updateProject(id, updater);
      push(id, next);
      return next;
    },
    remove(id) {
      removeProject(id);
      if (listOf(id)) app.deleteEquipmentList(id);
    },
    hasList: (id) => !!listOf(id),
    listOf,
  };
}
