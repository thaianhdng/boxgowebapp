// "A pushed further": the other screens.
const svg = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  clip: '<svg viewBox="0 0 24 24"><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.3-2.3L15.6 7"/></svg>',
  sheet: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  grip: '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/></svg>',
};
const I = (n) => `<i class="ic">${svg[n]}</i>`;
const top = (mod) => `<div class="osd">
  <div class="osd1"><span class="rec"></span><b>BOXGO</b><span class="sp"></span><span class="me">TA</span></div>
  <nav class="pages">${["PROJECTS", "CALENDAR", "EQUIPMENT"].map((m) => `<a class="${m === mod ? "on" : ""}">${m}</a>`).join("")}</nav></div>`;
const cells = (arr) => `<div class="cells">${arr.map(([k, v, c]) => `<div class="cell${c ? " " + c : ""}"><span>${k}</span><b>${v}</b></div>`).join("")}</div>`;
const soft = (keys) => `<div class="soft">${keys.map(([k, c]) => `<button class="${c || ""}">${k}</button>`).join("")}</div>`;
const row = (k, v, more = true) => `<div class="mrow"><span class="mk">${k}</span><span class="mv">${v}</span>${more ? '<span class="chev">›</span>' : "<span></span>"}</div>`;
const tabs = (arr, on) => `<div class="tabs">${arr.map((t) => `<a class="${t === on ? "on" : ""}">${t}</a>`).join("")}</div>`;
const search = (t) => `<div class="search">${I("search")}<span>${t}</span></div>`;

// ---------- Projects home ----------
const pcard = (p) => `<article class="clip pc ${p.st}">
  <div class="corners"></div>
  <div class="slate"><b class="stb">${p.code}</b>${p.tag ? `<span>${p.tag}</span>` : ""}<span>${p.dates}</span></div>
  <h2>${p.name}</h2>
  <div class="rows">
    ${p.ph ? `<div class="r"><span>PROD</span><p><b>${p.ph[0]}</b> · ${p.ph[1]}</p></div>` : ""}
    ${p.rh ? `<div class="r"><span>RENT</span><p><b>${p.rh[0]}</b> · ${p.rh[1]}</p></div>` : ""}
    ${p.note ? `<div class="r"><span>NOTE</span><p>${p.note}</p></div>` : ""}
    ${p.locs ? `<div class="r"><span>LOC</span><p>${p.locs}</p></div>` : ""}
  </div>
  ${p.warn ? `<div class="warn">● ${p.warn}</div>` : ""}
  <div class="pfoot"><span class="next">${p.next ? `NEXT <b>${p.next}</b>` : ""}</span>${p.files ? `<span class="fi">${I("clip")}${p.files}</span>` : ""}<span class="fi ${p.list ? "" : "off"}">${I("sheet")}</span></div>
</article>`;
const group = (name, n, cls, items, folded) => `<div class="grp ${cls}"><div class="gh2"><span class="gdot"></span><b>${name}</b><span class="gn">${n}</span><span class="sp"></span><span class="gch">${folded ? "▸" : "▾"}</span></div>${folded ? "" : `<div class="clips">${items.map(pcard).join("")}</div>`}</div>`;

export function projectsPlus() {
  return `<div class="app">${top("PROJECTS")}
  ${cells([["ACTIVE", "17"], ["SHOOTING", "1", "red"], ["NEXT", "13 OCT"], ["STATUS", "✓ SAVED", "green"]])}
  ${search("SEARCH PROJECTS")}
  ${group("SHOOTING", 1, "shoot", [{ st: "shoot", code: "REC", tag: "TVC", dates: "09–11 OCT 26", name: "Vietcombank Digibank", ph: ["Ogilvy Films", "Linh Trần"], rh: ["VTS Rental", "Tuấn Lê"], locs: "Vietcombank Tower – Q.1", next: "WRAP D3 · SUN 11/10", list: true }])}
  ${group("CONFIRMED", 4, "conf", [{ st: "conf", code: "CONF", tag: "MV", dates: "21–23 OCT 26", name: "Đen Vâu – MV “Đi Về Nhà 2”", ph: ["Đen Vâu Team", "Khánh Võ"], rh: ["Cinerent Saigon", "Phát Đỗ"], note: "Artist team handles wardrobe. We handle all camera + lighting.", locs: "Đà Lạt – Langbiang · Đà Lạt – night market", next: "TRAVEL · TUE 20/10", files: 2, list: true }])}
  <div class="more-hint">+ 3 MORE CONFIRMED</div>
  ${group("SOFT LOCK", 12, "soft", [], true)}
  ${group("DONE", 13, "done", [], true)}
  ${soft([["● NEW PROJECT", "recbtn"], ["SETTINGS"]])}
  </div>`;
}

