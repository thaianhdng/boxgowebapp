import { createClient } from "@supabase/supabase-js";
import { dbConfig } from "./dbMode.js";

// Live database for everyone; the owner's device can switch to the TEST
// database (see dbMode.js). Share-link pages always read the live one, so
// links people send keep working whatever this device is set to.
const isSharePage = /^\/share\//.test(window.location.pathname);
const { url, anonKey } = isSharePage
  ? { url: import.meta.env.VITE_SUPABASE_URL, anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY }
  : dbConfig();

export const supabase = createClient(url, anonKey);
