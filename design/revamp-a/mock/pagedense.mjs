// "A pushed further", dense: as much info per phone screen as possible.
import { cards, list } from "./data.mjs";
const svg = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/></svg>',
  clip: '<svg viewBox="0 0 24 24"><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.3-2.3L15.6 7"/></svg>',
  sheet: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  grip: '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/></svg>',
};
const I = (n) => `<i class="ic">${svg[n]}</i>`;

// one-row header: logo · module switch · save tick · settings
const top = (mod) => `<header class="hd"><span class="rec"></span><b class="wm">BOXGO</b>
  <nav class="sw3">${["PROJECTS", "CALENDAR", "EQUIPMENT"].map((m) => `<a class="${m === mod ? "on" : ""}">${m}</a>`).join("")}</nav>
  <span class="tick">✓</span><button class="gear">${I("gear")}</button></header>`;
const bar = (ph, btns) => `<div class="bar"><div class="sf">${I("search")}<span>${ph}</span></div>${btns}</div>`;
const R = (k, v, cls = "") => `<div class="r ${cls}"><span>${k}</span><p>${v}</p></div>`;
const R2 = (a, b) => `<div class="r2">${a}${b}</div>`;

function ecard(c, n) {
  return `<article class="dc">
    <div class="t1"><h2>${c.name}</h2>${c.tag ? `<span class="tg">${c.tag}</span>` : ""}<button class="mo">${I("more")}</button></div>
    <div class="t2">${c.draft ? `<span class="dim">NO PROJECT</span>` : `<span>${c.dates.toUpperCase()}</span>`}${c.v && c.lists > 1 ? `<span><b>${c.v}</b> / ${c.lists} LISTS</span>` : "<span><b>V1</b></span>"}</div>
    ${c.ph ? R2(R("PROD", `<b>${c.ph[0]}</b> ${c.ph[1]}`), R("RENT", `<b>${c.rh[0]}</b> ${c.rh[1]}`)) : ""}
    ${c.note ? R("NOTE", c.note) : ""}
    ${c.v && c.vnote ? R(c.v, c.vnote) : c.listNote ? R("V1", c.listNote) : ""}
    ${c.locs ? R("LOC", c.locs) : ""}
    ${R("CAM", c.cam, "g")}${R("LENS", c.lens, "g")}
    ${c.warn ? `<div class="wn">● ${c.warn.toUpperCase()}</div>` : ""}
  </article>`;
}
export function equipmentDense() {
  return `<div class="app">${top("EQUIPMENT")}
  ${bar("SEARCH PROJECTS", `<button class="bt">CATALOG</button><button class="bt new">● NEW</button>`)}
  <div class="cnt">34 LISTS · 1 SHOOTING · NEXT 20 OCT</div>
  ${cards.map(ecard).join("")}
  ${ecard({ name: "Nestlé Milo Năng Động", tag: "TVC", dates: "15–16 Oct 26", ph: ["Mango Films", "Quân Hồ"], rh: ["VTS Rental", "Tuấn Lê"], v: "V1", vnote: "", lists: 1, locs: "Sân vận động Thống Nhất", cam: "Sony Venice 2 · SmallHD Cine 7", lens: "Fujinon Premista 28-100 · 80-250" })}
  </div>`;
}

