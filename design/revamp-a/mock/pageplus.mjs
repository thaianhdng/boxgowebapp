import { cards, list } from "./data.mjs";

// "A pushed further": BOXGO as a camera's own menu system.
const svg = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>',
};
const I = (n) => `<i class="ic">${svg[n]}</i>`;

function top(mod) {
  return `<div class="osd">
    <div class="osd1"><span class="rec"></span><b>BOXGO</b><span class="sp"></span><span class="me">TA</span></div>
    <nav class="pages">${["PROJECTS", "CALENDAR", "EQUIPMENT"].map((m) => `<a class="${m === mod ? "on" : ""}">${m}</a>`).join("")}</nav>
  </div>`;
}
const cells = (arr) => `<div class="cells">${arr.map(([k, v, c]) => `<div class="cell${c ? " " + c : ""}"><span>${k}</span><b>${v}</b></div>`).join("")}</div>`;
const softkeys = (keys) => `<div class="soft">${keys.map(([k, c]) => `<button class="${c || ""}">${k}</button>`).join("")}</div>`;
const row = (k, v, more = true) => `<div class="mrow"><span class="mk">${k}</span><span class="mv">${v}</span>${more ? '<span class="chev">›</span>' : ""}</div>`;

function card(c, n) {
  const id = `L${String(n).padStart(2, "0")}`;
  return `<article class="clip">
    <div class="corners"></div>
    <div class="slate"><b>${id}</b>${c.tag ? `<span>${c.tag}</span>` : `<span class="dim">DRAFT</span>`}<span>${c.dates || "NO DATE"}</span>${c.v ? `<span>${c.v}/${c.lists}</span>` : `<span>V1</span>`}<button class="more">${I("more")}</button></div>
    <h2>${c.name}</h2>
    <div class="rows">
      ${c.ph ? `<div class="r"><span>PROD</span><p><b>${c.ph[0]}</b> · ${c.ph[1]}</p></div><div class="r"><span>RENT</span><p><b>${c.rh[0]}</b> · ${c.rh[1]}</p></div>` : `<div class="r"><span>PROJ</span><p class="dim">No project</p></div>`}
      ${c.note ? `<div class="r"><span>NOTE</span><p>${c.note}</p></div>` : ""}
      ${c.v ? `<div class="r"><span>${c.v}</span><p>${c.vnote}</p></div>` : c.listNote ? `<div class="r"><span>V1</span><p>${c.listNote}</p></div>` : ""}
      ${c.locs ? `<div class="r"><span>LOC</span><p>${c.locs}</p></div>` : ""}
      <div class="r g"><span>CAM</span><p>${c.cam}</p></div>
      <div class="r g"><span>LENS</span><p>${c.lens}</p></div>
    </div>
    ${c.warn ? `<div class="warn">● ${c.warn.toUpperCase()}</div>` : ""}
  </article>`;
}

export function equipmentPlus() {
  return `<div class="app">${top("EQUIPMENT")}
  ${cells([["LISTS", "34"], ["SHOOTING", "1", "red"], ["NEXT", "20 OCT"], ["STATUS", "✓ SAVED", "green"]])}
  <div class="search">${I("search")}<span>SEARCH PROJECTS</span></div>
  <div class="clips">${cards.map((c, i) => card(c, i + 1)).join("")}</div>
  ${softkeys([["● NEW LIST", "recbtn"], ["CATALOG"], ["SETTINGS"]])}
  </div>`;
}

export function composerPlus() {
  const L = list;
  const dh = L.days.map(([d, dt]) => `<span class="d"><b>${d}</b><small>${dt}</small></span>`).join("");
  const tabs = ["CAMERA", "LENSES", "GRIP", "LIGHTING", "OTHERS"];
  return `<div class="app">${top("EQUIPMENT")}
  <div class="crumb">EQUIP › <span class="tag">${L.tag}</span> › LIST</div>
  <h1>${L.name}</h1>
  ${cells([["DAYS", "10"], ["DATES", "2–13 NOV"], ["VERSION", "V2 / 3"], ["STATUS", "✓ SAVED", "green"]])}
  <div class="menu">
    ${row("PRODUCTION", `<b>${L.ph[0]}</b> · ${L.ph[1]}`)}
    ${row("RENTAL", `<b>${L.rh[0]}</b> · ${L.rh[1]}`)}
    ${row("PROJECT NOTE", L.note)}
    ${row("LIST NOTE", L.vnote)}
  </div>
  <div class="tabs">${tabs.map((t, i) => `<a class="${i === 0 ? "on" : ""}">${t}</a>`).join("")}</div>
  <div class="search s2">${I("search")}<span>SEARCH ITEMS</span></div>
  ${L.depts.slice(0, 1).map((d) => `<section class="dept">
    <div class="gh"><span class="it">ITEM</span><span class="mx">MAX</span>${dh}</div>
    ${d.subs.map(([s, items], si) => `<div class="sub">${s.toUpperCase()}</div>${items.map(([n, note, q], ii) => `<div class="qrow${si === 0 && ii === 1 ? " focus" : ""}"><span class="it"><span class="nm">${n}</span>${note ? `<small>${note}</small>` : ""}</span><b class="mx">${Math.max(...q)}</b>${q.map((x) => `<span class="q${x ? " on" : ""}">${x || "·"}</span>`).join("")}</div>`).join("")}`).join("")}
  </section>`).join("")}
  ${softkeys([["PREVIEW"], ["EDIT PROJECT"], ["PROJECT ›", "white"]])}
  </div>`;
}

