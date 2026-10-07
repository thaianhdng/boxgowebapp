# BOXGO test data

Made-up projects for testing every screen. Every test id starts with `7e57`,
so it can all be removed again in one step.

**Easiest:** in BOXGO, Settings → Data → **Load test data** (dated
around today) and **Remove test data** — no files needed. The data itself
is in `src/lib/testData.js`; these files are written from it with
`node testdata/make-test-data.mjs` (dated around 5 October 2026).

| File | What it is |
|---|---|
| `boxgo-test-backup.json` | 35 test equipment lists and (owner only) their Projects / Calendar details: status, events, files, list versions, plus 4 Calendar-only projects. Safe to restore into your real account: it can't replace anything else. |
| `test-cleanup.sql` | Removes all test data again. Your own projects aren't touched. |
| `boxgo-test-backup-FULL-spare-account-only.json` | Everything (catalog, tags, houses, templates, profile, appearance). **Only for a spare test account**: restoring it replaces those parts. |

## Load it

1. Make a backup of your real data first: Settings → Data → Backup.
2. Settings → Data → Restore → choose `boxgo-test-backup.json` →
   Restore. It offers "Projects" (the equipment lists) and, for the owner,
   "Projects & Calendar details" — keep both ticked.

## Remove it

Close BOXGO → Supabase → SQL Editor → New query → paste `test-cleanup.sql` →
Run → open BOXGO again.

## What's inside

- Past jobs (2025 and 2026) that show as Done; jobs now (Cicaplast is
  shooting on 4–6/10/26), upcoming jobs, and jobs in 2027.
- 1 to 10 shoot days, gaps between days (non-consecutive), one list with a
  day that has no date, and one with no items at all.
- Per-day quantities that differ by day (some days 0), "all days same"
  lists, quantities up to 94.
- Item notes (short, long, hidden from the PDF), a long project note in
  English and Vietnamese, and custom Others / Subrent items.
- A full-catalog list ("EVERYTHING") whose PDF runs to 7 pages, with long
  house / producer names.
- All three PDF fonts, Vietnamese names, a very long project name, no-tag
  and no-house projects.
- In the Projects & Calendar details: every status (Shooting, Confirmed, Soft lock, Done,
  Cancelled, plus a stale Soft lock), every event type, timed and all-day
  events, multi-day events, online events with links and a Google Maps
  recce, files of every kind, greyed Calendar-only
  projects, and clashes on 2, 8, 9 and 28 October 2026.
- List versions: Samsung has 2 lists (V2 current), Pepsi 3 (V2 chosen as
  current), Đen Vâu 5 (the most a project can have), each with a list note; and
  one draft list in no project ("Draft — Spec Rig Ideas").