// ---------- Calendar ----------
export function calendarPlus() {
  // October 2026, weeks starting Monday (1 Oct = Thursday)
  const ev = { 9: ["SHT", "red"], 10: ["SHT", "red"], 11: ["SHT", "red"], 13: ["MTG", "blue"], 15: ["REH", "violet"], 20: ["TRV", "grey"], 21: ["SHT", "red"], 22: ["SHT", "red"], 23: ["SHT", "red"], 27: ["PRE", "amber"], 28: ["SHT", "red"] };
  const days = [28, 29, 30, ...Array.from({ length: 31 }, (_, i) => i + 1), 1];
  const grid = days.map((d, i) => {
    const out = i < 3 || i > 33;
    const e = !out && ev[d];
    return `<div class="cd${out ? " out" : ""}${!out && d === 10 ? " today" : ""}${!out && d === 21 ? " clash" : ""}"><b>${d}</b>${e ? `<span class="ev ${e[1]}">${e[0]}</span>` : ""}${!out && d === 21 ? '<span class="ev violet">MTG</span>' : ""}</div>`;
  }).join("");
  const li = [["SAT 10/10", "SHT", "red", "Vietcombank Digibank", "D2 · 06:00"], ["TUE 13/10", "MTG", "blue", "Pepsi Tết 2027 — Big Family Table", "10:00 · ONLINE"], ["THU 15/10", "REH", "violet", "Nestlé Milo Năng Động", "14:00"], ["TUE 20/10", "TRV", "grey", "Đen Vâu – MV “Đi Về Nhà 2”", "ALL DAY"], ["WED 21/10", "SHT", "red", "Đen Vâu – MV “Đi Về Nhà 2”", "D1 · ● CLASH"]];
  return `<div class="app">${top("CALENDAR")}
  ${search("SEARCH PROJECTS")}
  <div class="mhead"><button>‹</button><b>OCTOBER 2026</b><button>›</button><span class="sp"></span><button class="b2">TODAY</button></div>
  <div class="wk">${["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => `<span>${d}</span>`).join("")}</div>
  <div class="cal">${grid}</div>
  <div class="key">${[["red","SHT","SHOOT"],["amber","PRE","PRELIGHT"],["blue","MTG","MEETING"],["violet","REH","REHEARSAL"],["grey","TRV","TRAVEL"]].map(([c,k,n]) => `<span class="ki"><span class="ev ${c}">${k}</span>${n}</span>`).join("")}</div>
  <div class="lh"><b>THIS MONTH</b><span class="sp"></span><span class="mk">HIDE</span></div>
  ${li.map(([d, c, col, p, t]) => `<div class="lrow"><span class="ld">${d}</span><span class="ev ${col}">${c}</span><span class="lp">${p}</span><span class="lt${t.includes("CLASH") ? " red" : ""}">${t}</span></div>`).join("")}
  ${soft([["+ EVENT", ""], ["● NEW PROJECT", "recbtn"]])}
  </div>`;
}

