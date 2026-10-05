// Builds the test data in this folder (run: node testdata/make-test-data.mjs):
//   boxgo-test-backup.json    a BOXGO backup (Settings → Restore) with 27
//                             made-up equipment lists covering every display
//                             case: 1–10 shoot days, per-day quantities,
//                             notes, custom / subrent items, empty lists,
//                             no dates, long names, Vietnamese text, every
//                             PDF font, a full-catalog stress list… Projects
//                             only, so it's safe to restore into a real
//                             account (nothing else can be replaced).
//   boxgo-test-backup-FULL-spare-account-only.json
//                             the same plus catalog, tags, houses, templates,
//                             profile and appearance — for a spare account
//                             only (Restore replaces each ticked section).
//   test-projects-extras.sql  optional, owner only: Projects / Calendar
//                             details a backup can't carry (status, events,
//                             budget, files) for those lists, plus a few
//                             Calendar-only projects. Run in the Supabase
//                             SQL Editor after restoring the backup.
//   test-cleanup.sql          removes everything above again.
// Every test id starts with 7e57 ("test") so cleanup can find them.

import { writeFileSync } from "node:fs";
import { DEFAULT_CATALOG, DEFAULT_DEPARTMENTS, DEFAULT_BRANDS } from "../src/constants.js";

const OUT = new URL(".", import.meta.url).pathname;
const pad = (n, w = 2) => String(n).padStart(w, "0");
const pid = (n) => `7e570000-0000-4000-8000-0000000000${pad(n)}`;
const xid = (n) => `7e570000-0000-4000-8000-0000000001${pad(n)}`; // Calendar-only

// Catalog items by (the start of) their name.
const item = (name) => {
  const c = DEFAULT_CATALOG.find((x) => x.name === name) || DEFAULT_CATALOG.find((x) => x.name.startsWith(name));
  if (!c) throw new Error(`No catalog item "${name}"`);
  return c.id;
};

// ---------------------------------------------------------------- kits
const KITS = {
  bigTVC: {
    "ARRI 35": 2, "ARRI SIGNATURE PRIMES": 1, "DZOFILMS CATTA ACE": 1, "FSND": 2, "BLACK PROMIST": 1, "NISI MIST FILTER": 1,
    "VAXIS STORM": 2, '15"-18" MONITORS': 3, "ATOMOS SHOGUN": 1, "PANTHER": 1, "JIB ARM": 1,
    "ARRI M90": 1, "ARRI M40": 2, "ARRI 18K ARRIMAX": 1, "SKYPANEL S60": 4, "SKYPANEL S360": 2, "APUTURE STORM XT52": 2,
    "APUTURE STORM 1200X": 2, "APUTURE INFINIMAT 8X8": 2, "LIGHT DOME 150": 2, "SET FRAME 20X20": 2, "SET FRAME 12X12": 3,
    "GENERATOR TRUCK": 1, "INTERCOM SET": 1,
  },
  midTVC: {
    "SONY VENICE 2": 1, "COOKE S7/I FF": 1, "FSND": 1, "BLACK PROMIST": 1, "ACCSOON CINEVIEW MASTER": 1, '15"-18" MONITORS': 2,
    "DANA DOLLY/SLIDER": 1, "ARRI M18": 2, "SKYPANEL S60": 2, "APUTURE LS 600C PRO II": 3, "APUTURE NOVA P600C": 2,
    "LIGHT DOME 90": 2, "SET FRAME 12X12": 2, "SET FRAME 8X8": 2, "PHẢN QUANG GƯƠNG": 2,
  },
  mv: {
    "SONY FX3": 2, "SONY 24-70MM F2.8 II": 1, "SONY 35MM F1.4": 1, "SONY 85MM F1.4 II": 1, "NISI VND": 2, "ACCSOON CINEVIEW SE": 1,
    "AMARAN F22": 2, "AMARAN PT4C": 4, "APUTURE MC PRO": 1, "APUTURE PB12": 2, "APUTURE STORM 80C": 2, "HELMET CAM": 1,
  },
  doc: {
    "SONY FX6": 1, "SONY FX9": 1, "SONY 24-70MM F2.8 II": 1, "SONY 70-200MM F2.8 II": 1, "SONY 16-35MM F2.8 II": 1,
    "NISI VND": 2, "APUTURE MC PRO": 1, "AMARAN F21": 1, "HOLLYLAND SOLIDCOM C1 PRO": 1,
  },
  anamorphic: {
    "RED RAPTOR-VV": 1, "RED KOMODO-X": 1, "COOKE ANAMORPHIC/I FF": 1, "LAOWA PROBE ZOOM SET": 1, "STAR BURST": 1, "BLUE STREAK": 1,
    "VAXIS STORM": 1, "CRANE": 1, "UBANGI": 1, "12K": 1, "6K": 2, "10K FRESNEL": 1, "MAXIBRUTE": 2, "SPACELIGHT": 6,
    "APUTURE STORM XT26": 4, "CHROMA KEY GREEN": 1,
  },
};
const kit = (name, scale = 1) => Object.fromEntries(Object.entries(KITS[name]).map(([n, q]) => [item(n), Math.max(1, Math.round(q * scale))]));

