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