// ---------- Project page ----------
export function projectPagePlus() {
  return `<div class="app">${top("PROJECTS")}
  <div class="crumb">PROJECTS › <span class="tag">TVC</span> › PROJECT</div>
  <h1>Pepsi Tết 2027 — Big Family Table</h1>
  <div class="status3"><a>SOFT LOCK</a><a class="on green">● CONFIRMED</a><a>CANCELLED</a></div>
  ${tabs(["CALENDAR", "SCHEDULE", "LISTS", "FILES"], "SCHEDULE")}
  <div class="menu">
    ${row("PRODUCTION", "<b>Ogilvy Films</b> · Linh Trần")}
    ${row("RENTAL", "<b>VTS Rental</b> · Hùng Nguyễn")}
    ${row("SHOOT DAYS", "8 · 2–6, 9–11 Nov 26")}
    ${row("PROJECT NOTE", "Call time 05:30 at the studio gate. Camera truck parks on the left lane only.")}
  </div>
  <div class="sec"><b>SCHEDULE</b><span class="sp"></span><span class="mk">11 EVENTS</span></div>
  ${[["13 OCT", "10:00", "MTG", "blue", "Kick-off meeting", "ONLINE"], ["28 OCT", "", "RCE", "teal", "Tech recce", "Hội An"], ["01 NOV", "", "PRE", "amber", "Prelight", "Studio Kỳ Hòa"], ["02 NOV", "05:30", "SHT", "red", "D1 · Studio", "Studio Kỳ Hòa – Q.10"], ["03 NOV", "05:30", "SHT", "red", "D2 · Studio", "Studio Kỳ Hòa – Q.10"]].map(([d, t, c, col, n, l]) => `<div class="srow"><span class="ld">${d}</span><span class="lt">${t || "ALL DAY"}</span><span class="ev ${col}">${c}</span><span class="lp"><b>${n}</b> · ${l}</span></div>`).join("")}
  <div class="sec"><b>EQUIPMENT LISTS</b><span class="sp"></span><span class="mk">3 / 5</span></div>
  ${[["V1", "First pass", ""], ["V2", "Budget cut: no anamorphic package", "CURRENT"], ["V3", "Client wish list", ""]].map(([v, n, c]) => `<div class="vrow${c ? " cur" : ""}"><b>${v}</b><span class="lp">${n}</span><span class="mk">${c || "MAKE CURRENT"}</span><span class="chev">›</span></div>`).join("")}
  ${soft([["+ EVENT"], ["+ FILE"], ["EDIT PROJECT", "white"]])}
  </div>`;
}

// ---------- Edit project pop-up ----------
export function editPlus() {
  const f = (k, v) => `<div class="frow"><span class="mk">${k}</span><span class="fv">${v}</span></div>`;
  return `<div class="app dimbg">${top("PROJECTS")}
  <div class="crumb">PROJECTS › <span class="tag">TVC</span> › PROJECT</div>
  <h1>Pepsi Tết 2027 — Big Family Table</h1>
  <div class="win">
    <div class="wt"><b>EDIT PROJECT</b><span class="sp"></span>${I("x")}</div>
    ${f("NAME", "Pepsi Tết 2027 — Big Family Table")}
    <div class="two">${f("TAG", "TVC ▾")}${f("STATUS", "CONFIRMED ▾")}</div>
    <div class="two">${f("PRODUCTION", "Ogilvy Films ▾")}${f("PRODUCER", "Linh Trần")}</div>
    <div class="two">${f("RENTAL", "VTS Rental ▾")}${f("GAFFER", "Hùng Nguyễn")}</div>
    <div class="sec in"><b>SHOOT DAYS</b><span class="sp"></span><span class="mk">8</span></div>
    ${[["D1", "02/11", "Prelight", "Studio Kỳ Hòa – Q.10"], ["D2", "03/11", "Studio", "Studio Kỳ Hòa – Q.10"], ["D3", "04/11", "Studio", "Studio Kỳ Hòa – Q.10"], ["D4", "05/11", "Exterior day", "Hội An"], ["D5", "06/11", "Exterior day", "Hội An – Old town"], ["D6", "09/11", "Studio", "Studio Kỳ Hòa – Q.10"], ["D7", "10/11", "Studio", "Studio Kỳ Hòa – Q.10"], ["D8", "11/11", "Night ext.", "Q.1 – Nguyễn Huệ"]].map(([d, dt, t, l]) => `<div class="dayrow"><b>${d}</b><span class="dbox">${dt}</span><span class="dbox w">${t}</span><span class="dl">${l}</span></div>`).join("")}
    <div class="addday">+ ADD SHOOT DAY</div>
    <div class="wsoft"><button>CANCEL</button><button class="white">SAVE CHANGES</button></div>
  </div>
  </div>`;
}

