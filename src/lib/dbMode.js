// Which database the app talks to: the live one (everyone) or the owner's
// separate TEST project (a second Supabase project with the same tables —
// setup in supabase/test-project/). The owner switches in Settings →
// Catalog & Data; the choice is remembered on that device and the app
// reloads, so only one database is ever in use at a time.
//
// The test project's address and public (anon) key go here. The anon key
// is public by design (it's in every visitor's browser); what protects
// the data is each table's row-level security.

const TEST_URL = ""; // e.g. "https://abcdefghijklmnop.supabase.co"
const TEST_ANON_KEY = "";
const TEST_DB = {
  url: import.meta.env.VITE_SUPABASE_TEST_URL || TEST_URL,
  anonKey: import.meta.env.VITE_SUPABASE_TEST_ANON_KEY || TEST_ANON_KEY,
};

const KEY = "boxgo-db";

export const testDbConfigured = () => !!(TEST_DB.url && TEST_DB.anonKey);

// "test" only when this device chose it and the test project is set up.
export function dbMode() {
  try {
    return testDbConfigured() && localStorage.getItem(KEY) === "test" ? "test" : "live";
  } catch {
    return "live";
  }
}

export function dbConfig() {
  return dbMode() === "test"
    ? TEST_DB
    : { url: import.meta.env.VITE_SUPABASE_URL, anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY };
}

// Switch and reload (each database keeps its own sign-in).
export function setDbMode(mode) {
  try {
    if (mode === "test") localStorage.setItem(KEY, "test");
    else localStorage.removeItem(KEY);
  } catch { /* private window: stays live */ }
  window.location.reload();
}