export function composerDense() {
  const L = list;
  const days = [["D1", "2/11"], ["D2", "3/11"], ["D3", "4/11"], ["D4", "5/11"], ["D5", "6/11"], ["D6", "9/11"], ["D7", "10/11"]];
  const dh = days.map(([d, dt]) => `<span class="d"><b>${d}</b><small>${dt}</small></span>`).join("");
  const depts = [
    ["CAMERA", 9, [["CINEMA BODIES", [["ARRI 35", "", [2, 2, 2, 2, 2, 2, 2]], ["ARRI Mini LF", "B-cam", [0, 1, 1, 1, 0, 1, 1]]]], ["MONITORS", [["SmallHD Cine 7", "", [2, 3, 3, 3, 2, 2, 2]], ["Teradek Bolt 6 XT", "client feed", [1, 1, 1, 1, 1, 1, 1]]]], ["FILTERS", [["FSND 4×5.65″", "0.3–2.1", [1, 1, 1, 1, 1, 1, 1]], ["Black Pro-Mist 4×5.65″", "1/8", [0, 0, 1, 1, 1, 0, 0]]]]]],
    ["LENSES", 4, [["PRIMES", [["ARRI Signature Primes", "12 lens set", [1, 1, 1, 1, 1, 1, 1]], ["DZOFilms Catta Ace", "", [0, 0, 0, 1, 1, 0, 0]]]]]],
    ["GRIP", 6, [["DOLLY / TRACK", [["Panther", "", [0, 1, 0, 0, 1, 1, 0]], ["Doorway Dolly", "", [2, 2, 1, 0, 0, 0, 0]], ["Dana Dolly / Slider", "4ft rails", [1, 1, 1, 0, 0, 1, 1]]]], ["CRANE / JIB", [["Jib Arm", "", [0, 0, 1, 1, 0, 0, 0]]]]]],
  ];
  return `<div class="app sk">${top("EQUIPMENT")}
  <div class="cr">EQUIP › <span class="tg">${L.tag}</span> <span class="dim">10 DAYS · 2–6, 9–13 NOV 26</span></div>
  <h1>${L.name}</h1>
  <div class="info">
    ${R2(R("PROD", `<b>${L.ph[0]}</b> ${L.ph[1]}`), R("RENT", `<b>${L.rh[0]}</b> ${L.rh[1]}`))}
    ${R("NOTE", L.note)}
    <div class="r"><span class="vs">V2▾</span><p>${L.vnote} <em class="dim">· 3 lists</em></p></div>
  </div>
  ${bar("SEARCH ITEMS", "")}
  <div class="gh"><span class="it">ITEM</span><span class="mx">MAX</span>${dh}</div>
  ${depts.map(([d, n, subs]) => `<div class="dh">▾ ${d}<span class="sp"></span><span class="dim">${n} ITEMS</span></div>
    ${subs.map(([s, items]) => `<div class="sb">${s}</div>${items.map(([nm, note, q]) => `<div class="qr"><span class="it"><b>${nm}</b>${note ? ` <small>${note}</small>` : ""}</span><b class="mx">${Math.max(...q)}</b>${q.map((x) => `<span class="q${x ? " on" : ""}">${x || "·"}</span>`).join("")}</div>`).join("")}`).join("")}`).join("")}
  <div class="dh">▸ LIGHTING<span class="sp"></span><span class="dim">12 ITEMS</span></div><div class="dh">▸ OTHERS<span class="sp"></span><span class="dim">7 ITEMS</span></div>
  <div class="sbar"><button>PREVIEW</button><button>EDIT PROJECT</button><button class="white">PROJECT ›</button></div>
  </div>`;
}

