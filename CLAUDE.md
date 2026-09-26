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
   list is only one section of a Job, and a BOXGO project is the same
   record as the Job (same id), not a separate thing. For the owner, the
   Jobs home is the front door; the equipment list composer opens from
   inside a Job. **Job first:** the owner creates and edits a Job (info,
   houses, people, schedule) in one place, and each module (equipment
   list, calendar, future ones) takes what it needs from the Job; modules
   don't hold their own copy of Job info. Other users keep creating
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
  - SQL the owner has already run lives in `supabase/`. New SQL: add a
    numbered file there and give the owner the steps to run it in the
    Supabase SQL Editor.
- Each user has their **own** master catalog, cloned from
  `DEFAULT_CATALOG` / `DEFAULT_DEPARTMENTS` / `DEFAULT_BRANDS`
  (`src/constants.js`) on first sign-in. The owner updates those defaults
  by pasting Copy Catalog JSON into chat.
- Saving (`src/EquipmentManifest.jsx`): only changed projects / changed
  app_state are written; the app refreshes from the server when it comes
  back into view (unless there are unsaved edits); a failed load shows
  Retry and never lets defaults overwrite real data.
- PDF: `src/lib/pdf.js` (jsPDF, JetBrains Mono). Preview and share page draw
  the real PDF with pdf.js (`src/lib/pdfPreview.js`). Downloads go through
  `saveFile()` in `src/lib/utils.js` (iOS: opens the Share menu).
- Phone details that matter: iOS-only `maximum-scale=1` (no focus zoom) and
  a 6px top strip so Safari's top bar isn't tinted by sticky headers
  (`index.html`, `.top-tint` / `.sticky-top`); per-device UI size via CSS
  zoom (pop-up menus position through `src/lib/fixedPos.js`).

## Testing

- `npm install --no-save playwright` (gets pruned by other `--no-save`
  installs; reinstall if missing). Launch Chromium with
  `executablePath: "/opt/pw-browsers/chromium"`.
- Fake a signed-in session: localStorage key
  `sb-zumnkercznlzbnqpqmru-auth-token`, and mock `**/rest/v1/**`
  (an empty `maybeSingle` result is `200 []`).
- Stop the dev server with `pkill -f "[v]ite/bin"` (a plain `pkill -f vite`
  kills your own shell).
