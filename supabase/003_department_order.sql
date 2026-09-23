-- ============================================================
-- BOXGO — keep category order on live share links
-- Run once in the Supabase SQL Editor (New query), after 002_sharing.sql.
-- ============================================================
-- jsonb doesn't keep object key order, so the app now saves the order of
-- categories separately (settings.departmentOrder). This passes it through
-- to live links; nothing else in the function changes.

create or replace function get_shared_list(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select data || jsonb_build_object('kind', 'snapshot', 'sharedAt', created_at)
       from shared_snapshots
      where token = p_token),
    (select jsonb_build_object(
        'kind', 'live',
        'project', (p.data - 'collapsedDepts' - 'collapsedSubcats') || jsonb_build_object(
          'itemData', coalesce((
            select jsonb_object_agg(
              k,
              case when coalesce((v->>'noteHidden')::boolean, false) then v - 'notes' else v end)
              from jsonb_each(coalesce(p.data->'itemData', '{}'::jsonb)) as e(k, v)
          ), '{}'::jsonb)),
        'catalog', s.catalog,
        'departments', s.departments,
        'departmentOrder', s.settings->'departmentOrder',
        'accentId', s.settings->>'accentId',
        'preparedBy', jsonb_build_object(
          'name',  case when coalesce((s.settings->>'includeUsernameInPdf')::boolean, true)
                        then coalesce(s.settings->>'userName', '') else '' end,
          'email', case when coalesce((s.settings->>'includeEmailInPdf')::boolean, false)
                        then coalesce(s.settings->>'userEmail', '') else '' end,
          'phone', case when coalesce((s.settings->>'includePhoneInPdf')::boolean, false)
                        then coalesce(s.settings->>'userPhone', '') else '' end))
       from projects p
       join app_state s on s.user_id = p.user_id
      where p.share_token = p_token)
  );
$$;
