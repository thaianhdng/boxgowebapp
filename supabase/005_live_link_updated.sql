-- ============================================================
-- BOXGO — "Updated <date, time>" on live share links
-- Run once in the Supabase SQL Editor (New query), after 003.
-- ============================================================
-- projects.updated_at changes on every save, including collapsing or
-- expanding a section. list_updated_at only changes when the list itself
-- changes, so it's what the live link shows as "Updated".

alter table projects add column if not exists list_updated_at timestamptz;
update projects set list_updated_at = updated_at where list_updated_at is null;

create or replace function projects_touch_list_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.list_updated_at := now();
  elsif (new.data - 'collapsedDepts' - 'collapsedSubcats')
        is distinct from (old.data - 'collapsedDepts' - 'collapsedSubcats') then
    new.list_updated_at := now();
  else
    new.list_updated_at := old.list_updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_list_updated_at on projects;
create trigger projects_list_updated_at
  before insert or update on projects
  for each row execute function projects_touch_list_updated_at();

-- Same as 003, plus 'updatedAt' for live links.
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
        'updatedAt', coalesce(p.list_updated_at, p.updated_at),
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

revoke all on function get_shared_list(uuid) from public;
grant execute on function get_shared_list(uuid) to anon, authenticated;
