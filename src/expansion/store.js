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
import { DEFAULT_STEP_TYPES } from "./schedule/stepTypes.js";

const SETTINGS_ID = "owner";
const defaultSettings = () => ({ stepTypes: DEFAULT_STEP_TYPES });

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

function apply({ rows, settingsRow }) {
  const projects = Object.fromEntries(rows.map((r) => [r.id, r.data || {}]));
  savedProjects.clear();
  for (const [id, p] of Object.entries(projects)) savedProjects.set(id, p);
  const settings = { ...defaultSettings(), ...(settingsRow?.data || {}) };
  savedSettingsJson = JSON.stringify(settings);
  set({ projects, settings, status: "ready", error: "" });
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

export function setStepTypes(stepTypes) {
  if (state.status !== "ready") return;
  set({ settings: { ...state.settings, stepTypes } });
  scheduleSave();
}
