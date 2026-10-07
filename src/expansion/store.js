// The expansion's own data: Projects (x_projects) and settings
// (x_settings). Kept at module level rather than in a component, so it
// survives switching between Projects, Calendar and the equipment lists.
//
// Saving follows BOXGO's rules: only rows that changed since the last
// load/save are written, the data is re-fetched when the app comes back
// into view (unless something is still unsaved), and a failed load never
// lets anything be written over the real data.

import { useSyncExternalStore } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { DEFAULT_EVENT_TYPES } from "./schedule/eventTypes.js";

const SETTINGS_ID = "owner";
const defaultSettings = () => ({ eventTypes: DEFAULT_EVENT_TYPES });

let state = {
  status: "idle", // "idle" | "loading" | "ready" | "error"
  error: "",
  projects: {}, // id -> project data
  settings: defaultSettings(),
  saveState: "idle", // "idle" | "saving" | "saved" | "error"
};
const listeners = new Set();
const savedProjects = new Map(); // id -> object as last loaded/saved
let savedSettingsJson = JSON.stringify(defaultSettings());
let pendingSaves = 0;
let saveTimer = null;

function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useXStore() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
  );
}

export const getState = () => state;

const changedIds = () =>
  Object.keys(state.projects).filter((id) => savedProjects.get(id) !== state.projects[id]);
const hasUnsaved = () =>
  pendingSaves > 0 || saveTimer !== null || changedIds().length > 0 ||
  JSON.stringify(state.settings) !== savedSettingsJson;

