# Visual revamp "A" (on hold)

Mockups only — nothing here is used by the app. Kept for later (owner's
call, Oct 2026: "hold on to this visual revamp approach for later").

## The idea

BOXGO as a camera's own menu system ("Viewfinder"): black screen,
viewfinder corner marks, condensed caps titles (Barlow Condensed), mono
readouts (DM Mono), slate-style labels, red reserved for recording /
shooting, green for confirmed / saved. The owner asked for something
completely new — new fonts and colours are fine — as long as every
existing function stays.

## Where it got to

1. `1-viewfinder-first-idea.png` — first concept (picked over Editorial
   and Glass).
2. `2-…` to `4-…` — "A pushed further": all screens (Equipment, list
   composer, Projects, Calendar, Project page, Edit project, Settings,
   Master Catalog), with camera-style soft keys along the bottom.
3. `5-…` to `7-…` — **dense** version, the latest step: the owner wanted
   more info per phone screen. One-row header (logo · module switch ·
   save tick · settings gear), New / Catalog beside the search, no
   bottom keys on browsing pages, single-line card rows with Production
   and Rental side by side, smaller text (≈11.5px body, 8.5px labels),
   composer back to one folding list of categories with 7 days visible.

Open questions when it's picked up again:
- density: the dense one, or something between it and "pushed further";
  are the smallest labels readable on the owner's phone?
- Settings: accent colour becomes a small "highlight" colour; the app
  font choice drops out (the look depends on its own fonts); the PDF is
  unchanged.
- Plan: build it for the owner's account first, Equipment cards and the
  list composer first.

## Re-rendering the mockups

From `design/revamp-a/mock/`: `node getfonts.mjs` (downloads the fonts
into `fonts/`), then `node shootdense.mjs` (or `shootplus.mjs` /
`shootplus2.mjs`). The scripts import Playwright from
`/home/user/boxgowebapp/node_modules` and use Chromium at
`/opt/pw-browsers/chromium`; adjust those paths if needed. They write
single-phone PNGs (390×844 @3x).
