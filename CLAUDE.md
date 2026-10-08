# BOXGO — notes for Claude

BOXGO is a film equipment list composer (camera, lens, grip, lighting lists
per shoot day, exported as PDF or shared by link). It was built for and is
owned by a Director of Photography with **no coding knowledge**.

## Working with the owner

- Explain everything in plain language. When they need to do something in
  Supabase, GitHub Desktop, VS Code or Vercel, give click-by-click steps.
- **"Push to main" means publish**: Vercel deploys `main` to the live site
  (boxgowebapp.vercel.app) automatically. Small, low-risk fixes can go to
  main once tested; say so in the reply.
- For large or risky changes, walk the owner through what you found and
  what you plan **before** changing anything. No silent bulk rewrites.
- Test before pushing: `npm run build`, then drive the real app with
  Playwright on a simulated iPhone (their main device) and desktop — see
  Testing below. Say plainly what was and wasn't verified (e.g. real iOS
  Safari behaviour can't be tested here).
- Don't change the PDF layout, export formatting, or the backup `.json`
  format unless explicitly asked.
- **Before / after screenshots for every change** (owner's standing
  request, every conversation), whenever the change is visible: capture
  "before" from the code as it was (screenshot before editing, or run a
  `git worktree` of the previous commit), then "after" with the same
  device, page and data (usually `testdata/`; simulated iPhone, plus
  desktop when the layout differs). Send both with `SendUserFile`
  (`display: "render"`), captioned "Before" / "After". Say when a change
  has nothing to show (e.g. a data fix).
