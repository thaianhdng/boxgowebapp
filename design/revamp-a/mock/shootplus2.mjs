import { chromium } from "/home/user/boxgowebapp/node_modules/playwright/index.mjs";
import { readFileSync } from "node:fs";
import { PLUS_CSS } from "./pageplus.mjs";
import * as P from "./pageplus2.mjs";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await ctx.route("http://fonts.local/**", (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: readFileSync("fonts/" + r.request().url().split("/").pop()) }));
const check = ["600 20px 'Barlow Condensed'", "700 16px 'Barlow Condensed'", "400 13px 'Barlow'", "600 13px 'Barlow'", "400 12px 'DM Mono'", "500 12px 'DM Mono'"];
const screens = [["projects", P.projectsPlus()], ["calendar", P.calendarPlus()], ["project", P.projectPagePlus()], ["edit", P.editPlus()], ["settings", P.settingsPlus()], ["catalog", P.catalogPlus()]];
for (const [scr, body] of screens) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("ERR", scr, e.message));
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${readFileSync("fonts/viewfinder.css", "utf8")}</style><style>${PLUS_CSS}${P.PLUS2_CSS}</style></head><body>${body}</body></html>`, { waitUntil: "networkidle" });
  await page.evaluate((f) => Promise.all(f.map((x) => document.fonts.load(x, "Aa Tết ĐẾ 0123"))), check);
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
  const over = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== "visible" && !/ellipsis/.test(getComputedStyle(e).textOverflow)).map((e) => e.className).slice(0, 8));
  console.log(scr, await page.evaluate((f) => f.every((x) => document.fonts.check(x, "Aa Tết")), check), "docW", await page.evaluate(() => document.documentElement.scrollWidth), over);
  await page.screenshot({ path: `plus-${scr}.png` });
  await page.close();
}
await browser.close();