export const PLUS_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#000;color:#F2F1EC;font:400 13px/1.4 Barlow,sans-serif;-webkit-font-smoothing:antialiased}
button{font:inherit;color:inherit;background:none;border:0}
.ic{display:inline-flex;width:14px;height:14px}
.ic svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
.app{padding:10px 12px 92px;min-height:100vh;position:relative}
/* screen-edge frame lines, like a monitor's safe area */
.app::before{content:"";position:fixed;inset:6px;pointer-events:none;z-index:5;
  background:
   linear-gradient(#fff3,#fff3) 0 0/22px 1px no-repeat, linear-gradient(#fff3,#fff3) 0 0/1px 22px no-repeat,
   linear-gradient(#fff3,#fff3) 100% 0/22px 1px no-repeat, linear-gradient(#fff3,#fff3) 100% 0/1px 22px no-repeat,
   linear-gradient(#fff3,#fff3) 0 100%/22px 1px no-repeat, linear-gradient(#fff3,#fff3) 0 100%/1px 22px no-repeat,
   linear-gradient(#fff3,#fff3) 100% 100%/22px 1px no-repeat, linear-gradient(#fff3,#fff3) 100% 100%/1px 22px no-repeat}
.osd1{display:flex;align-items:center;gap:8px;font:500 11px 'DM Mono',monospace;letter-spacing:.12em;padding:4px 2px 8px}
.osd1 b{font:700 16px 'Barlow Condensed',sans-serif;letter-spacing:.18em}
.rec{width:10px;height:10px;border-radius:50%;background:#FF2D20;box-shadow:0 0 10px #FF2D20}
.sp{flex:1}
.me{border:1px solid #555;border-radius:50%;width:24px;height:24px;display:grid;place-items:center;font-size:9px}
.pages{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #3A3A38}
.pages a{text-align:center;padding:7px 0;font:500 11px 'DM Mono',monospace;letter-spacing:.12em;color:#8E8C86;border-left:1px solid #3A3A38}
.pages a:first-child{border-left:0}
.pages a.on{background:#F2F1EC;color:#000}
.cells{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #3A3A38;border-top:0;margin-bottom:12px}
.cell{padding:5px 7px;border-left:1px solid #3A3A38}
.cell:first-child{border-left:0}
.cell span{display:block;font:400 8.5px 'DM Mono',monospace;letter-spacing:.14em;color:#77756F}
.cell b{font:500 13px 'DM Mono',monospace;letter-spacing:.02em;white-space:nowrap}
.cell.red b{color:#FF2D20}.cell.green b{color:#33E07A}
.search{display:flex;align-items:center;gap:8px;border:1px solid #3A3A38;padding:9px 10px;font:500 11px 'DM Mono',monospace;letter-spacing:.12em;color:#77756F;margin-bottom:14px}
.clips{display:flex;flex-direction:column;gap:14px}
.clip{position:relative;padding:12px 12px 10px}
.corners{position:absolute;inset:0;pointer-events:none;
  background:
   linear-gradient(#77756F,#77756F) 0 0/12px 1px no-repeat, linear-gradient(#77756F,#77756F) 0 0/1px 12px no-repeat,
   linear-gradient(#77756F,#77756F) 100% 0/12px 1px no-repeat, linear-gradient(#77756F,#77756F) 100% 0/1px 12px no-repeat,
   linear-gradient(#77756F,#77756F) 0 100%/12px 1px no-repeat, linear-gradient(#77756F,#77756F) 0 100%/1px 12px no-repeat,
   linear-gradient(#77756F,#77756F) 100% 100%/12px 1px no-repeat, linear-gradient(#77756F,#77756F) 100% 100%/1px 12px no-repeat}
.slate{display:flex;align-items:center;gap:0;font:500 10.5px 'DM Mono',monospace;letter-spacing:.06em;border:1px solid #3A3A38}
.slate>*{padding:3px 7px;border-left:1px solid #3A3A38;white-space:nowrap}
.slate b{border-left:0;background:#F2F1EC;color:#000}
.slate .dim{color:#77756F}
.slate .more{margin-left:auto;display:flex;padding:3px 8px}
h2{font:600 20px/1.08 'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.01em;margin:9px 0 7px}
.rows .r{display:grid;grid-template-columns:40px 1fr;gap:8px;padding:3px 0;border-top:1px solid #1A1A19}
.rows .r span{font:400 9.5px/17px 'DM Mono',monospace;letter-spacing:.12em;color:#77756F}
.rows .r p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12.5px;color:#D8D6D0}
.rows .r p b{color:#F2F1EC;font-weight:600}
.rows .r.g p{font:400 11px/17px 'DM Mono',monospace;color:#9A9892}
.rows .dim{color:#77756F}
.warn{margin-top:6px;font:500 10px 'DM Mono',monospace;letter-spacing:.1em;color:#FF2D20}
.soft{position:fixed;left:0;right:0;bottom:0;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;padding:10px 12px 26px;background:linear-gradient(transparent,#000 30%)}
.soft button{border:1px solid #55534E;background:#0B0B0A;padding:10px 0;font:500 10.5px 'DM Mono',monospace;letter-spacing:.12em}
.soft .recbtn{color:#FF2D20;border-color:#FF2D20}
.soft .white{background:#F2F1EC;color:#000;border-color:#F2F1EC}
.crumb{font:500 10.5px 'DM Mono',monospace;letter-spacing:.12em;color:#77756F;margin:12px 0 4px}
.crumb .tag{border:1px solid #77756F;padding:0 5px;color:#F2F1EC}
h1{font:600 26px/1.04 'Barlow Condensed',sans-serif;text-transform:uppercase;margin-bottom:10px}
.menu{border-top:1px solid #3A3A38;margin-bottom:12px}
.mrow{display:grid;grid-template-columns:98px 1fr 12px;gap:8px;align-items:baseline;padding:8px 2px;border-bottom:1px solid #1E1E1D}
.mk{font:400 9.5px 'DM Mono',monospace;letter-spacing:.12em;color:#77756F}
.mv{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12.5px}
.chev{color:#77756F;font-size:16px;line-height:1}
.tabs{display:flex;gap:0;border:1px solid #3A3A38;overflow:hidden;margin-bottom:8px}
.tabs a{flex:1;text-align:center;padding:7px 0;font:500 10px 'DM Mono',monospace;letter-spacing:.1em;color:#8E8C86;border-left:1px solid #3A3A38}
.tabs a:first-child{border-left:0}
.tabs a.on{background:#F2F1EC;color:#000}
.s2{margin-bottom:8px}
.gh,.qrow{display:grid;grid-template-columns:1fr 30px repeat(5,36px);align-items:center}
.gh{font:500 9px 'DM Mono',monospace;letter-spacing:.1em;color:#77756F;padding:5px 0;border-bottom:1px solid #3A3A38}
.gh>*{text-align:center}.gh .it{text-align:left}
.d{display:flex;flex-direction:column;align-items:center;line-height:1.2}.d b{color:#D8D6D0;font-weight:500}.d small{font-size:8px}
.sub{font:500 9.5px 'DM Mono',monospace;letter-spacing:.14em;color:#8E8C86;padding:9px 0 3px}
.qrow{padding:6px 0;border-bottom:1px solid #161615}
.qrow>*{text-align:center}.qrow .it{text-align:left;min-width:0}
.nm{font-weight:600;font-size:13px}
.it small{display:block;font-size:10.5px;color:#77756F}
.qrow .mx{font:500 13px 'DM Mono',monospace;color:#FF2D20}
.q{font:400 13px 'DM Mono',monospace;color:#3E3D3A}.q.on{color:#F2F1EC}
.qrow.focus{background:#F2F1EC;color:#000;margin:0 -6px;padding:6px 6px}
.qrow.focus .q,.qrow.focus .q.on,.qrow.focus small{color:#000}.qrow.focus .q:not(.on){color:#8E8C86}
`;
