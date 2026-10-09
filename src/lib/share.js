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

// The database stores jsonb, which doesn't keep object key order, so
// compare with keys sorted.
function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

// Frozen copy with its own permanent token: later edits, and later
// snapshots of the same project, never change what this link shows.
// If nothing changed since this project's last snapshot, that link is
// handed back instead of storing another identical copy.
// Returns { token, reusedFrom } (reusedFrom = when that snapshot was made).
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
    departmentOrder: Object.keys(departments),
    accentId,
    preparedBy,
  };
  const { data: last, error: lastErr } = await supabase
    .from("shared_snapshots")
    .select("token, data, created_at")
    .eq("user_id", userId)
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr) throw lastErr;
  if (last && canonical(last.data) === canonical(JSON.parse(JSON.stringify(data)))) {
    return { token: last.token, reusedFrom: last.created_at };
  }
  const { data: row, error } = await supabase
    .from("shared_snapshots")
    .insert({ user_id: userId, project_id: project.id, data })
    .select("token")
    .single();
  if (error) throw error;
  return { token: row.token, reusedFrom: null };
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
