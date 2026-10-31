-- ============================================================
-- BOXGO TEST DATABASE — one-time setup for the separate test project.
-- Run once in the TEST project's Supabase SQL Editor (New query → paste
-- all of this → Run). Never run it in the live project.
--
-- It builds everything the live database has: the base tables (the app
-- state and projects, each user seeing only their own rows), share links
-- (002 + 005), and the owner's Projects / Calendar tables (004). The base
-- tables' original setup script was never saved, so they're rebuilt here
-- from how the app reads and writes them.
-- ============================================================

-- ---------- Base tables
create table if not exists app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  catalog jsonb,
  departments jsonb,
  project_tags jsonb,
  production_houses jsonb,
  rental_houses jsonb,
  brands jsonb,
  templates jsonb,
  settings jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_id_idx on projects (user_id);

alter table app_state enable row level security;
alter table projects enable row level security;

drop policy if exists "own app state" on app_state;
create policy "own app state" on app_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own projects" on projects;
create policy "own projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Share links (002)
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

-- ---------- Live link 'Updated' (005, includes 003)
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

-- ---------- Owner's Projects / Calendar (004)
-- ============================================================
-- BOXGO expansion — Projects, schedules and step types (owner only)
-- Run once in the Supabase SQL Editor (New query).
-- ============================================================
-- x_projects: one row per Project. `data` holds the Project's info,
-- people and schedule, and which equipment lists in `projects` are its
-- versions (`data.lists`; Projects from before versions share their one
-- list's id instead).
-- x_settings: the owner's expansion settings (step types and colours).
--
-- Both are readable and writable by the owner's account only — not by
-- other signed-in users, and not by share-link viewers.

create table if not exists x_projects (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists x_settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table x_projects enable row level security;
alter table x_settings enable row level security;

drop policy if exists "owner only" on x_projects;
create policy "owner only" on x_projects
  for all
  using ((auth.jwt() ->> 'email') = 'thaianh.dng@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'thaianh.dng@gmail.com');

drop policy if exists "owner only" on x_settings;
create policy "owner only" on x_settings
  for all
  using ((auth.jwt() ->> 'email') = 'thaianh.dng@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'thaianh.dng@gmail.com');

