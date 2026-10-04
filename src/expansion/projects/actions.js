import { newProjectId } from "../../lib/utils.js";
import { putProject, updateProject, removeProject } from "../store.js";
import { equipmentPatch, projectFromList, projectWithList } from "./sync.js";

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
    // window: its producer / gaffer become People, its shoot days become
    // (tentative) Shooting events.
    create(info) {
      const id = newProjectId();
      putProject(id, projectFromList({ ...info, createdAt: Date.now() }, types));
      app.addHouses(info);
      return id;
    },
    // The shared Edit window, for a Project without an equipment list.
    editInfo(id, info) {
      const next = updateProject(id, (p) => projectWithList(p, info, types) || p);
      push(id, next);
      app.addHouses(info);
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
