// Share-link previews. Chat apps (WhatsApp, Viber, Zalo, Messenger…) don't
// run the app, they only read the page's <head>, which always said "BOXGO".
// For /share/<token>, Vercel runs this first: it looks the list up the same
// way the share page does (get_shared_list, public by token) and puts its
// name, tag, dates and production house into the title and preview tags.
// Anything goes wrong → the page is served exactly as before.
import { formatShootDateRange } from "./src/lib/shootDates.js";

export const config = { matcher: "/share/:token*" };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function previewHead(project, origin, pageUrl) {
  const name = (project?.name || "").trim() || "Untitled list";
  const dates = formatShootDateRange(project?.days);
  const desc = [project?.tag, "Equipment list", dates, project?.productionHouse].filter(Boolean).join(" · ");
  const image = `${origin}/apple-touch-icon.png`;
  return [
    `<title>${esc(name)} — BOXGO</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<meta property="og:site_name" content="BOXGO" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(name)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(pageUrl)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join("\n    ");
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const token = url.pathname.split("/")[2] || "";
  const base = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!/^[0-9a-f-]{36}$/i.test(token) || !base || !key) return;
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), 2500);
  try {
    const [page, res] = await Promise.all([
      fetch(new URL("/index.html", url), { signal: stop.signal }),
      fetch(`${base}/rest/v1/rpc/get_shared_list`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_token: token }),
        signal: stop.signal,
      }),
    ]);
    if (!page.ok || !res.ok) return;
    const [html, shared] = await Promise.all([page.text(), res.json()]);
    if (!shared?.project || !html.includes("<title>BOXGO</title>")) return;
    const out = html.replace("<title>BOXGO</title>", previewHead(shared.project, url.origin, url.href));
    return new Response(out, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" },
    });
  } catch {
    return;
  } finally {
    clearTimeout(timer);
  }
}
