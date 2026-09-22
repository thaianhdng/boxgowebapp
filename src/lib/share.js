import { supabase } from "./supabaseClient.js";
import { newProjectId } from "./utils.js";

export function shareUrlFor(token) {
  return `${window.location.origin}/share/${token}`;
}

// What a share recipient gets to see of a project: never a note the owner
// marked hidden, and none of the owner's own UI state.
function publicProject(project) {
  const { collapsedDepts, collapsedSubcats, ...rest } = project;
  const itemData = {};
  for (const [id, entry] of Object.entries(project.itemData || {})) {
    itemData[id] = entry.noteHidden ? { ...entry, notes: "" } : entry;
  }
  return { ...rest, itemData };
}

// Frozen copy with its own permanent token: later edits, and later
// snapshots of the same project, never change what this link shows.
export async function createSnapshot({ userId, project, catalog, departments, accentId, preparedBy }) {
  const usedIds = new Set(
    Object.entries(project.itemData || {})
      .filter(([, e]) => Object.values(e.quantities || {}).some((q) => q > 0))
      .map(([id]) => id)
  );
  const data = {
    project: publicProject(project),
    catalog: catalog.filter((c) => usedIds.has(c.id)),
    departments,
    accentId,
    preparedBy,
  };
  const { data: row, error } = await supabase
    .from("shared_snapshots")
    .insert({ user_id: userId, project_id: project.id, data })
    .select("token")
    .single();
  if (error) throw error;
  return row.token;
}

// Upserts the whole row (not just share_token) so this also works for a
// project the debounced autosave hasn't written yet. Reuses an existing
// token so a link already handed out keeps working.
export async function enableLiveLink({ userId, project, existingToken }) {
  const token = existingToken || newProjectId();
  const { error } = await supabase
    .from("projects")
    .upsert({ id: project.id, user_id: userId, data: project, share_token: token, updated_at: new Date().toISOString() });
  if (error) throw error;
  return token;
}

export async function disableLiveLink(projectId) {
  const { error } = await supabase.from("projects").update({ share_token: null }).eq("id", projectId);
  if (error) throw error;
}

// Public read: resolves either a snapshot token or a live-link token.
// Runs as a security-definer SQL function, so viewers need no account and
// can only fetch exactly the token they were given.
export async function fetchSharedList(token) {
  const { data, error } = await supabase.rpc("get_shared_list", { p_token: token });
  if (error) throw error;
  return data;
}
