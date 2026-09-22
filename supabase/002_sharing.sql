-- ============================================================
-- BOXGO — share links (live + frozen snapshot)
-- Run once in the Supabase SQL Editor, after the base schema.
-- ============================================================

-- Live link: a project with a share_token is readable by anyone who
-- has that token, always showing current data. Null = not shared.
alter table projects add column if not exists share_token uuid unique;

-- Frozen snapshot: each "Send snapshot" writes a new row with its own
-- token, so a link already sent never changes.
create table if not exists shared_snapshots (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table shared_snapshots enable row level security;

drop policy if exists "own snapshots" on shared_snapshots;
create policy "own snapshots" on shared_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The only public read path. Given an exact token it returns one list;
-- it can't be used to list or search anything. Runs with elevated rights
-- so viewers need no account, and strips notes the owner marked hidden.
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

-- The old "shares" storage bucket is no longer written to. Links already
-- sent from it keep working (public-bucket files are served by URL with
-- no policy needed); dropping this policy just stops anyone from listing
-- every file in the bucket.
drop policy if exists "Public can read shares" on storage.objects;