const pcard = (p) => `<article class="dc pc ${p.st}">
  <div class="t1"><h2>${p.name}</h2>${p.tag ? `<span class="tg">${p.tag}</span>` : ""}</div>
  <div class="t2"><span>${p.dates}</span>${p.next ? `<span class="nx">NEXT <b>${p.next}</b></span>` : ""}<span class="sp"></span>${p.files ? `<span class="fi">${I("clip")}${p.files}</span>` : ""}<span class="fi ${p.list ? "" : "off"}">${I("sheet")}</span></div>
  ${R2(R("PROD", `<b>${p.ph[0]}</b> ${p.ph[1]}`), R("RENT", `<b>${p.rh[0]}</b> ${p.rh[1]}`))}
  ${p.note ? R("NOTE", p.note) : ""}${p.locs ? R("LOC", p.locs) : ""}
  ${p.warn ? `<div class="wn">● ${p.warn}</div>` : ""}
</article>`;
const grp = (name, n, cls, items, folded) => `<div class="gp ${cls}"><span class="gd"></span>${name}<span class="dim">${n}</span><span class="sp"></span><span class="dim">${folded ? "▸" : "▾"}</span></div>${folded ? "" : items.map((p) => pcard({ ...p, st: cls })).join("")}`;
export function projectsDense() {
  return `<div class="app">${top("PROJECTS")}
  ${bar("SEARCH PROJECTS", `<button class="bt new">● NEW</button>`)}
  ${grp("SHOOTING", 1, "shoot", [{ name: "Vietcombank Digibank", tag: "TVC", dates: "09–11 OCT", ph: ["Ogilvy Films", "Linh Trần"], rh: ["VTS Rental", "Tuấn Lê"], locs: "Vietcombank Tower – Q.1", next: "WRAP D3 SUN 11/10", list: true }])}
  ${grp("CONFIRMED", 4, "conf", [
    { name: "Nestlé Milo Năng Động", tag: "TVC", dates: "15–16 OCT", ph: ["Mango Films", "Quân Hồ"], rh: ["VTS Rental", "Tuấn Lê"], locs: "Sân vận động Thống Nhất", next: "REH THU 15/10", list: true },
    { name: "Đen Vâu – MV “Đi Về Nhà 2”", tag: "MV", dates: "21–23 OCT", ph: ["Đen Vâu Team", "Khánh Võ"], rh: ["Cinerent Saigon", "Phát Đỗ"], note: "Artist team handles wardrobe. We handle all camera + lighting.", locs: "Đà Lạt – Langbiang · Đà Lạt – night market", next: "TRV TUE 20/10", files: 2, list: true },
    { name: "Pepsi Tết 2027 — Big Family Table", tag: "TVC", dates: "2–6, 9–13 NOV", ph: ["Ogilvy Films", "Linh Trần"], rh: ["VTS Rental", "Hùng Nguyễn"], note: "Call time 05:30 at the studio gate. Camera truck parks on the left lane only.", locs: "Studio Kỳ Hòa – Q.10 · Hội An · Đà Nẵng airport", next: "MTG TUE 13/10", files: 4, list: true },
    { name: "Samsung Galaxy S27 Ultra — Night Mode", tag: "TVC", dates: "18, 20 NOV", ph: ["Mango Films", "Quân Hồ"], rh: ["Cinerent Saigon", "Phát Đỗ"], locs: "Bùi Viện walking street · Studio Phú Mỹ Hưng", next: "RCE FRI 6/11", list: true }])}
  ${grp("SOFT LOCK", 2, "soft", [
    { name: "Vinamilk Green Farm", tag: "TVC", dates: "3–4 DEC", ph: ["Bluesky Prod.", "Mai Phạm"], rh: ["Cinerent Saigon", "Phát Đỗ"], locs: "Mộc Châu", list: false },
    { name: "Grab Food — Lunch Rush", tag: "ONLINE", dates: "12 DEC", ph: ["Mango Films", "Quân Hồ"], rh: ["VTS Rental", "Tuấn Lê"], list: false }])}
  ${grp("DONE", 13, "done", [], true)}${grp("CANCELLED", 2, "done", [], true)}
  </div>`;
}