// ---------------------------------------------------------------- lists
// days: [date, location, projectLabel]
function list(n, o) {
  const days = o.days.map(([date, location, projectLabel], i) => ({ id: `t${n}d${i + 1}`, label: `Day ${i + 1}`, date, location: location || "", projectLabel: projectLabel || "" }));
  const itemData = {};
  for (const [id, base] of Object.entries(o.items || {})) {
    const quantities = {};
    days.forEach((d, i) => {
      // Per-day lists vary by day (some days need less, a few none).
      quantities[d.id] = o.perDayQty ? Math.max(0, base + (o.vary ? o.vary(i, id) : 0)) : base;
    });
    itemData[id] = { quantities, notes: "" };
  }
  for (const [name, note, hidden] of o.notes || []) {
    const id = item(name);
    itemData[id] = { ...(itemData[id] || { quantities: Object.fromEntries(days.map((d) => [d.id, 1])) }), notes: note, ...(hidden ? { noteHidden: true } : {}) };
  }
  const customItems = (o.custom || []).map(([name, department, qtys], i) => {
    const id = `t${n}c${i + 1}`;
    itemData[id] = { quantities: Object.fromEntries(days.map((d, k) => [d.id, Array.isArray(qtys) ? (qtys[k] ?? 0) : qtys])), notes: "" };
    return { id, name, department };
  });
  return {
    id: pid(n),
    name: o.name,
    tag: o.tag ?? "TVC",
    productionHouse: o.ph ?? "",
    producer: o.producer ?? "",
    rentalHouse: o.rh ?? "",
    gaffer: o.gaffer ?? "",
    days,
    perDayQty: !!o.perDayQty,
    itemData,
    customItems,
    note: o.note || "",
    ...(o.collapsed ? { collapsedDepts: o.collapsed } : {}),
    pdfFont: o.font || "jetbrains",
    createdAt: Date.UTC(2025, 0, 1) + n * 86400000 * 7,
  };
}

const vary = (i, id) => ((id.charCodeAt(0) + i) % 4 === 0 ? -9 : (id.charCodeAt(1) + i) % 3 === 0 ? -1 : 0);
const LONG_NOTE = "Call time 05:30 at the studio gate. Camera truck parks on the left lane only — the right side is a fire lane.\n"
  + "Ghi chú: Toàn bộ thiết bị phải được kiểm tra trước 18:00 ngày hôm trước. Mang thêm pin V-mount (tối thiểu 12 viên) và 2 bộ sạc nhanh.\n"
  + "Client monitor needs its own wireless feed (Teradek or Vaxis) — agency sits in the van, not on set.";

