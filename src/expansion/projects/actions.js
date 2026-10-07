import { newProjectId } from "../../lib/utils.js";
import { getState, putProject, updateProject, removeProject } from "../store.js";
import { MAX_VERSIONS, currentLink, equipmentPatch, fitList, linksOf, listNoteOf, ownersOf, projectFromList, projectWithList, savedLinks } from "./sync.js";

// Everything that changes a Project, or which equipment lists belong to
// it, goes through here, so its lists (its versions) always get the latest
// name, houses, people and shoot days straight away.
export function projectActions(app, types) {
  const listById = (listId) => app.projects.find((p) => p.id === listId);
  const listIds = () => new Set(app.projects.map((p) => p.id));
  const projectOf = (id) => getState().projects[id];
  // [{ id, v, note, list }] — the Project's versions, oldest first
  // (`note`: each list's own note).
  const versionsOf = (id) => {
    const p = projectOf(id);
    if (!p) return [];
    return linksOf(id, p, listIds()).map((l) => { const list = listById(l.id); return { ...l, note: listNoteOf(list, l), list }; });
  };
  const currentListOf = (id) => {
    const p = projectOf(id);
    const cur = p && currentLink(linksOf(id, p, listIds()), p);
    return cur ? listById(cur.id) : null;
  };

  function push(id, project) {
    if (!project) return;
    for (const l of linksOf(id, project, listIds())) {
      const list = listById(l.id);
      const patch = list && equipmentPatch(project, types, list);
      if (patch) app.updateEquipmentList(l.id, patch);
    }
  }

  // Take a list out of whichever Project has it.
  function dropLink(listId) {
    const ids = listIds();
    const owner = ownersOf(getState().projects, ids).get(listId);
    if (!owner) return;
    updateProject(owner.projectId, (p) => {
      const lists = savedLinks(owner.projectId, p, ids).filter((l) => l.id !== listId);
      return { ...p, lists, ...(p.currentList === listId ? { currentList: undefined } : {}) };
    });
  }

  // Put a list in a Project — `{ projectId }`, or `{ newProject: true }` for
  // a new one made from the list — as its next version. Returns the list
  // made to fit that Project (its days, name, houses…), or null when the
  // Project already has MAX_VERSIONS. A new version becomes the current one.
  function link(list, target) {
    const ids = new Set([...listIds(), list.id]);
    if (target?.newProject) {
      dropLink(list.id);
      const id = newProjectId();
      putProject(id, { ...projectFromList(list, types), lists: [{ id: list.id, v: 1, note: "" }] });
      return list;
    }
    const p = target && projectOf(target.projectId);
    if (!p) return null;
    const saved = savedLinks(target.projectId, p, ids).filter((l) => l.id !== list.id);
    if (linksOf(target.projectId, { ...p, lists: saved }, ids).length >= MAX_VERSIONS) return null;
    dropLink(list.id);
    const v = saved.reduce((m, l) => Math.max(m, l.v || 0), 0) + 1;
    updateProject(target.projectId, (cur) => ({ ...cur, lists: [...saved, { id: list.id, v, note: target.note || "" }], currentList: undefined }));
    return fitList(list, p, types);
  }

  // A list that leaves its Project becomes a draft: houses, Producer and
  // Gaffer belong to a project, so they go.
  const DRAFT = { productionHouse: "", producer: "", rentalHouse: "", gaffer: "" };
  function unlink(listId) {
    dropLink(listId);
    if (listById(listId)) app.updateEquipmentList(listId, DRAFT);
  }

  return {
    // A new Project without an equipment list, from the shared Create New
    // window: its producer / gaffer become People, its shoot days become
    // (tentative) Shooting events.
    create(info) {
      const id = newProjectId();
      putProject(id, { ...projectFromList({ ...info, note: "", createdAt: Date.now() }, types), status: "softlock", lists: [] });
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
    // Delete a Project; its lists are deleted too, or kept as drafts.
    remove(id, { keepLists = false } = {}) {
      const lists = versionsOf(id);
      removeProject(id);
      lists.forEach((l) => (keepLists ? app.updateEquipmentList(l.id, DRAFT) : app.deleteEquipmentList(l.id)));
    },
    hasList: (id) => versionsOf(id).length > 0,
    versionsOf,
    currentListOf,
    projectOf,
    link,
    unlink,
    // An existing list joins a Project (or a new one made from it).
    attach(listId, target) {
      const list = listById(listId);
      if (!list) return false;
      const fitted = link(list, target);
      if (!fitted) return false;
      const { id: _id, ...patch } = fitted; // eslint-disable-line no-unused-vars
      if (fitted !== list) app.updateEquipmentList(listId, patch);
      return true;
    },
    setCurrent(id, listId) {
      updateProject(id, (p) => ({ ...p, lists: savedLinks(id, p, listIds()), currentList: listId }));
    },
    // A list's own note (not the project note every version shares).
    setNote(listId, note) {
      app.updateEquipmentList(listId, { listNote: note });
    },
  };
}