export function calendarDense() {
  const P = { V: "Vietcombank", M: "Milo", D: "Đen Vâu", P: "Pepsi", S: "Samsung" };
  const ev = { 9: [["red", "V"]], 10: [["red", "V"]], 11: [["red", "V"]], 13: [["blue", "P"]], 15: [["violet", "M"], ["red", "M"]], 16: [["red", "M"]], 20: [["grey", "D"]], 21: [["red", "D"], ["red", "S"], ["blue", "P"]], 22: [["red", "D"]], 23: [["red", "D"]], 27: [["amber", "P"]], 28: [["teal", "P"]], 30: [["teal", "S"]] };
  const days = [28, 29, 30, ...Array.from({ length: 31 }, (_, i) => i + 1), 1];
  const grid = days.map((d, i) => {
    const out = i < 3 || i > 33; const e = (!out && ev[d]) || [];
    const show = e.slice(0, 2);
    return `<div class="cd${out ? " out" : ""}${!out && d === 10 ? " today" : ""}${!out && d === 21 ? " clash" : ""}"><b>${d}${e.length > 2 ? `<span class="more">+${e.length - 2}</span>` : ""}</b>${show.map(([c, p]) => `<span class="ce ${c}">${P[p]}</span>`).join("")}</div>`;
  }).join("");
  const li = [["SAT 10", "red", "SHT", "Vietcombank Digibank", "D2 06:00"], ["SUN 11", "red", "SHT", "Vietcombank Digibank", "D3 06:00"], ["TUE 13", "blue", "MTG", "Pepsi Tết 2027 — Kick-off", "10:00 ONLINE"], ["THU 15", "violet", "REH", "Nestlé Milo Năng Động", "14:00"], ["THU 15", "red", "SHT", "Nestlé Milo Năng Động", "D1 05:00"], ["FRI 16", "red", "SHT", "Nestlé Milo Năng Động", "D2 05:00"], ["TUE 20", "grey", "TRV", "Đen Vâu – MV “Đi Về Nhà 2”", "ALL DAY"], ["WED 21", "red", "SHT", "Đen Vâu – MV “Đi Về Nhà 2”", "D1 ● CLASH"], ["WED 21", "red", "SHT", "Samsung S27 — Night Mode", "D1 ● CLASH"]];
  return `<div class="app">${top("CALENDAR")}
  ${bar("SEARCH PROJECTS", `<button class="bt">‹</button><b class="mo2">OCT 2026</b><button class="bt">›</button><button class="bt">TODAY</button>`)}
  <div class="wk">${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<span>${d}</span>`).join("")}</div>
  <div class="cal">${grid}</div>
  <div class="key">${[["red", "SHOOT"], ["amber", "PRELIGHT"], ["blue", "MEETING"], ["violet", "REHEARSAL"], ["teal", "RECCE"], ["grey", "TRAVEL"]].map(([c, n]) => `<span class="ki"><i class="kd ${c}"></i>${n}</span>`).join("")}</div>
  <div class="dh">▾ THIS MONTH<span class="sp"></span><span class="dim">14 EVENTS</span></div>
  ${li.map(([d, c, t, p, x]) => `<div class="lr"><span class="ld">${d}</span><span class="ev ${c}">${t}</span><span class="lp">${p}</span><span class="lt${x.includes("CLASH") ? " red" : ""}">${x}</span></div>`).join("")}
  </div>`;
}

export function projectDense() {
  const ev = [["13 OCT", "10:00", "blue", "MTG", "<b>Kick-off meeting</b> · online"], ["28 OCT", "", "teal", "RCE", "<b>Tech recce</b> · Hội An"], ["01 NOV", "", "amber", "PRE", "<b>Prelight</b> · Studio Kỳ Hòa"], ["02 NOV", "05:30", "red", "SHT", "<b>D1 Studio</b> · Studio Kỳ Hòa – Q.10"], ["03 NOV", "05:30", "red", "SHT", "<b>D2 Studio</b> · Studio Kỳ Hòa – Q.10"], ["04 NOV", "05:30", "red", "SHT", "<b>D3 Studio</b> · Studio Kỳ Hòa – Q.10"], ["05 NOV", "06:00", "red", "SHT", "<b>D4 Ext. day</b> · Hội An"], ["06 NOV", "06:00", "red", "SHT", "<b>D5 Ext. day</b> · Hội An – Old town"], ["07 NOV", "", "grey", "TRV", "<b>Travel</b> · Hội An → SGN"], ["09 NOV", "05:00", "red", "SHT", "<b>D6 Night ext.</b> · Q.1 – Nguyễn Huệ"], ["10 NOV", "05:30", "red", "SHT", "<b>D7 Studio</b> · Studio Kỳ Hòa – Q.10"], ["11 NOV", "05:30", "red", "SHT", "<b>D8 Studio</b> · Studio Kỳ Hòa – Q.10"], ["12 NOV", "07:00", "red", "SHT", "<b>D9 Airport</b> · Đà Nẵng airport"], ["13 NOV", "07:00", "red", "SHT", "<b>D10 Airport</b> · Đà Nẵng airport"], ["14 NOV", "", "grey", "TRV", "<b>Travel</b> · DAD → SGN"], ["20 NOV", "14:00", "blue", "MTG", "<b>Offline review</b> · online"]];
  return `<div class="app sk">${top("PROJECTS")}
  <div class="cr">PROJECTS › <span class="tg">TVC</span><span class="sp"></span><span class="st conf">● CONFIRMED ▾</span></div>
  <h1>Pepsi Tết 2027 — Big Family Table</h1>
  <nav class="jump">${["CALENDAR", "SCHEDULE", "LISTS", "FILES 3"].map((t, i) => `<a class="${i === 1 ? "on" : ""}">${t}</a>`).join("")}</nav>
  <div class="info">
    ${R2(R("PROD", "<b>Ogilvy Films</b> Linh Trần"), R("RENT", "<b>VTS Rental</b> Hùng Nguyễn"))}
    ${R("DAYS", "10 · 2–6, 9–13 Nov 26 · Studio Kỳ Hòa, Hội An, Đà Nẵng")}
    ${R("NOTE", "Call time 05:30 at the studio gate. Camera truck parks on the left lane only.")}
  </div>
  <div class="dh">▾ SCHEDULE<span class="sp"></span><span class="dim">16 EVENTS</span><span class="add">+ EVENT</span></div>
  ${ev.map(([d, t, c, k, x]) => `<div class="sr"><span class="ld">${d}</span><span class="lt">${t || "ALL DAY"}</span><span class="ev ${c}">${k}</span><span class="lp">${x}</span></div>`).join("")}
  <div class="dh">▾ EQUIPMENT LISTS<span class="sp"></span><span class="dim">3 / 5</span><span class="add">+ VERSION</span></div>
  ${[["V1", "First pass", "", "42 items"], ["V2", "Budget cut: no anamorphic package", "cur", "38 items"], ["V3", "Client wish list", "", "51 items"]].map(([v, n, c, k]) => `<div class="vr ${c}"><b>${v}</b><span class="lp">${n}</span><span class="lt">${c ? "<em>CURRENT</em> · " : ""}${k}</span><button class="mo">${I("more")}</button></div>`).join("")}
  <div class="dh">▾ FILES<span class="sp"></span><span class="dim">3</span><span class="add">+ FILE</span></div>
  ${[["SCRIPT", "Pepsi_Tet_v7.pdf"], ["TREATMENT", "Big Family Table — treatment deck"], ["RECCE", "Studio Kỳ Hòa photos"]].map(([k, n]) => `<div class="r fl"><span>${k}</span><p>${n}</p></div>`).join("")}
  <div class="sbar"><button>EDIT PROJECT</button><button class="white">OPEN V2 ›</button></div>
  </div>`;
}

export function catalogDense() {
  const it = (n, note) => `<div class="cr2"><span class="g">${I("grip")}</span><span class="lp"><b>${n}</b>${note ? ` <small>${note}</small>` : ""}</span></div>`;
  const sub = (n, on, items) => `<div class="sb2">${n}<span class="sp"></span><span class="chk ${on ? "on" : ""}">${on ? "✓" : ""}</span><span class="dim">PREVIEW</span><span class="add">+ ITEM</span></div>${items.map((x) => it(...x)).join("")}`;
  return `<div class="app">${top("EQUIPMENT")}
  <div class="cr">EQUIP › MASTER CATALOG <span class="dim">158 ITEMS</span><span class="sp"></span><span class="add">MANAGE</span><span class="add">COPY</span></div>
  ${bar("SEARCH CATALOG", `<button class="bt new">● NEW</button>`)}
  <div class="dh">▾ CAMERA<span class="sp"></span><span class="chk on">✓</span><span class="dim">IN CARD PREVIEW</span></div>
  ${sub("CINEMA BODIES", true, [["ARRI ALEXA 35"], ["ARRI ALEXA Mini LF"], ["Sony Venice 2", "8K, X-OCN"], ["RED V-Raptor XL"], ["Sony FX6"], ["Sony FX3"]])}
  ${sub("MONITORS", false, [["SmallHD Cine 7"], ["Atomos Shinobi 7"], ["Teradek Bolt 6 XT", "TX + 2 RX"]])}
  ${sub("FILTERS", true, [["Black Pro-Mist 4×5.65″", "1/8, 1/4, 1/2"], ["FSND 4×5.65″", "0.3 – 2.1"], ["NiSi VND"]])}
  <div class="dh">▸ LENSES<span class="sp"></span><span class="dim">31 ITEMS</span></div>
  <div class="dh">▸ GRIP<span class="sp"></span><span class="dim">44 ITEMS</span></div>
  <div class="dh">▸ LIGHTING<span class="sp"></span><span class="dim">52 ITEMS</span></div>
  <div class="dh">▸ OTHERS<span class="sp"></span><span class="dim">26 ITEMS</span></div>
  </div>`;
}

export const DENSE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#000;color:#F2F1EC;font:400 12px/1.35 Barlow,sans-serif;-webkit-font-smoothing:antialiased}
button{font:inherit;color:inherit;background:none;border:0}
.ic{display:inline-flex;width:13px;height:13px}.ic svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
.app{padding:6px 10px 20px;min-height:100vh}.app.sk{padding-bottom:60px}
.sp{flex:1}.dim{color:#77756F}
.hd{display:flex;align-items:center;gap:6px;height:30px;margin-bottom:6px}
.rec{width:8px;height:8px;border-radius:50%;background:#FF2D20;box-shadow:0 0 8px #FF2D20;flex:none}
.wm{font:700 14px 'Barlow Condensed',sans-serif;letter-spacing:.14em;margin-right:2px}
.sw3{flex:1;display:flex;border:1px solid #3A3A38}
.sw3 a{flex:1;text-align:center;padding:4px 0;font:500 9.5px 'DM Mono',monospace;letter-spacing:.06em;color:#8E8C86;border-left:1px solid #3A3A38}
.sw3 a:first-child{border-left:0}.sw3 a.on{background:#F2F1EC;color:#000}
.tick{color:#33E07A;font-size:12px}.gear{display:flex;color:#C8C6C0}.gear .ic{width:16px;height:16px}
.bar{display:flex;gap:4px;align-items:stretch;margin-bottom:6px;height:28px}
.sf{flex:1;display:flex;align-items:center;gap:6px;border:1px solid #3A3A38;padding:0 8px;font:500 9.5px 'DM Mono',monospace;letter-spacing:.1em;color:#77756F}
.bt{border:1px solid #3A3A38;padding:0 8px;display:flex;align-items:center;font:500 9.5px 'DM Mono',monospace;letter-spacing:.08em}
.bt.new{color:#FF2D20;border-color:#FF2D20}
.mo2{font:500 10.5px 'DM Mono',monospace;letter-spacing:.08em;display:flex;align-items:center;padding:0 4px}
.cnt{font:400 8.5px 'DM Mono',monospace;letter-spacing:.12em;color:#77756F;margin:0 0 2px}
.dc{position:relative;padding:6px 0 7px;border-top:1px solid #2A2A28}
.dc::before{content:"";position:absolute;left:0;top:-1px;width:8px;height:6px;border-left:1px solid #8E8C86;border-top:1px solid #8E8C86}
.dc::after{content:"";position:absolute;right:0;top:-1px;width:8px;height:6px;border-right:1px solid #8E8C86;border-top:1px solid #8E8C86}
.t1{display:flex;align-items:flex-start;gap:6px}
h2{flex:1;min-width:0;font:600 15px/1.1 'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tg{border:1px solid #8E8C86;padding:0 4px;font:500 9px/13px 'DM Mono',monospace;letter-spacing:.08em;color:#F2F1EC;flex:none}
.mo{display:flex;color:#8E8C86;margin-right:-3px}.mo .ic{width:14px;height:14px}
.t2{display:flex;align-items:center;gap:8px;font:500 9.5px/14px 'DM Mono',monospace;letter-spacing:.05em;color:#C8C6C0;margin:1px 0 2px}
.t2 b{color:#F2F1EC;font-weight:500}.t2 .nx{color:#8E8C86}
.fi{display:inline-flex;align-items:center;gap:2px;color:#F2F1EC}.fi.off{color:#3A3A38}.fi .ic{width:12px;height:12px}
.r{display:grid;grid-template-columns:30px 1fr;gap:4px;min-width:0}
.r>span{font:400 8.5px/16px 'DM Mono',monospace;letter-spacing:.1em;color:#6E6C67}
.r p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11.5px;line-height:16px;color:#D8D6D0;min-width:0}
.r p b{color:#F2F1EC;font-weight:600}
.r.g p{font:400 10px/16px 'DM Mono',monospace;color:#9A9892}
.r2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.wn{font:500 9px 'DM Mono',monospace;letter-spacing:.1em;color:#FF2D20}
.pc{padding-left:7px}.pc::before{width:2px;height:auto;bottom:6px;top:6px;border:0;background:#77756F}
.pc.shoot::before{background:#FF2D20}.pc.conf::before{background:#33E07A}.pc.soft::before{background:transparent;border-left:1px dashed #F2F1EC}
.pc::after{display:none}
.gp{display:flex;align-items:center;gap:6px;margin-top:6px;padding:4px 0 3px;border-top:2px solid #F2F1EC;font:500 10px 'DM Mono',monospace;letter-spacing:.14em}
.gd{width:7px;height:7px;border-radius:50%;background:#77756F}
.shoot .gd{background:#FF2D20;box-shadow:0 0 6px #FF2D20}.conf .gd{background:#33E07A}.soft .gd{background:transparent;border:1px solid #F2F1EC}
.cr{display:flex;align-items:center;gap:6px;font:500 9.5px 'DM Mono',monospace;letter-spacing:.1em;color:#8E8C86;margin:2px 0 2px}
.cr .tg{color:#F2F1EC}
h1{font:600 20px/1.05 'Barlow Condensed',sans-serif;text-transform:uppercase;margin-bottom:4px}
.info{border-top:1px solid #3A3A38;border-bottom:1px solid #3A3A38;padding:3px 0;margin-bottom:6px}
.vs{font:500 10px/16px 'DM Mono',monospace!important;color:#F2F1EC!important;border:1px solid #77756F;text-align:center;align-self:center;line-height:14px!important}
.info em{font-style:normal}
.st{font:500 9.5px 'DM Mono',monospace;padding:1px 5px;letter-spacing:.08em}.st.conf{background:#33E07A;color:#000}
.gh,.qr{display:grid;grid-template-columns:1fr 22px repeat(7,26px);align-items:center}
.gh{font:500 8px 'DM Mono',monospace;letter-spacing:.06em;color:#77756F;padding:2px 0;border-bottom:1px solid #3A3A38;position:sticky;top:0;background:#000}
.gh>*{text-align:center}.gh .it{text-align:left}
.d{display:flex;flex-direction:column;align-items:center;line-height:1.15}.d b{color:#D8D6D0;font-weight:500}.d small{font-size:7.5px}
.dh{display:flex;align-items:center;gap:6px;margin-top:5px;padding:4px 0 2px;border-top:2px solid #F2F1EC;font:500 10px 'DM Mono',monospace;letter-spacing:.14em}
.sb{font:500 8.5px 'DM Mono',monospace;letter-spacing:.14em;color:#8E8C86;padding:4px 0 1px}
.qr{padding:2px 0;border-bottom:1px solid #151514;min-height:21px}
.qr>*{text-align:center}.qr .it{text-align:left;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11.5px}
.qr .it b{font-weight:600}.qr small{font-size:10px;color:#77756F}
.qr .mx{font:500 11.5px 'DM Mono',monospace;color:#FF2D20}
.q{font:400 11.5px 'DM Mono',monospace;color:#3E3D3A}.q.on{color:#F2F1EC}
.sbar{position:fixed;left:0;right:0;bottom:0;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:6px 10px 22px;background:#000;border-top:1px solid #2A2A28}
.sbar button{border:1px solid #55534E;padding:6px 0;font:500 9.5px 'DM Mono',monospace;letter-spacing:.1em}
.sbar .white{background:#F2F1EC;color:#000;border-color:#F2F1EC}
.wk{display:grid;grid-template-columns:repeat(7,1fr);font:400 8px 'DM Mono',monospace;color:#77756F;text-align:center;padding-bottom:2px}
.cal{display:grid;grid-template-columns:repeat(7,1fr);border-top:1px solid #3A3A38;border-left:1px solid #3A3A38}
.cd{height:44px;border-right:1px solid #3A3A38;border-bottom:1px solid #3A3A38;padding:2px;display:flex;flex-direction:column;gap:1px;position:relative;min-width:0;overflow:hidden}
.cd b{font:500 9.5px 'DM Mono',monospace;line-height:11px}.cd.out b{color:#3A3A38}
.cd.today{background:#F2F1EC}.cd.today b{color:#000}
.cd.clash::after{content:"";position:absolute;top:3px;right:3px;width:5px;height:5px;border-radius:50%;background:#FF2D20}
.ce{display:block;font:500 8px/11px Barlow,sans-serif;padding:0 2px;border-left:2px solid;background:#161615;white-space:nowrap;overflow:hidden;text-overflow:clip;color:#E8E6E0}
.r.fl{grid-template-columns:62px 1fr}.vs{white-space:nowrap}
.cd b{display:flex;justify-content:space-between}.cd.clash .more{margin-right:8px}.cd .more{font:400 7.5px 'DM Mono',monospace;color:#8E8C86}
.cd.today .ce{background:#000}
.ce.red,.ev.red{border-color:#FF2D20}.ce.amber,.ev.amber{border-color:#FF9F1C}.ce.blue,.ev.blue{border-color:#4D8DFF}.ce.violet,.ev.violet{border-color:#A779FF}.ce.grey,.ev.grey{border-color:#77756F}.ce.teal,.ev.teal{border-color:#21C7B5}
.key{display:flex;flex-wrap:wrap;gap:2px 9px;font:400 8px 'DM Mono',monospace;letter-spacing:.08em;color:#8E8C86;margin:4px 0 2px}
.ki{display:inline-flex;align-items:center;gap:3px}.kd{width:6px;height:6px;background:#77756F}
.kd.red{background:#FF2D20}.kd.amber{background:#FF9F1C}.kd.blue{background:#4D8DFF}.kd.violet{background:#A779FF}.kd.teal{background:#21C7B5}
.ev{display:inline-block;font:500 8px/1.5 'DM Mono',monospace;letter-spacing:.04em;padding:0 3px;border-left:2px solid;background:#141413;text-align:center}
.lr,.sr,.vr{display:grid;align-items:center;gap:6px;padding:2px 0;border-bottom:1px solid #151514;min-height:21px}
.lr{grid-template-columns:42px 30px 1fr auto}.sr{grid-template-columns:42px 42px 30px 1fr}
.vr{grid-template-columns:22px 1fr auto 14px}
.ld{font:500 9.5px 'DM Mono',monospace}.lt{font:400 9px 'DM Mono',monospace;color:#8E8C86;white-space:nowrap}.lt.red{color:#FF2D20}
.lt em{font-style:normal;color:#33E07A}
.lp{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11.5px}.lp b{font-weight:600}
.vr b{font:500 10px 'DM Mono',monospace;border:1px solid #77756F;text-align:center}.vr.cur b{background:#F2F1EC;color:#000}
.jump{display:flex;border:1px solid #3A3A38;margin-bottom:5px}
.jump a{flex:1;text-align:center;padding:3px 0;font:500 9px 'DM Mono',monospace;letter-spacing:.08em;color:#8E8C86;border-left:1px solid #3A3A38}
.jump a:first-child{border-left:0}.jump a.on{background:#F2F1EC;color:#000}
.add{font:500 9px 'DM Mono',monospace;letter-spacing:.08em;color:#F2F1EC;margin-left:6px}
.more2{font:500 8.5px 'DM Mono',monospace;letter-spacing:.1em;color:#77756F;padding:3px 0}
.sb2{display:flex;align-items:center;gap:5px;font:500 8.5px 'DM Mono',monospace;letter-spacing:.12em;color:#8E8C86;padding:5px 0 1px}
.chk{width:11px;height:11px;border:1px solid #77756F;display:grid;place-items:center;font-size:7.5px}
.chk.on{background:#F2F1EC;color:#000;border-color:#F2F1EC}
.cr2{display:grid;grid-template-columns:18px 1fr;gap:4px;align-items:center;padding:2px 0;border-bottom:1px solid #151514;min-height:22px}
.cr2 .g{color:#55534E;display:flex}.cr2 small{font-size:10px;color:#77756F}
`;