// ---------- Settings ----------
export function settingsPlus() {
  const seg = (arr, on) => `<span class="seg">${arr.map((a) => `<a class="${a === on ? "on" : ""}">${a}</a>`).join("")}</span>`;
  return `<div class="app dimbg">${top("PROJECTS")}
  <div class="win tall">
    <div class="wt"><b>SETTINGS</b><span class="sp"></span>${I("x")}</div>
    ${tabs(["GENERAL", "PREFERENCES", "DATA"], "GENERAL")}
    <div class="sec in"><b>YOUR DETAILS</b><span class="sp"></span><span class="mk">IN PDF</span></div>
    ${[["NAME", "Thai Anh Dang", true], ["EMAIL", "name@email.com", false], ["PHONE", "(+84) 969 609 379", true]].map(([k, v, on]) => `<div class="mrow"><span class="mk">${k}</span><span class="mv">${v}</span><span class="tick ${on ? "on" : ""}">${on ? "✓" : ""}</span></div>`).join("")}
    <div class="sec in"><b>APPEARANCE</b></div>
    <div class="mrow"><span class="mk">THEME</span>${seg(["DARK", "LIGHT", "AUTO"], "DARK")}<span></span></div>
    <div class="mrow"><span class="mk">UI SIZE</span>${seg(["SMALL", "NORMAL", "LARGE"], "NORMAL")}<span></span></div>
    ${row("HIGHLIGHT", '<span class="sw"></span> White')}
    <div class="sec in"><b>ACCOUNT</b></div>
    <div class="mrow"><span class="mk">SIGNED IN</span><span class="mv">name@email.com</span><span></span></div>
    <div class="wsoft"><button class="redline">SIGN OUT</button></div>
  </div>
  </div>`;
}

// ---------- Master Catalog ----------
export function catalogPlus() {
  const item = (n, note) => `<div class="crow"><span class="g">${I("grip")}</span><span class="lp"><b>${n}</b>${note ? `<small>${note}</small>` : ""}</span><span class="chev">›</span></div>`;
  return `<div class="app">${top("EQUIPMENT")}
  <div class="crumb">EQUIP › MASTER CATALOG</div>
  ${cells([["ITEMS", "158"], ["CATEGORIES", "5"], ["BRANDS", "24"], ["STATUS", "✓ SAVED", "green"]])}
  ${tabs(["CAMERA", "LENSES", "GRIP", "LIGHTING", "OTHERS"], "CAMERA")}
  ${search("SEARCH CATALOG")}
  <div class="cathead"><b>CAMERA</b><span class="sp"></span><span class="chk on">✓</span><span class="mk">IN CARD PREVIEW</span></div>
  <div class="subh"><b>CINEMA BODIES</b><span class="sp"></span><span class="chk on">✓</span><span class="mk">PREVIEW</span><span class="add">+ ITEM</span></div>
  ${item("ARRI ALEXA 35", "")}${item("ARRI ALEXA Mini LF", "")}${item("Sony Venice 2", "8K, X-OCN")}${item("RED V-Raptor XL", "")}
  <div class="subh"><b>FILTERS</b><span class="sp"></span><span class="chk"></span><span class="mk">PREVIEW</span><span class="add">+ ITEM</span></div>
  ${item("Black Pro-Mist 4×5.65″", "1/8, 1/4, 1/2")}${item("FSND 4×5.65″", "0.3 – 2.1")}
  ${soft([["● NEW ITEM", "recbtn"], ["MANAGE"], ["COPY CATALOG"]])}
  </div>`;
}

