import { chromium } from "/home/user/boxgowebapp/node_modules/playwright/index.mjs";
import { readFileSync } from "node:fs";
import * as D from "./pagedense.mjs";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await ctx.route("http://fonts.local/**", (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: readFileSync("fonts/" + r.request().url().split("/").pop()) }));
const check = ["600 20px 'Barlow Condensed'", "700 16px 'Barlow Condensed'", "400 13px 'Barlow'", "600 13px 'Barlow'", "400 12px 'DM Mono'", "500 12px 'DM Mono'"];
for (const [scr, body] of [["equipment", D.equipmentDense()], ["list", D.composerDense()], ["projects", D.projectsDense()], ["calendar", D.calendarDense()], ["project", D.projectDense()], ["catalog", D.catalogDense()]]) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("ERR", scr, e.message));
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${readFileSync("fonts/viewfinder.css", "utf8")}</style><style>${D.DENSE_CSS}</style></head><body>${body}</body></html>`, { waitUntil: "networkidle" });
  await page.evaluate((f) => Promise.all(f.map((x) => document.fonts.load(x, "Aa Tết ĐẾ 0123"))), check);
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
  console.log(scr, await page.evaluate((f) => f.every((x) => document.fonts.check(x, "Aa Tết")), check), "docW", await page.evaluate(() => document.documentElement.scrollWidth), "docH", await page.evaluate(() => document.documentElement.scrollHeight));
  await page.screenshot({ path: `dense-${scr}.png` });
  await page.close();
}
await browser.close();