const L = [
  // ---- past jobs, 2025
  list(1, { name: "Honda Winner R – Đường Dài", ph: "Ogilvy Films", producer: "Linh Trần", rh: "Cinerent Saigon", gaffer: "Tuấn Lê",
    days: [["2025-03-10", "Đèo Hải Vân", "Exterior Day"], ["2025-03-11", "Đà Nẵng – Sơn Trà", "Car rig"]], items: kit("midTVC"), font: "jetbrains" }),
  list(2, { name: "Vinamilk Tết 2026", ph: "See Productions", producer: "Mai Phạm", rh: "Lumière Rental", gaffer: "Hùng Nguyễn",
    days: [["2025-12-02", "Studio Kỳ Hòa – Q.10", "Studio"], ["2025-12-03", "Studio Kỳ Hòa – Q.10", "Studio"], ["2025-12-04", "Củ Chi farm", "Exterior Day"]],
    perDayQty: true, vary, items: kit("bigTVC"), font: "inter" }),
  list(3, { name: "Sơn Tùng M-TP — Lạc Trôi 2", tag: "MV", ph: "M-TP Entertainment", producer: "Khánh Võ", rh: "Cinerent Saigon", gaffer: "Phát Đỗ",
    days: [["2025-08-20", "Hội An old town", "Night Ext"]], items: kit("mv"), font: "plex" }),
  list(4, { name: "Biti's Hunter Street", ph: "FMN", producer: "An Đặng", rh: "VTS Rental", gaffer: "Tuấn Lê",
    days: [["2025-06-14", "Q.1 rooftops", "Exterior Day"], ["2025-06-16", "Skatepark Q.7", "Exterior Day"]], items: kit("mv", 1.5) }),
  list(5, { name: "Grab Food Mùa Mưa", tag: "Short", ph: "Blue Pictures", producer: "Linh Trần", rh: "Lumière Rental", gaffer: "",
    days: [["2025-10-01", "Bình Thạnh alleys", "Rain"]], items: kit("doc"),
    custom: [["Rain tower 6m (x2)", "Subrent", 2], ["Water truck 10m³", "Subrent", 1]] }),
  list(6, { name: "VinFast VF9 Launch Film", tag: "Corporate", ph: "Mango Films", producer: "Quân Hồ", rh: "Cinerent Saigon", gaffer: "Hùng Nguyễn",
    days: [["2025-11-18", "VinFast factory – Hải Phòng", "Factory"], ["2025-11-19", "Cát Hải coast road", "Car rig"]], items: kit("anamorphic") }),
  // ---- past jobs, 2026
  list(7, { name: "Heineken Countdown", ph: "Ogilvy Films", producer: "Linh Trần", rh: "VTS Rental", gaffer: "Phát Đỗ",
    days: [["2026-01-20", "Nhà Văn hóa Thanh niên", "Concert"], ["2026-01-21", "Nhà Văn hóa Thanh niên", "Concert"], ["2026-01-22", "Studio Kỳ Hòa – Q.10", "Pack shot"]],
    perDayQty: true, vary, items: kit("bigTVC"), font: "plex" }),
  list(8, { name: "Highlands Coffee – Phin Sữa Đá", ph: "See Productions", producer: "Mai Phạm", rh: "Lumière Rental", gaffer: "Tuấn Lê",
    days: [["2026-03-05", "Highlands Landmark 81", "Interior"]], items: kit("midTVC", 0.5),
    notes: [["SONY VENICE 2", "Rialto extension kit + 2x CFExpress 1TB"]] }),
  list(9, { name: "Shopee 6.6", ph: "Blue Pictures", producer: "An Đặng", rh: "Cinerent Saigon", gaffer: "Hùng Nguyễn",
    days: [["2026-05-28", "Studio Phú Mỹ Hưng", "Green screen"], ["2026-05-30", "Studio Phú Mỹ Hưng", "Green screen"]], items: kit("anamorphic", 0.5) }),
  list(10, { name: "Sunsilk Đen Óng Ả", ph: "FMN", producer: "Khánh Võ", rh: "VTS Rental", gaffer: "Phát Đỗ",
    days: [["2026-07-09", "Studio Kỳ Hòa – Q.10", "Beauty"], ["2026-07-10", "Studio Kỳ Hòa – Q.10", "Hair slow-mo"]], items: kit("midTVC") }),
  list(11, { name: "Masan Chin-su", ph: "Mango Films", producer: "Quân Hồ", rh: "Lumière Rental", gaffer: "Tuấn Lê",
    days: [["2026-09-12", "Kitchen set – Studio B", "Food"]], items: kit("midTVC", 0.5) }),
  list(12, { name: "Omo Matic – Documentary Cut", tag: "Doc", ph: "Blue Pictures", producer: "Mai Phạm", rh: "", gaffer: "",
    days: [["2026-08-02", "Mekong Delta – Bến Tre", "Run & gun"], ["2026-08-03", "Mekong Delta – Bến Tre", "Run & gun"], ["2026-08-04", "Cần Thơ market", "Dawn"], ["2026-08-05", "Cần Thơ market", "Interviews"], ["2026-08-06", "Cần Thơ", "B-roll"]],
    items: kit("doc"), font: "inter" }),
  // ---- now and upcoming
  list(13, { name: "Cicaplast Baume B5+", ph: "See Productions", producer: "Mai Phạm", rh: "Cinerent Saigon", gaffer: "Hùng Nguyễn",
    days: [["2026-10-04", "Studio Kỳ Hòa – Q.10", "Studio"], ["2026-10-05", "Studio Kỳ Hòa – Q.10", "Pack shot"], ["2026-10-06", "https://maps.app.goo.gl/test-location", "Exterior Day"]],
    perDayQty: true, vary, items: kit("midTVC"), note: LONG_NOTE,
    notes: [["SONY VENICE 2", "Bring the 6K 3:2 license + 2 spare batteries"], ["SKYPANEL S60", "Need the barn doors and honeycomb grids — client wants a hard look on the product"], ["COOKE S7/I FF", "Rental house note (hidden from PDF)", true]] }),
  list(14, { name: "Vietcombank Digibank", ph: "Ogilvy Films", producer: "Linh Trần", rh: "VTS Rental", gaffer: "Tuấn Lê",
    days: [["2026-10-09", "Vietcombank Tower – Q.1", "Interior"], ["2026-10-10", "Thủ Thiêm bridge", "Night Ext"]], items: kit("bigTVC", 0.6) }),
  list(15, { name: "Samsung Galaxy S27 Ultra — Night Mode", ph: "Mango Films", producer: "Quân Hồ", rh: "Cinerent Saigon", gaffer: "Phát Đỗ",
    days: [["2026-10-09", "Bùi Viện walking street", "Night Ext"], ["2026-10-12", "Studio Phú Mỹ Hưng", "Pack shot"]],
    perDayQty: true, vary, items: kit("anamorphic"), font: "inter" }),
  list(16, { name: "Nestlé Milo Năng Động", ph: "FMN", producer: "An Đặng", rh: "Lumière Rental", gaffer: "Hùng Nguyễn",
    days: [["2026-10-15", "Sân vận động Thống Nhất", "Sports"]], items: kit("midTVC") }),
  list(17, { name: "Đen Vâu – MV “Đi Về Nhà 2”", tag: "MV", ph: "Đen Vâu Team", producer: "Khánh Võ", rh: "Cinerent Saigon", gaffer: "Phát Đỗ",
    days: [["2026-10-21", "Đà Lạt – Langbiang", "Exterior Day"], ["2026-10-22", "Đà Lạt – Langbiang", "Magic hour"], ["2026-10-23", "Đà Lạt – night market", "Night Ext"]],
    perDayQty: true, vary, items: kit("mv", 1.5), font: "plex",
    note: "Song tempo 92 BPM — playback speaker needed every day.\nArtist only available 14:00–22:00.",
    custom: [["Teradek Bolt 6 XT 750", "Subrent", [1, 1, 2]], ["Fog machine Look Unique 2.1", "Others", [0, 1, 2]], ["DJI Ronin 4D (crash cam)", "Others", 1]] }),
  list(18, { name: "Pepsi Tết 2027 — Big Family Table", ph: "Ogilvy Films", producer: "Linh Trần", rh: "VTS Rental", gaffer: "Hùng Nguyễn",
    days: [
      ["2026-11-02", "Studio Kỳ Hòa – Q.10", "Prelight"], ["2026-11-03", "Studio Kỳ Hòa – Q.10", "Studio"], ["2026-11-04", "Studio Kỳ Hòa – Q.10", "Studio"],
      ["2026-11-05", "Studio Kỳ Hòa – Q.10", "Studio"], ["2026-11-06", "Studio Kỳ Hòa – Q.10", "Pack shot"], ["2026-11-09", "Hội An", "Exterior Day"],
      ["2026-11-10", "Hội An", "Night Ext"], ["2026-11-11", "Hội An", "Lanterns"], ["2026-11-12", "Đà Nẵng airport", "Travel"], ["2026-11-13", "Studio Kỳ Hòa – Q.10", "Pickups"],
    ],
    perDayQty: true, vary, items: { ...kit("bigTVC"), ...kit("anamorphic", 0.5) }, note: LONG_NOTE,
    custom: [["Technocrane 30ft (subrent)", "Subrent", [0, 1, 1, 1, 0, 1, 1, 0, 0, 0]], ["Phantom Flex 4K + tech", "Subrent", [0, 0, 1, 0, 1, 0, 0, 0, 0, 1]], ["Balloon light 4K", "Others", 2]],
    collapsed: { Grip: true } }),
  list(19, { name: "Coca-Cola Christmas Truck", ph: "Mango Films", producer: "Quân Hồ", rh: "Lumière Rental", gaffer: "Tuấn Lê",
    days: [["2026-12-10", "Phú Mỹ Hưng – Crescent Mall", "Night Ext"], ["2026-12-11", "Studio Phú Mỹ Hưng", "Pack shot"]], items: kit("bigTVC", 0.8) }),
  list(20, { name: "Tiki 12.12", tag: "Short", ph: "Blue Pictures", producer: "An Đặng", rh: "", gaffer: "",
    days: [["2026-12-12", "Tiki warehouse – Thủ Đức", "Warehouse"]], items: kit("doc") }),
  list(21, { name: "Unilever CSR — Nước Sạch", tag: "Doc", ph: "Blue Pictures", producer: "Mai Phạm", rh: "Cinerent Saigon", gaffer: "",
    days: [["2027-01-08", "Sóc Trăng", "Interviews"], ["2027-01-09", "Sóc Trăng", "B-roll"]], items: kit("doc") }),
  list(22, { name: "MoMo Lì Xì 2027", ph: "FMN", producer: "Khánh Võ", rh: "VTS Rental", gaffer: "Phát Đỗ",
    days: [["2027-01-14", "Chợ Lớn", "Exterior Day"], ["2027-01-15", "Chợ Lớn", "Night Ext"], ["2027-01-20", "Studio Kỳ Hòa – Q.10", "Pack shot"]],
    perDayQty: true, vary, items: kit("midTVC") }),
  // ---- special cases
  list(23, { name: "EVERYTHING — Full Catalog Stress Test", ph: "Test House With A Rather Long Name Productions", producer: "Producer With Long Name", rh: "Rental House With Long Name", gaffer: "Gaffer With Long Name",
    days: [["2026-11-20", "Studio A", "Day one"], ["2026-11-21", "Studio B", "Day two"], ["2026-11-22", "Studio C", "Day three"]],
    perDayQty: true, vary: (i, id) => ((id.charCodeAt(2) + i) % 5) - 1,
    items: Object.fromEntries(DEFAULT_CATALOG.map((c, k) => [c.id, 1 + (k % 6) + (k % 17 === 0 ? 90 : 0)])),
    note: LONG_NOTE + "\n" + LONG_NOTE, font: "inter",
    notes: [["ARRI 35", "A very long item note to check wrapping in the list and in the PDF: two bodies, one on the Technocrane and one handheld with the Easyrig; both need LPL and PL mounts plus the wireless focus kit."]],
    custom: [["Custom item in Others", "Others", [1, 2, 3]], ["Subrent item one", "Subrent", [2, 0, 2]], ["Subrent item two with a long name to wrap across the column", "Subrent", 1]] }),
  list(24, { name: "Pitch — No Dates Yet", tag: "TVC", ph: "Ogilvy Films", producer: "", rh: "", gaffer: "",
    days: [["", "", ""]], items: {} }),
  list(25, { name: "Empty List — Nothing Added", tag: "Short", ph: "", rh: "",
    days: [["2026-11-25", "", ""], ["2026-11-26", "", ""]], items: {} }),
  list(26, { name: "A Very Very Long Project Name To Test Wrapping On Cards, Crumbs And PDF Headers 2026", tag: "",
    days: [["2026-10-28", "Somewhere with a really long location name — District 2, Thủ Đức City", "A long type of shooting label"]], items: kit("doc") }),
  list(27, { name: "Vietcombank Digibank (Reshoot)", ph: "Ogilvy Films", producer: "Linh Trần", rh: "VTS Rental", gaffer: "Tuấn Lê",
    days: [["2026-10-28", "Vietcombank Tower – Q.1", "Pickups"]], items: kit("bigTVC", 0.3) }),
];