async function fetchAll() {
  const [{ data: rows, error: e1 }, { data: settingsRow, error: e2 }] = await Promise.all([
    supabase.from("x_projects").select("*"),
    supabase.from("x_settings").select("*").eq("id", SETTINGS_ID).maybeSingle(),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { rows: rows || [], settingsRow };
}

// Data saved before "steps" were renamed "events" keeps them under the
// old names (`steps` on a project, `stepTypes` in settings). They're read
// under the new names and saved back that way: a renamed project isn't
// marked as saved, so the next save writes it in the new form.
function renamedProject(data) {
  if (!data || !("steps" in data)) return null;
  const { steps, ...rest } = data;
  return { ...rest, events: rest.events || steps || [] };
}

function apply({ rows, settingsRow }) {
  savedProjects.clear();
  let renamed = false;
  const projects = {};
  for (const r of rows) {
    const data = r.data || {};
    const fixed = renamedProject(data);
    projects[r.id] = fixed || data;
    if (fixed) renamed = true;
    else savedProjects.set(r.id, data);
  }
  const raw = settingsRow?.data || {};
  const { stepTypes, ...rawRest } = raw;
  const settings = { ...defaultSettings(), ...rawRest, ...(stepTypes && !rawRest.eventTypes ? { eventTypes: stepTypes } : {}) };
  savedSettingsJson = stepTypes ? JSON.stringify(raw) : JSON.stringify(settings);
  set({ projects, settings, status: "ready", error: "" });
  if (renamed || stepTypes) scheduleSave();
}

export async function load() {
  if (state.status === "loading") return;
  set({ status: "loading" });
  try {
    apply(await fetchAll());
  } catch (e) {
    console.error("Failed to load Projects:", e);
    const missing = /x_projects|x_settings|PGRST205|42P01/.test(`${e?.code} ${e?.message}`);
    set({
      status: "error",
      error: missing
        ? "The Projects database isn't set up yet. Run supabase/004_expansion_projects.sql in the Supabase SQL Editor, then Retry."
        : "Couldn't load your Projects. Check your connection and try again.",
    });
  }
}

// Coming back to the app: pull the latest, unless this device has edits
// that aren't saved yet (those save first; the next return refreshes).
let refreshing = false;
export async function refresh() {
  if (state.status !== "ready" || refreshing || hasUnsaved()) return;
  refreshing = true;
  try {
    const data = await fetchAll();
    if (!hasUnsaved()) apply(data);
  } catch (e) {
    console.error("Failed to refresh Projects:", e);
  } finally {
    refreshing = false;
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(runSave, 500);
}

async function runSave() {
  saveTimer = null;
  if (state.status !== "ready") return;
  const ids = changedIds();
  const settingsJson = JSON.stringify(state.settings);
  const settingsChanged = settingsJson !== savedSettingsJson;
  if (!ids.length && !settingsChanged) return;
  pendingSaves++;
  set({ saveState: "saving" });
  try {
    const now = new Date().toISOString();
    const snapshot = ids.map((id) => [id, state.projects[id]]);
    if (snapshot.length) {
      const { error } = await supabase.from("x_projects").upsert(
        snapshot.map(([id, data]) => ({ id, data, updated_at: now })),
      );
      if (error) throw error;
      snapshot.forEach(([id, data]) => savedProjects.set(id, data));
    }
    if (settingsChanged) {
      const { error } = await supabase.from("x_settings").upsert({ id: SETTINGS_ID, data: state.settings, updated_at: now });
      if (error) throw error;
      savedSettingsJson = settingsJson;
    }
    pendingSaves--;
    set({ saveState: "saved" });
    if (changedIds().length || JSON.stringify(state.settings) !== savedSettingsJson) scheduleSave();
  } catch (e) {
    pendingSaves--;
    console.error("Failed to save Projects:", e);
    set({ saveState: "error" });
  }
}

export function putProject(id, data) {
  if (state.status !== "ready") return;
  set({ projects: { ...state.projects, [id]: data } });
  scheduleSave();
}

export function updateProject(id, updater) {
  const cur = state.projects[id];
  if (!cur) return null;
  const next = typeof updater === "function" ? updater(cur) : { ...cur, ...updater };
  putProject(id, next);
  return next;
}

export async function removeProject(id) {
  if (state.status !== "ready") return;
  const { [id]: _removed, ...rest } = state.projects; // eslint-disable-line no-unused-vars
  set({ projects: rest });
  savedProjects.delete(id);
  const { error } = await supabase.from("x_projects").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete Project:", error);
    set({ saveState: "error" });
  }
}

// BOXGO's backup file carries this data for the owner (as `expansion`):
// every Project (status, events, budget, files…) and the event types.
// Null until loaded, so a backup never saves an empty copy by mistake.
export function exportBackup() {
  if (state.status !== "ready") return null;
  return { projects: state.projects, eventTypes: state.settings.eventTypes };
}

// Restoring it adds the backup's Projects (overwriting ones with the same
// id; `skipIds` = equipment lists the owner chose not to restore: a
// Project whose lists were all left out stays out too) and keeps every
// other current Project. Event types missing here are added; the
// owner's own types and colours stay as they are. Returns how many
// Projects came back, or null when the data isn't loaded yet.
export function restoreBackup(part, { skipIds = new Set() } = {}) {
  if (state.status !== "ready" || !part) return null;
  const incoming = Object.entries(part.projects || {})
    .filter(([id, data]) => data && typeof data === "object")
    .filter(([id, data]) => {
      const lists = Array.isArray(data.lists) ? data.lists.map((l) => l.id) : [id];
      return !(lists.length && lists.every((l) => skipIds.has(l)));
    })
    .map(([id, data]) => [id, renamedProject(data) || data]);
  const have = new Set(state.settings.eventTypes.map((t) => t.id));
  const newTypes = (part.eventTypes || []).filter((t) => t && t.id && !have.has(t.id));
  set({
    projects: { ...state.projects, ...Object.fromEntries(incoming) },
    ...(newTypes.length ? { settings: { ...state.settings, eventTypes: [...state.settings.eventTypes, ...newTypes] } } : {}),
  });
  scheduleSave();
  return incoming.length;
}

// Restore's "Start fresh": delete every Project (event types are kept).
// Waits for the server, so nothing restored afterwards can be deleted by
// it. Returns false (nothing deleted locally) if it fails.
export async function wipeAll() {
  if (state.status !== "ready") return false;
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const { error } = await supabase.from("x_projects").delete().neq("id", "");
  if (error) { console.error("Failed to wipe Projects:", error); return false; }
  savedProjects.clear();
  set({ projects: {} });
  return true;
}

// Delete these Projects (e.g. the test data, ids starting 7e57).
export async function removeProjects(ids) {
  if (state.status !== "ready" || !ids.length) return true;
  const { error } = await supabase.from("x_projects").delete().in("id", ids);
  if (error) { console.error("Failed to delete Projects:", error); return false; }
  const gone = new Set(ids);
  ids.forEach((id) => savedProjects.delete(id));
  set({ projects: Object.fromEntries(Object.entries(state.projects).filter(([id]) => !gone.has(id))) });
  return true;
}

// Ids of every Project (for finding the test data).
export const projectIds = () => Object.keys(state.projects);

export function setEventTypes(eventTypes) {
  if (state.status !== "ready") return;
  set({ settings: { ...state.settings, eventTypes } });
  scheduleSave();
}
