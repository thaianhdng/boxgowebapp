// Writes the test data files in this folder from src/lib/testData.js:
//   boxgo-test-backup.json    27 test equipment lists + (owner only) their
//                             Projects / Calendar details and 4 Calendar-only
//                             projects. Projects only, so it's safe to
//                             restore into a real account.
//   boxgo-test-backup-FULL-spare-account-only.json
//                             the same plus catalog, tags, houses, templates,
//                             profile and appearance — for a spare account
//                             only (Restore replaces each ticked section).
//   test-cleanup.sql          removes all test data (ids starting 7e57).
// In the app: Settings → Catalog & Data → Load / Remove test data does the
// same without files. Run: node testdata/make-test-data.mjs

import { writeFileSync } from "node:fs";
import { buildTestData } from "../src/lib/testData.js";

const OUT = new URL(".", import.meta.url).pathname;
const { safe, full } = buildTestData(); // dated around 2026-10-05

writeFileSync(`${OUT}boxgo-test-backup.json`, JSON.stringify(safe, null, 1));
writeFileSync(`${OUT}boxgo-test-backup-FULL-spare-account-only.json`, JSON.stringify(full, null, 1));

writeFileSync(`${OUT}test-cleanup.sql`, [
  "-- Removes all BOXGO test data (every id starting with 7e57): the test",
  "-- equipment lists, their share links, and their Projects / Calendar data.",
  "-- Your own projects are not touched. Close BOXGO first, run this, then",
  "-- open BOXGO again.",
  "delete from shared_snapshots where project_id::text like '7e57%';",
  "delete from projects where id::text like '7e57%';",
  "delete from x_projects where id like '7e57%';",
  "",
].join("\n"));

console.log(`${safe.projects.length} lists, ${full.templates.length} templates, ${Object.keys(safe.expansion.projects).length} Projects / Calendar entries`);