const templates = [
  { id: "7e57tpl1", name: "Big TVC — Alexa 35", tag: "TVC", productionHouse: "Ogilvy Films", producer: "Linh Trần", rentalHouse: "VTS Rental", gaffer: "Hùng Nguyễn", itemQuantities: kit("bigTVC") },
  { id: "7e57tpl2", name: "MV handheld — FX3", tag: "MV", productionHouse: "", producer: "", rentalHouse: "Cinerent Saigon", gaffer: "", itemQuantities: kit("mv") },
  { id: "7e57tpl3", name: "Doc run & gun", tag: "Doc", productionHouse: "Blue Pictures", producer: "", rentalHouse: "", gaffer: "", itemQuantities: kit("doc") },
];

const uniq = (a) => [...new Set(a.filter(Boolean))];
const backup = {
  type: "boxgo-full-backup",
  version: 1,
  exportedAt: "2026-10-05T03:00:00.000Z",
  userName: "Test DOP",
  userEmail: "test.dop@example.com",
  userPhone: "+84 90 000 0000",
  includeUsernameInPdf: true,
  includeEmailInPdf: true,
  includePhoneInPdf: false,
  projectTags: ["TVC", "MV", "Short", "Doc", "Corporate"],
  productionHouses: uniq(L.map((p) => p.productionHouse)),
  rentalHouses: uniq(L.map((p) => p.rentalHouse)),
  brands: DEFAULT_BRANDS,
  departments: DEFAULT_DEPARTMENTS,
  catalog: DEFAULT_CATALOG,
  projects: L,
  templates,
  theme: "dark",
  accentId: "amber",
  fontId: "jetbrains",
};
// Safe for a real account: only the test projects (Restore adds them and
// keeps everything else; with no other sections in the file, nothing else
// can be replaced by mistake).
writeFileSync(`${OUT}boxgo-test-backup.json`, JSON.stringify({ type: backup.type, version: backup.version, exportedAt: backup.exportedAt, projects: L }, null, 1));
// Everything (catalog, tags, houses, templates, profile, appearance): only
// for a spare test account — restoring its sections REPLACES those parts.
writeFileSync(`${OUT}boxgo-test-backup-FULL-spare-account-only.json`, JSON.stringify(backup, null, 1));