- **Keep wording accurate** (owner's standing request): after a change,
  re-read the text it touches and anything that refers to it (hints,
  labels, confirm messages, tooltips, READMEs, these notes). Renamed
  tabs, moved features or changed behaviour often leave a hint that's no
  longer true; fix those in the same change.

## Two streams of work

Start of each conversation, the owner should say which one it is:

1. **"BOXGO fix: …"** — the app everyone uses. Version **1.0** is saved as
   the branch `v1.0` (a fixed marker; never push to it). Changes go to `main`.
2. **"Expansion: …"** — owner-only features. The big picture: the owner is
   planning a larger **project management app** for their film work, and
   equipment composing (BOXGO) is only one small part of it. The expansion
   is where that larger app grows, so design expansion features as parts
   of a whole (shared navigation, shared project data), not one-off
   add-ons. The **Job** (project / shoot) is the centre of that app and
   holds everything about it: schedule, budget, script, treatment deck,
   scouting and recce photos/videos, files (Google Drive). The equipment
   list is only one section of a Job: a Job has up to 5 equipment lists
   (its versions V1, V2…), and a list belongs to one Job at most, or to
   none (a draft). **The equipment list
   composer keeps its v1.0 UI/UX exactly** (owner's call: compact, lots of
   info) — don't reshape it for the expansion; link to it instead. Shared
   Job info (name, tag, houses, Producer, Gaffer, shoot days) has one
   value, editable from either side and kept in step both ways. New
   expansion screens should match that v1.0 style: compact, dense with
   useful info, BOXGO's header and breadcrumbs. Other users keep creating
   projects in the equipment list as before. Rules:
   - All expansion code lives in `src/expansion/`. Entry point:
     `src/expansion/Expansion.jsx`.
   - It is lazy-loaded (`lazy(() => import(...))` in `EquipmentManifest.jsx`)
     and only rendered when `isOwner(session)` is true (`src/owner.js`), so
     other accounts never download it. Keep it that way: BOXGO code must
     **not** import from `src/expansion/`, or it leaks into everyone's bundle.
   - The expansion gets what it needs from BOXGO through the `app` prop on
     `<Expansion>`. Add fields there instead of reaching into BOXGO internals.
   - Expansion database tables are prefixed `x_` and their row-level
     security must restrict **to the owner**, not just "the signed-in user":
     `using ((auth.jwt() ->> 'email') = 'thaianh.dng@gmail.com')`.
     Hiding in the UI is not enough for anything private or powerful.
   - Because it's hidden from everyone else, expansion work-in-progress can
     be pushed to main; the owner tests it live on their phone.
   - Most expansion features stay owner-only for good. A feature moves to
     BOXGO for everyone **only when the owner explicitly says so** (after it
     has proved useful and reliable) — never promote one on your own.
     Promoting means a planned "BOXGO fix": walk the owner through it first,
     move the code out of `src/expansion/`, and give any `x_` tables normal
     per-user row-level security (or new non-`x_` tables) instead of the
     owner-only rule.
   - Keep each expansion feature self-contained (its own files/folder in
     `src/expansion/`) so it can be promoted or removed cleanly later.
   - How it's wired: the owner has three modules sharing one projects
     database — **Projects** and **Calendar** (the expansion) and
     **Equipment** (v1.0 composer). BOXGO's header top row has the
     module switch instead of the "Equipment List Composer" caption: the
     logo stays as it is, the BOXGO wordmark is the home tab (Projects;
     accent while Projects shows), then | CALENDAR | EQUIPMENT (on the
     owner's phone the name shrinks so it fits). The crumb's
     section names: "Projects Manager", "Calendar", "Equipment Lists
     Manager" (others keep "Project Manager"); the crumb wraps, so a list /
     project name too long to sit beside it takes the next line and is cut
     with "…" only when longer than the row (everyone; no fixed width).
     `EquipmentManifest` starts on view `"x"`,
     route `{ screen: "projects" }`: BOXGO's header (crumb PROJECTS MANAGER
     or CALENDAR / <project>, Edit project, Settings, one save tick) with
     `<Expansion part="screen">` under it — `screen` "projects" = Projects
     home (search, Create New, projects grouped by status under bold
     headings — the heading and the card's coloured left edge are the only
     status marks, no filter chips or per-card status label (owner's call);
     Done / Cancelled folded, remembered per device; Done is split by year,
     each foldable; while searching every group is open), "calendar" = Calendar home
     (`calendar/CalendarHome.jsx`: search + full-width calendar of every
     project, cancelled ones left out; "List this month" starts open; a
     tapped day has "+ Add event": pick the project — active ones, Done on
     request — then the event window),
     "project" = the
     Project page (`route.from = "calendar"` when opened from the Calendar,
     so its crumb and switch stay on Calendar) — and
     `<Expansion part="crumb">` for the name. **Project status**
     (`projects/status.js`): the owner sets Soft lock / Confirmed /
     Cancelled (`project.status`; new projects Soft lock); a Confirmed
     project shows Shooting from its first shoot day to its last and Done
     after. Projects without a status count as Done if their shoot days
     are all past, else Soft lock; the sync part saves such past ones as
     Confirmed. A Soft lock whose dates have passed gets a "confirm or
     cancel?" warning. Status is Project-only (not in the equipment list).
     **There is no per-event Tentative / Confirmed** (owner's call: project
     status is enough): a Soft lock project's events are drawn faded /
     dashed everywhere (`isTentative`, `occurrences(...).tentative`); old
     events' `confirmed` field is ignored.
     The Project page: sticky jump bar (Calendar · Schedule · Equipment ·
     Files), status, info strip, calendar (open by default, folding
     remembered per device; this project's events in colour, other
     projects' events greyed with their names), schedule, equipment lists
     (versions) and **Files** (`files/`:
     `project.files = [{ kind: script|treatment|recce|other, name, url }]`,
     pasted links, open in a new tab; real Google Drive picking later).
     Project cards copy the equipment list's card layout and size
     (owner's call; 240px grid, same lines: name · dates, Production
     House + Producer, Rental House +
     Gaffer, then the notes (one line), shoot locations), then a last row
     kept at the card's foot: the next event, and what the job has as
     icons in the text colour (white in dark mode): paperclip + file count
     (only when it has files; tapping it opens the Project page at its
     Files, route `intent: "files"`), then the equipment list sheet, always in
     the bottom right corner — greyed when the job has no list; tapping a
     white one opens its current version (`app.openEquipmentList`).
     The tag floats in the card's top right corner, not before the
     name (owner's call), so only the name's first line makes room for it.
     The top row is flowing text, not flex items. The equipment list's
     cards (everyone, owner's call: synced with the Projects cards) work
     the same way: name · dates with the tag floating in the top right
     corner (a draft's "No project" mark on its own line under the name);
     then the houses, the project note, the version row (owner: "V3 ·
     list note · 3 lists", or a draft's list note; one line, the note cut
     with "…"), locations, gear; and a foot row
     with "⚠ No items" at the left and the ⋮ menu (or a greyed card's
     "+ List") in the bottom right corner, opening upwards. The cards'
     camera and lens lines leave out the camera / lens categories and
     subcategories unticked in the Master Catalog ("In card preview" on
     their bars; `settings.cardPreviewOff`, keys "dept" / "dept::sub",
     `inCardPreview`; not in the backup file). The
     Equipment page is capped at the Projects page's width (1236px of
     cards), so cards are the same size on wide screens. On both kinds
     of card a house and its person (Producer / Gaffer) stay on one line,
     cut off with "…". The small boxed labels
     (tag, Cancelled) use the `.tag-box` class: `text-box: trim-both cap
     alphabetic` keeps the letters centred in the border in every app
     font. The Edit window shows a project's real tag ("—" when it has
     none, or one since removed from the tag list), not the first tag.
     The Projects home keeps the list's 22px page margins on a phone
     (Calendar / Project pages: 14px, class `x-tight`). The Budget feature
     was removed (owner's call); old `project.budget` data is kept but
     unused. **Settings for the owner** (`AttributesManagerModal` with
     `librarySections`; everyone else keeps v1.0's Profile · Appearance ·
     Lists · Catalog & Data): one row of tabs, window 520px wide on bigger
     screens. **General** = Your details (name / email / phone, "in PDF"
     ticks) + Appearance. **Preferences** = a hint, then fold-out
     sections, one open at a time: Project Tags, Production Houses,
     Rental Houses (A–Z: add, rename, remove), **Event Types**
     (`<Expansion part="settings">`; also recolour and reorder — edited
     only here, not from the calendars). **Data** = Backup & Restore
     (owner's own backup note), Master Equipment Catalog, Equipment
     Templates, Test Database (`testDatabase` prop: Live / Test switch +
     Test data box). A clash (red dot) = two projects' shoots / prelights on one
     day, or overlapping set times (`clashDates`); a full day box shows
     as many names as fit (phone 2, desktop 3) and "+N more". EQUIPMENT is the v1.0 composer untouched, except for the
     owner: its crumb root reads "Equipment Lists Manager" (others:
     "Project Manager"); inside a list in a project, "Edit project" and an
     accent "Go to project" button (the Project page) sit at the bottom
     right of the info box instead of the header (a draft's box has "Edit
     list" and "Add to project"); tapping the name in the crumb also
     opens the Project page,
     Cancelled jobs' lists get a "Cancelled" mark on their card and crumb
     (`app.reportCancelled`; never in the preview, PDF or share page),
     Cancelled projects get no greyed card, and the floating back-to-top
     button shows on every page at every size (others: phones only, as in
     v1.0). **Backup** (Settings) for the owner also carries the
     expansion data as `expansion: { projects: {id: data}, eventTypes }`
     (`store.exportBackup`); Restore offers it as "Projects & Calendar
     details" (`store.restoreBackup`: adds / overwrites by id, skips lists
     left unticked, adds missing event types). Wired through
     `app.registerBackup`; other users' backups are unchanged. Owner-only
     in Restore: **Start fresh** (`wipeNote` prop → `sel.wipe`): deletes
     every current list (server first, awaited) and every Project
     (`store.wipeAll`) before restoring; event types / catalog / settings
     stay unless ticked. Owner-only in Settings → Data, the **Test
     data** box (`TestDataCleaner`): **Load test data** builds
     `src/lib/testData.js` (dynamic import, own download) with every date
     moved so it sits around today, and restores it through
     `applyRestore` (lists + Projects / Calendar details); **Remove test
     data** deletes lists and Projects whose id starts `7e57`, nothing
     else. Meant to be offered to everyone when expansion features go
     public for testing (owner's plan). Greyed "no list" cards never
     double a project that has a list.
     `<Expansion part="sync">` is always
     mounted for the owner (renders nothing): loads the store, reports
     save state (`app.reportSaveState`) and runs the list → Project link.
     Data: `x_projects` (id = the list's `projects.id`) and `x_settings`
     (event types), SQL in `supabase/004_…`, loaded and saved by
     `src/expansion/store.js`. `src/expansion/projects/sync.js` is the only
     bridge: Project edits push into the list (`equipmentPatch`, from
     `projects/actions.js`); list changes pull into the Project
     (`projectWithList`, from the sync part). **Shoot dates are the
     fundamental detail of a project:** one Shooting event per shoot day
     (single date, location, shoot type in `event.label`), exactly
     one-to-one with the list's days (same ids; `label` ↔ `projectLabel`);
     non-consecutive days are just separate events. Older multi-day
     Shooting events are split into days (ids `<id>`, `<id>~1`…) by
     `splitShootRanges`. Shoot days are added / changed **only** in the
     project's Create New / Edit window (the event window has no Shooting
     type; tapping a shoot day opens Edit project). A project's own
     calendar names each day's event (shoot days as "Shooting D1"…). The
     schedule lists every shoot day on its own line (D1, D2…). Events are
     always ordered date → time (all-day first) → the Event types list
     order → order added (`compareEvents` in `schedule/events.js`). Times
     are picked as hour : minute in 5-minute steps. The People feature is
     removed for now: a project's Producer / Gaffer (set in Create New /
     Edit) still live in `people` and show in the info strip. Every project keeps at least one
     shoot day; Calendar's Create New requires them; projects without
     any show "⚠ No shoot dates" and sort first. **List versions**
     (owner's call): a Project has 0–5 equipment lists, `project.lists =
     [{ id, v }]` (V numbers never reused; `MAX_VERSIONS`), and
     `currentList` (else the newest is current). A list is in one Project
     at most; one in none is a **draft list** (there are no draft
     projects): the bare-bone list. It has no production / rental house,
     Producer, Gaffer or project note (Create New's draft form,
     `ProjectFormModal` `draft`, hides them; a list that leaves its
     project, or a copy to no project, loses the houses; the sync part
     turns a draft's leftover `note` into its list note). Its name is
     optional ("Untitled list"), its tag starts as none ("—"), and its days
     may have no date (empty date fields read "Select date"). Inside a
     draft the info box is replaced by a hint and an "Add to project"
     button, and the row under it reads "V1" with its list note,
     which it keeps when it joins a project. Each
     list has its own **list note** (`list.listNote`, edited under the
     composer's info box and on the Project page; older notes on the link,
     `link.note`, are read as a fallback, `listNoteOf`); copies start
     without one. The composer's "Project note" (`list.note`, on the PDF)
     is the Project's `notes`, the same in every version — once
     `project.notesShared`: the first time, the sync part combines the
     Project's note and its current list's (`mergedNotes`), and another
     version's different note becomes its list note; a list joining a
     project keeps its old project note as its list note. Projects from before
     versions have no `lists`: their list is the one with the Project's own
     id, as V1 (`linksOf`, read lazily, written out on the first change).
     Every version shares the Project's name, tag, houses, Producer,
     Gaffer, shoot days (same day ids) and project note; only equipment,
     quantities and the list note differ; the sync part reads one changed list per Project per
     pass (current first) and brings the others in line, and a list that
     just joined is fitted to the Project (`fitList`: days by position),
     never read into it. Lists don't get a Project automatically any
     more: Create New and Duplicate (owner) first ask where the list goes
     (`ListTarget`, `<Expansion part="target">`): Duplicate → this
     project (next version, same day ids) / another project / no project;
     Create New → no project / a new project / an existing one (Create
     New prefilled), offered in the order Draft list (no project) / Create
     new project / Add to existing project; a "—" (no tag) option is
     always first in the tag list. Equipment cards' ⋮ menu (owner): Add to project… /
     Remove from project. Equipment shows one card per Project, its
     current version, with "V3 · note · 3 lists" (under the project
     note) when there are several or a list note, and drafts marked "No project"; inside a list, under
     the info box, a row with the version switch ("V2 ▾"; just "V1" for a
     single list or a draft) and the list note (owner). Day
     fields everywhere read "Shoot type…" and "Location and note". The composer's item
     search reads "Search items…" (everyone; every list uses the same
     master catalog). The Project page's equipment section lists every
     version (list note, Make current, Edit, Preview, Duplicate,
     Remove, Delete, + New version); deleting a Project with lists asks
     whether to delete them or keep them as drafts. The version number is
     never on the PDF or share page; the list note is (owner's call), in
     slanted text under the project note (the PDF fonts have no italic).
     Data the expansion
     reports to BOXGO: `app.reportListMeta` (list id → project, v, list
     note, count, current),
     links through `app.registerLinks` (link / attach / unlink). **One Create New / Edit
     window for both modules:** BOXGO's `ProjectFormModal` (owner-only
     props: `prefill` = new from given values, `noList` = hide template,
     quantity mode, save as template, and require shoot-day dates), wrapped by `src/expansion/shared/
     ProjectForm.jsx`. A project created in Calendar has **no** equipment
     list; it shows greyed in Equipment's project list (`ghost: true`,
     reported via `app.reportGhosts`). Its list is created either from the
     Project page ("Create equipment list") or by tapping the greyed card
     — both open Create New prefilled. Projects' and Equipment's main pages start
     with the same search bar + Create New (phone: full-width button;
     desktop: dashed card); Calendar has the search bar only. Its colour key is tap-to-filter (tap event
     types to show only those; tap again to drop one). A Project with a list must
     keep at least one Shooting event. Schedule events: date or range,
     optional time, online/offline, note. Calendars colour by event type;
     Soft lock projects' events are faded; Google Calendar (not built yet)
     should get Confirmed projects' events only.
   - **Naming:** a schedule item is an **event** (UI and code: `events`,
     `EventModal`, `eventTypes`, "+ Add event", "Event types"). Data saved
     before the rename used `steps` (project) / `stepTypes` (settings);
     `store.js` reads those and re-saves them under the new names.

## Architecture

- Vite + React 18 SPA, deployed on Vercel. `vercel.json` rewrites
  `/share/:token` to the app.
- Supabase (project `zumnkercznlzbnqpqmru`): auth (invite-only accounts —
  the login screen never signs up), Postgres with RLS.
  - `app_state`: one row per user — catalog, departments, project_tags,
    production_houses, rental_houses, brands, templates, settings (jsonb).
    jsonb loses key order, so category order is `settings.departmentOrder`,
    reapplied with `orderDepartments()`.
  - `projects`: one row per project (`data` jsonb, `share_token`).
  - `shared_snapshots` + RPC `get_shared_list(p_token)` for share links.
    Sending a snapshot identical to the project's last one reuses that
    link. Live links show "Updated" from `projects.list_updated_at`, set by
    a trigger only when the list content changes (`supabase/005_…`).
  - SQL the owner has already run lives in `supabase/`. New SQL: add a
    numbered file there and give the owner the steps to run it in the
    Supabase SQL Editor.
  - **Test database (owner only):** a second Supabase project with the same
    tables (`supabase/test-project/000_test_setup.sql` = base tables
    rebuilt from the code + 002, 005, 004; README there has the setup
    steps). `src/lib/dbMode.js` holds its URL / anon key; the owner
    switches Live / Test in Settings → Data (`DbSwitch`, saved
    per device in localStorage `boxgo-db`, app reloads). The client picks
    the database at load (`supabaseClient.js`); share pages always use
    live. A teal TEST badge (`TestBadge`) shows in the header and on the
    sign-in screen, which also gets "Back to live BOXGO" (so does the
    load-error screen: free projects pause when unused). Any new SQL for
    live must also be added to the test project's setup file.
- Each user has their **own** master catalog, cloned from
  `DEFAULT_CATALOG` / `DEFAULT_DEPARTMENTS` / `DEFAULT_BRANDS`
  (`src/constants.js`) on first sign-in. The owner updates those defaults
  by pasting Copy Catalog JSON into chat.
- Saving (`src/EquipmentManifest.jsx`): only changed projects / changed
  app_state are written; the app refreshes from the server when it comes
  back into view (unless there are unsaved edits); a failed load shows
  Retry and never lets defaults overwrite real data.
- PDF: `src/lib/pdf.js` (jsPDF). Header (owner's call): prepared-by at
  the right; tag + name at the left in the space beside it (a long name
  wraps; the shoot dates follow it, or take their own line when they
  don't fit); then Production House and Rental House (house, with the
  Producer / Gaffer on the line below, same bold font; cut with "…"
  when too wide) and Created On (date, time below) at the right; a thin
  (1.5pt) accent line; the project note has no label. Font is per project (`project.pdfFont`,
  picked on the preview page; list + trimmed TTFs in `src/lib/font.js`;
  default JetBrains Mono; `settings.pdfFontId` = last pick, for new projects). Preview and share page draw
  the real PDF with pdf.js (`src/lib/pdfPreview.js`). Downloads go through
  `saveFile()` in `src/lib/utils.js` (iOS: opens the Share menu).
- Phone details that matter: iOS-only `maximum-scale=1` (no focus zoom) and
  a 6px top strip so Safari's top bar isn't tinted by sticky headers
  (`index.html`, `.top-tint` / `.sticky-top`); per-device UI size via CSS
  zoom (pop-up menus position through `src/lib/fixedPos.js`).
- **Motion** (owner only for now, the owner's "level 1": short motion that
  helps follow what changed; `src/lib/motion.js`, `src/components/Motion.jsx`).
  `EquipmentManifest` puts the class `motion` on `<html>` for the owner;
  without it nothing moves, and a device set to reduce motion gets none.
  CSS classes: `m-overlay` (pop-up windows fade / rise in), `m-pop` (+
  `m-up` for menus opening upwards), `m-toast` (undo bar), `m-card`
  (cards lift on hover, press in on tap). `<Fold open>` opens / closes a
  folding section smoothly (Projects groups and years, the Project
  page's calendar, Settings → Preferences); `<Presence>` makes list rows
  grow in when added and shrink away when removed (schedule, files,
  versions, Settings lists, the composer's custom items); rows already
  there don't move. A page change fades in everything under the header.
  Only opening is animated for pop-ups (closing is instant). Level 2
  ideas (owner's list, not built): cards fading in one by one, an
  animated save tick, drag to reorder.

## Testing

- Test data lives in `src/lib/testData.js` (ids start `7e57`): the app's
  Load / Remove test data buttons use it, and `node
  testdata/make-test-data.mjs` writes it as files (`testdata/`: a
  projects-only backup safe for the real account, a full backup for a
  spare account, a cleanup SQL; see its README). Change the data there,
  then regenerate the files.

- `npm install --no-save playwright` (gets pruned by other `--no-save`
  installs; reinstall if missing). Launch Chromium with
  `executablePath: "/opt/pw-browsers/chromium"`.
- Fake a signed-in session: localStorage key
  `sb-zumnkercznlzbnqpqmru-auth-token`, and mock `**/rest/v1/**`
  (an empty `maybeSingle` result is `200 []`).
- The dev server needs `VITE_SUPABASE_URL=https://zumnkercznlzbnqpqmru.supabase.co
  VITE_SUPABASE_ANON_KEY=test` (any key; requests are mocked) or the app
  won't start. Owner tests must also mock `x_projects` / `x_settings`.
- Stop the dev server with `pkill -f "[v]ite/bin"` (a plain `pkill -f vite`
  kills your own shell).