export const PLUS2_CSS = `
.grp{margin-bottom:14px}
.gh2{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:2px solid #F2F1EC;font:500 11px 'DM Mono',monospace;letter-spacing:.14em}
.gh2 b{font-weight:500}
.gdot{width:9px;height:9px;border-radius:50%;background:#77756F}
.shoot .gdot{background:#FF2D20;box-shadow:0 0 8px #FF2D20}.conf .gdot{background:#33E07A}.soft .gdot{background:transparent;border:1.5px solid #F2F1EC}
.gn{color:#77756F}.gch{color:#77756F}
.grp .clips{margin-top:10px}
.pc .slate b.stb{background:#77756F;color:#000}
.pc.shoot .slate b.stb{background:#FF2D20;color:#fff}.pc.conf .slate b.stb{background:#33E07A;color:#000}
.pfoot{display:flex;align-items:center;gap:10px;margin-top:6px;padding-top:6px;border-top:1px dashed #262624;font:400 10.5px 'DM Mono',monospace;letter-spacing:.06em;color:#8E8C86}
.pfoot .next{flex:1}.pfoot .next b{color:#F2F1EC;font-weight:500}
.fi{display:inline-flex;align-items:center;gap:3px;color:#F2F1EC}.fi.off{color:#3A3A38}
.more-hint{font:500 10px 'DM Mono',monospace;letter-spacing:.12em;color:#77756F;text-align:center;padding:2px 0 12px}
.mhead{display:flex;align-items:center;gap:10px;margin:2px 0 8px;font:500 13px 'DM Mono',monospace;letter-spacing:.12em}
.mhead button{border:1px solid #3A3A38;width:28px;height:26px;font-size:16px}
.mhead .b2{width:auto;padding:0 10px;font:500 10px 'DM Mono',monospace;letter-spacing:.12em}
.wk{display:grid;grid-template-columns:repeat(7,1fr);font:400 8.5px 'DM Mono',monospace;letter-spacing:.12em;color:#77756F;text-align:center;padding-bottom:4px}
.cal{display:grid;grid-template-columns:repeat(7,1fr);border-top:1px solid #3A3A38;border-left:1px solid #3A3A38}
.cd{height:58px;border-right:1px solid #3A3A38;border-bottom:1px solid #3A3A38;padding:3px;display:flex;flex-direction:column;gap:2px;position:relative}
.cd b{font:500 11px 'DM Mono',monospace}
.cd.out b{color:#3A3A38}
.cd.today{background:#F2F1EC}.cd.today b{color:#000}
.cd.clash::after{content:"";position:absolute;top:4px;right:4px;width:6px;height:6px;border-radius:50%;background:#FF2D20}
.ev{display:inline-block;font:500 8.5px/1.5 'DM Mono',monospace;letter-spacing:.06em;padding:0 3px;border-left:2px solid;color:#F2F1EC;background:#141413}
.ev.red{border-color:#FF2D20}.ev.amber{border-color:#FF9F1C}.ev.blue{border-color:#4D8DFF}.ev.violet{border-color:#A779FF}.ev.grey{border-color:#77756F}.ev.teal{border-color:#21C7B5}
.cd.today .ev{background:#000}
.key{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;font:400 9px 'DM Mono',monospace;letter-spacing:.08em;color:#8E8C86;margin:8px 0 12px}
.lh,.sec{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:2px solid #F2F1EC;font:500 11px 'DM Mono',monospace;letter-spacing:.14em;margin-top:6px}
.lh b,.sec b{font-weight:500}
.lrow,.srow{display:grid;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #1A1A19}
.lrow{grid-template-columns:66px 34px 1fr auto}
.srow{grid-template-columns:50px 50px 34px 1fr}
.ld{font:500 10.5px 'DM Mono',monospace;letter-spacing:.04em}
.lt{font:400 10px 'DM Mono',monospace;color:#8E8C86;white-space:nowrap}
.lt.red{color:#FF2D20}
.lp{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12.5px}
.lp b{font-weight:600}
.status3{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #3A3A38;margin-bottom:8px}
.status3 a{text-align:center;padding:7px 0;font:500 10.5px 'DM Mono',monospace;letter-spacing:.1em;color:#77756F;border-left:1px solid #3A3A38}
.status3 a:first-child{border-left:0}
.status3 a.on.green{background:#33E07A;color:#000}
.vrow{display:grid;grid-template-columns:30px 1fr auto 12px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #1A1A19}
.vrow b{font:500 12px 'DM Mono',monospace;border:1px solid #77756F;text-align:center;padding:1px 0}
.vrow.cur b{background:#F2F1EC;color:#000;border-color:#F2F1EC}
.vrow .mk{font-size:9px}.vrow.cur .mk{color:#33E07A}
.dimbg>:not(.win){opacity:.35}
.win{position:fixed;left:10px;right:10px;top:140px;bottom:20px;background:#0B0B0A;border:1px solid #77756F;padding:0 12px 70px;overflow:hidden;box-shadow:0 0 0 100vmax rgba(0,0,0,.55)}
.win.tall{top:64px}
.wt{display:flex;align-items:center;padding:10px 0;margin:0 -12px 6px;padding-left:12px;padding-right:12px;background:#F2F1EC;color:#000;font:500 12px 'DM Mono',monospace;letter-spacing:.16em}
.wt b{font-weight:500}
.wt .ic{width:16px;height:16px}
.frow{border-bottom:1px solid #262624;padding:6px 0}
.frow .mk{display:block;margin-bottom:2px}
.fv{font-size:13.5px;font-weight:500}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.sec.in{border-top:1px solid #F2F1EC;margin-top:10px}
.dayrow{display:grid;grid-template-columns:24px 52px 96px 1fr;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid #1A1A19}
.dayrow b{font:500 11px 'DM Mono',monospace}
.dbox{border:1px solid #3A3A38;padding:4px 6px;font:400 11px 'DM Mono',monospace}
.dbox.w{font:500 12px Barlow,sans-serif}
.dl{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#D8D6D0}
.addday{font:500 10px 'DM Mono',monospace;letter-spacing:.12em;color:#8E8C86;padding:8px 0}
.wsoft{position:absolute;left:12px;right:12px;bottom:12px;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px}
.wsoft button{border:1px solid #55534E;padding:10px 0;font:500 10.5px 'DM Mono',monospace;letter-spacing:.12em}
.wsoft .white{background:#F2F1EC;color:#000;border-color:#F2F1EC}
.wsoft .redline{color:#FF2D20;border-color:#FF2D20}
.tick{width:18px;height:18px;border:1px solid #55534E;display:grid;place-items:center;font-size:11px}
.tick.on{background:#F2F1EC;color:#000;border-color:#F2F1EC}
.mrow{grid-template-columns:98px 1fr 18px}
.seg{display:flex;border:1px solid #3A3A38}.seg a{flex:1;text-align:center}.key .ki{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.seg a{padding:3px 9px;font:500 10px 'DM Mono',monospace;letter-spacing:.1em;color:#8E8C86;border-left:1px solid #3A3A38}
.seg a:first-child{border-left:0}.seg a.on{background:#F2F1EC;color:#000}
.sw{display:inline-block;width:10px;height:10px;background:#F2F1EC;margin-right:4px;vertical-align:-1px}
.cathead,.subh{display:flex;align-items:center;gap:7px;font:500 11px 'DM Mono',monospace;letter-spacing:.14em}
.cathead{border-top:2px solid #F2F1EC;padding:8px 0;margin-top:4px}
.subh{color:#8E8C86;padding:10px 0 4px;font-size:10px}
.subh b,.cathead b{font-weight:500}
.chk{width:14px;height:14px;border:1px solid #77756F;display:grid;place-items:center;font-size:9px}
.chk.on{background:#F2F1EC;color:#000;border-color:#F2F1EC}
.add{margin-left:8px;color:#F2F1EC}
.crow{display:grid;grid-template-columns:22px 1fr 12px;gap:6px;align-items:center;padding:7px 0;border-bottom:1px solid #1A1A19}
.crow .g{color:#55534E;display:flex}.crow .g .ic{width:15px;height:15px}
.crow small{display:block;font-size:10.5px;color:#77756F}
`;