// ---------------------------------------------------------------- Projects / Calendar extras
const ev = (id, typeId, start, o = {}) => ({ id, typeId, start, end: "", time: "", endTime: "", mode: "offline", location: "", link: "", note: "", confirmed: false, ...o });
const shootEvents = (p, confirmed) => p.days.filter((d) => d.date).map((d) => ev(d.id, "shoot", d.date, { location: d.location, label: d.projectLabel, confirmed }));
const people = (p) => [
  ...(p.producer ? [{ id: `${p.id.slice(-4)}pr`, role: "Producer", name: p.producer, phone: "", email: "" }] : []),
  ...(p.gaffer ? [{ id: `${p.id.slice(-4)}ga`, role: "Gaffer", name: p.gaffer, phone: "", email: "" }] : []),
];
const MEET = "https://meet.google.com/tst-abcd-efg";
const MAPS = "https://maps.app.goo.gl/test-recce";
const byN = (n) => L[n - 1];

function xFromList(n, status, extra = {}, shootConfirmed = status === "confirmed") {
  const p = byN(n);
  return {
    id: p.id,
    data: {
      name: p.name, tag: p.tag, productionHouse: p.productionHouse, rentalHouse: p.rentalHouse,
      notes: extra.notes || "", people: people(p), status, createdAt: p.createdAt,
      events: [...shootEvents(p, shootConfirmed), ...(extra.events || [])],
      ...(extra.budget ? { budget: extra.budget } : {}),
      ...(extra.files ? { files: extra.files } : {}),
    },
  };
}
const line = (id, item, qty, rate, note = "") => ({ id, item, qty, rate, note });
const file = (id, kind, name, url) => ({ id, kind, name, url });

