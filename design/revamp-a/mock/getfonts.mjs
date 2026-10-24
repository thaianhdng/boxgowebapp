import { THEMES } from "./themes.mjs";
import { writeFileSync, existsSync } from "node:fs";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
for (const [name, t] of Object.entries(THEMES)) {
  let css = "";
  for (let i = 0; i < 4 && !css; i++) { try { const r = await fetch(t.fonts, { headers: { "User-Agent": UA } }); if (r.ok) css = await r.text(); } catch (e) { await new Promise((r) => setTimeout(r, 1500)); } }
  if (!css) { console.log(name, "CSS failed"); continue; }
  const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g))];
  let n = 0;
  for (const u of urls) {
    const file = "fonts/" + u.split("/").slice(-2).join("_");
    if (!existsSync(file)) {
      for (let i = 0; i < 4; i++) { try { const r = await fetch(u); if (r.ok) { writeFileSync(file, Buffer.from(await r.arrayBuffer())); break; } } catch (e) { await new Promise((r) => setTimeout(r, 1000)); } }
    }
    if (existsSync(file)) { css = css.split(u).join("http://fonts.local/" + file.slice(6)); n++; }
  }
  writeFileSync(`fonts/${name}.css`, css);
  console.log(name, "faces", urls.length, "saved", n);
}