const X = [
  xFromList(13, "confirmed", {
    notes: "Client: L'Oréal VN. Agency wants daily selects by 21:00.",
    events: [
      ev("x13a", "kickoff", "2026-09-22", { time: "10:00", endTime: "11:30", mode: "online", link: MEET, confirmed: true }),
      ev("x13b", "recce", "2026-09-28", { location: MAPS, note: "Check power for the M18s at the exterior", confirmed: true }),
      ev("x13c", "camtest", "2026-10-01", { time: "09:00", endTime: "13:00", location: "Cinerent Saigon", confirmed: true }),
      ev("x13d", "prelight", "2026-10-03", { location: "Studio Kỳ Hòa – Q.10", confirmed: true }),
      ev("x13e", "offline", "2026-10-14", { time: "15:00", mode: "online", link: "https://frame.io/test-review", confirmed: false }),
      ev("x13f", "grading", "2026-10-19", { time: "09:30", endTime: "18:00", location: "Grading suite – Q.3", confirmed: false }),
    ],
    budget: { currency: "VND", lines: [
      line("b1", "DOP fee", 3, 18000000), line("b2", "Prep / recce days", 2, 6000000, "Recce + camera test"), line("b3", "1st AC", 4, 3500000),
      line("b4", "2nd AC", 4, 2500000), line("b5", "DIT", 3, 4000000), line("b6", "Camera package (Venice 2)", 3, 12000000, "Venice 2 + Cooke S7/i"),
      line("b7", "Overtime", 1.5, 3500000, "Day 2 went 2.5 hrs over"),
    ] },
    files: [
      file("f1", "script", "Script v4 (approved)", "https://drive.google.com/file/d/test-script"),
      file("f2", "treatment", "DOP treatment – look & lighting", "https://drive.google.com/file/d/test-treatment"),
      file("f3", "recce", "Recce photos – Studio + exterior", "https://drive.google.com/drive/folders/test-recce"),
      file("f4", "other", "Shot list (Google Sheet)", "https://docs.google.com/spreadsheets/d/test-shotlist"),
      file("f5", "other", "Storyboard (Dropbox)", "https://www.dropbox.com/s/test-storyboard"),
    ],
  }),
  xFromList(14, "softlock", { events: [
    ev("x14a", "kickoff", "2026-10-02", { time: "14:00", endTime: "15:00", mode: "online", link: MEET }),
    ev("x14b", "scouting", "2026-10-06", { end: "2026-10-07", location: "Q.1 / Thủ Thiêm", note: "Two-day scout, need drone permit" }),
    ev("x14c", "prelight", "2026-10-08", { location: "Vietcombank Tower – Q.1" }),
  ] }),
  xFromList(15, "confirmed", { events: [
    ev("x15a", "kickoff", "2026-10-02", { time: "14:30", endTime: "16:00", mode: "online", link: MEET, confirmed: true, note: "Overlaps Vietcombank's kick-off → clash" }),
    ev("x15b", "recce", "2026-10-06", { location: MAPS, confirmed: true }),
    ev("x15c", "prelight", "2026-10-08", { location: "Bùi Viện", confirmed: true }),
    ev("x15d", "grading", "2026-10-26", { time: "10:00", location: "Grading suite – Q.3" }),
  ] }),
  xFromList(16, "softlock", { events: [ev("x16a", "rehearsal", "2026-10-14", { time: "16:00", endTime: "18:00", location: "Sân vận động Thống Nhất" })] }),
  xFromList(17, "confirmed", {
    notes: "Artist team handles wardrobe. We handle all camera + lighting.",
    events: [
      ev("x17a", "travel", "2026-10-20", { location: "SGN → DLI flight VN1234 07:15", confirmed: true }),
      ev("x17b", "recce", "2026-10-20", { time: "14:00", location: "Langbiang", confirmed: true }),
      ev("x17c", "travel", "2026-10-24", { location: "DLI → SGN", confirmed: true }),
      ev("x17d", "offline", "2026-10-30", { time: "20:00", mode: "online", link: "https://frame.io/test-mv" }),
    ],
    budget: { currency: "USD", lines: [line("u1", "DOP fee", 3, 900), line("u2", "Travel days", 2, 300), line("u3", "Per diem", 5, 35.5, "Đà Lạt")] },
    files: [file("g1", "treatment", "MV treatment", "https://drive.google.com/file/d/test-mv"), file("g2", "recce", "Langbiang recce video", "https://drive.google.com/file/d/test-recce-video")],
  }),
  xFromList(18, "confirmed", {
    events: [
      ev("x18a", "kickoff", "2026-10-13", { time: "09:00", endTime: "12:00", location: "Ogilvy office – Q.1", confirmed: true }),
      ev("x18b", "scouting", "2026-10-19", { end: "2026-10-21", location: "Hội An", note: "Overlaps the Đen Vâu shoot days (not a clash: scouting)" }),
      ev("x18c", "camtest", "2026-10-29", { location: "VTS Rental", confirmed: true }),
      ev("x18d", "offline", "2026-11-20", { time: "10:00", mode: "online", link: MEET }),
      ev("x18e", "grading", "2026-11-27", { end: "2026-11-28", location: "Grading suite – Q.3" }),
    ],
    budget: { currency: "VND", lines: Array.from({ length: 14 }, (_, i) => line(`p${i}`, ["DOP fee", "Prep days", "Travel days", "1st AC", "2nd AC", "DIT", "Video assist", "Camera package A", "Camera package B", "Lenses", "Grip package", "Lighting package", "Overtime", "Per diem"][i], [10, 4, 2, 10, 10, 10, 10, 10, 6, 10, 10, 10, 2, 6][i], [18000000, 6000000, 3000000, 3500000, 2500000, 4000000, 2000000, 15000000, 9000000, 8000000, 12000000, 30000000, 3500000, 500000][i])) },
    files: [file("h1", "script", "Script v7", "https://drive.google.com/file/d/test-pepsi")],
  }),
  xFromList(19, "softlock"),
  xFromList(20, "softlock"),
  xFromList(21, "cancelled", { notes: "Client pulled the budget." }),
  xFromList(22, "softlock"),
  xFromList(23, "confirmed"),
  xFromList(25, "softlock"),
  xFromList(26, "softlock"),
  xFromList(27, "softlock", { events: [ev("x27a", "prelight", "2026-10-28", { time: "08:00", endTime: "12:00", location: "Vietcombank Tower – Q.1" })] }),
  // Calendar-only projects (no equipment list: greyed cards in Equipment)
  { id: xid(1), data: { name: "Grab — Pitch", tag: "TVC", productionHouse: "Blue Pictures", rentalHouse: "", notes: "Pitch deck due Friday.", status: "softlock", createdAt: Date.UTC(2026, 9, 1),
    people: [{ id: "c1pr", role: "Producer", name: "An Đặng", phone: "", email: "" }],
    events: [ev("c1d1", "shoot", "2026-11-18", { label: "Studio" }), ev("c1d2", "shoot", "2026-11-19", { label: "Exterior Day" }), ev("c1k", "kickoff", "2026-10-16", { time: "11:00", mode: "online", link: MEET })] } },
  { id: xid(2), data: { name: "Heineken Silver — Cancelled", tag: "TVC", productionHouse: "Ogilvy Films", rentalHouse: "", notes: "", status: "cancelled", createdAt: Date.UTC(2026, 8, 20),
    people: [], events: [ev("c2d1", "shoot", "2026-10-16", { label: "Night Ext" })] } },
  { id: xid(3), data: { name: "Biti's — Stale Soft Lock", tag: "TVC", productionHouse: "FMN", rentalHouse: "", notes: "Never confirmed — should show a warning.", status: "softlock", createdAt: Date.UTC(2026, 7, 1),
    people: [], events: [ev("c3d1", "shoot", "2026-09-25", { label: "Exterior Day" })] } },
  { id: xid(4), data: { name: "Idea — No Shoot Dates", tag: "Short", productionHouse: "", rentalHouse: "", notes: "", status: "softlock", createdAt: Date.UTC(2026, 9, 3),
    people: [], events: [ev("c4k", "kickoff", "2026-10-07", { time: "17:00", mode: "online", link: MEET })] } },
];

const q = (s) => `'${s.replace(/'/g, "''")}'`;
writeFileSync(`${OUT}test-projects-extras.sql`, [
  "-- BOXGO test data, part 2 (owner only): Projects / Calendar details for the",
  "-- test equipment lists, plus 4 Calendar-only projects. Run AFTER restoring",
  "-- boxgo-test-backup.json. Safe to run again. Remove with test-cleanup.sql.",
  "insert into x_projects (id, data, updated_at) values",
  X.map((r) => `  (${q(r.id)}, ${q(JSON.stringify(r.data))}::jsonb, now())`).join(",\n"),
  "on conflict (id) do update set data = excluded.data, updated_at = now();",
  "",
].join("\n"));

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

console.log(`${L.length} lists, ${templates.length} templates, ${X.length} Projects rows`);
