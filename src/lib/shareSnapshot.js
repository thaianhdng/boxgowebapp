import { loadJbmFont } from "./font.js";
import { formatShootDateRange, computeVisibleGrouped, orderedKeys, groupCatalog } from "./utils.js";

  // Builds a self-contained, read-only HTML snapshot of the given project's
  // current manifest — a frozen copy, not a live view. Everything the page
  // needs (data, styling, the PDF-drawing routine, the JetBrains Mono font
  // for correct Vietnamese rendering) is embedded directly in the file, so
  // it opens correctly for anyone, offline, with no BOXGO account and no
  // connection back to this project. Returns the HTML as a string; the
  // caller (exportShareSnapshot) uploads it to Supabase Storage rather
  // than making the user save and send the file themselves.
export async function buildShareSnapshotHtml({ project, catalog, departments, accentHex, preparedBy }) {
    const days = project?.days || [];
    const itemData = project?.itemData || {};
    const manifestGrouped = groupCatalog(catalog);
    const font = await loadJbmFont();
    const visibleGrouped = computeVisibleGrouped(manifestGrouped, itemData);
    const perDayQty = !!project?.perDayQty;
    const groups = orderedKeys(visibleGrouped, Object.keys(departments)).map((dept) => ({
      dept,
      subs: orderedKeys(visibleGrouped[dept], departments[dept] || []).map((sub) => ({
        sub,
        items: visibleGrouped[dept][sub].map((c) => {
          const entry = itemData[c.id];
          const qtyByDay = {};
          days.forEach((d) => { qtyByDay[d.id] = entry?.quantities?.[d.id] || 0; });
          return {
            name: c.name,
            catNote: c.note || "",
            note: entry?.noteHidden ? "" : (entry?.notes || ""),
            qtyByDay,
          };
        }),
      })),
    }));

    const data = {
      generatedAt: new Date().toISOString(),
      project: {
        name: project?.name || "Equipment List",
        tag: project?.tag || "",
        note: project?.note || "",
        createdAt: project?.createdAt || null,
        productionHouse: project?.productionHouse || "",
        producer: project?.producer || "",
        rentalHouse: project?.rentalHouse || "",
        gaffer: project?.gaffer || "",
        shootDateRange: formatShootDateRange(project?.days),
      },
      perDayQty,
      days: days.map((d) => ({ id: d.id, label: d.label })),
      preparedBy: preparedBy.name,
      email: preparedBy.email,
      phone: preparedBy.phone,
      accent: accentHex,
      groups,
    };

    const dataJson = JSON.stringify(data);
    const jbmRegular = font.regular;
    const jbmBold = font.bold;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${(data.project.name || "Equipment List").replace(/</g, "&lt;")} — Shared list</title>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"><\/script>
<style>
  :root { --accent: ${data.accent}; --border: #e5e5e5; --muted: #888; --faint: #f2f2f2; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px 16px 60px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; background: #fff; }
  .wrap { max-width: 760px; margin: 0 auto; }
  .banner { font-size: 11px; letter-spacing: .04em; color: var(--muted); text-transform: uppercase; margin-bottom: 18px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; border-bottom: 3px solid var(--accent); padding-bottom: 14px; margin-bottom: 14px; }
  .titleRow { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .tag { font-weight: 700; font-size: 13px; }
  .name { font-weight: 700; font-size: 22px; color: var(--accent); text-transform: uppercase; }
  .dates { font-size: 13px; color: #333; }
  .preparedBy { text-align: right; font-size: 13px; color: #555; }
  .preparedBy .who { font-weight: 700; font-size: 17px; color: #111; }
  .infoStrip { display: flex; gap: 28px; flex-wrap: wrap; margin-bottom: 18px; }
  .infoBlock .label { font-size: 10px; letter-spacing: .04em; color: var(--muted); text-transform: uppercase; }
  .infoBlock .value { font-size: 13px; margin-top: 2px; }
  .note { font-size: 13px; color: #333; margin-bottom: 18px; }
  .note .label { font-size: 10px; letter-spacing: .04em; color: var(--muted); text-transform: uppercase; display: block; margin-bottom: 3px; }
  .deptBar { background: var(--accent); color: #fff; font-weight: 700; font-size: 13px; padding: 8px 10px; margin-top: 18px; text-transform: uppercase; }
  .subBar { background: var(--faint); font-weight: 700; font-size: 11px; padding: 6px 12px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 12px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: top; }
  td.qty { text-align: center; font-weight: 700; width: 44px; white-space: nowrap; }
  td.notes { color: var(--muted); font-size: 12px; width: 35%; }
  .itemName { font-weight: 700; }
  .catNote { color: var(--muted); font-size: 11px; margin-top: 2px; }
  .empty { color: var(--muted); font-size: 13px; padding: 16px 0; }
  .footerBar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid var(--border); padding: 10px 16px; display: flex; justify-content: center; }
  button.dl { background: var(--accent); color: #fff; border: none; border-radius: 6px; padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer; }
  button.dl:disabled { opacity: .6; cursor: default; }
</style>
</head>
<body>
<div class="wrap">
  <div class="banner">BOXGO · Read-only shared list</div>
  <div id="root"></div>
</div>
<div class="footerBar"><button class="dl" id="dlBtn">Download PDF</button></div>
<script>
window.__SNAPSHOT__ = ${dataJson};
window.__JBM_REGULAR_B64 = "${jbmRegular}";
window.__JBM_BOLD_B64 = "${jbmBold}";

function fmtDMY(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p2 = (n) => String(n).padStart(2, "0");
  return p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + String(d.getFullYear()).slice(2);
}
function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p2 = (n) => String(n).padStart(2, "0");
  return p2(d.getHours()) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds());
}
function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

function render() {
  const d = window.__SNAPSHOT__;
  const root = document.getElementById("root");
  let html = '<div class="header"><div><div class="titleRow">' +
    (d.project.tag ? '<span class="tag">' + esc(d.project.tag.toUpperCase()) + '</span>' : '') +
    '<span class="name">' + esc(d.project.name) + '</span>' +
    (d.project.shootDateRange ? '<span class="dates">· ' + esc(d.project.shootDateRange) + '</span>' : '') +
    '</div></div>';
  if (d.preparedBy || d.email || d.phone) {
    html += '<div class="preparedBy">' +
      (d.preparedBy ? '<div class="who">' + esc(d.preparedBy) + '</div>' : '') +
      (d.email ? '<div>' + esc(d.email) + '</div>' : '') +
      (d.phone ? '<div>' + esc(d.phone) + '</div>' : '') +
      '</div>';
  }
  html += '</div>';

  const infoBlocks = [];
  if (d.project.productionHouse || d.project.producer) {
    infoBlocks.push(['PRODUCTION HOUSE', [d.project.productionHouse, d.project.producer].filter(Boolean).join(' · ')]);
  }
  if (d.project.rentalHouse || d.project.gaffer) {
    infoBlocks.push(['RENTAL HOUSE', [d.project.rentalHouse, d.project.gaffer].filter(Boolean).join(' · ')]);
  }
  if (d.project.createdAt) {
    infoBlocks.push(['CREATED ON', fmtDMY(d.project.createdAt) + '  ' + fmtTime(d.project.createdAt)]);
  }
  if (infoBlocks.length) {
    html += '<div class="infoStrip">' + infoBlocks.map(([l, v]) =>
      '<div class="infoBlock"><div class="label">' + l + '</div><div class="value">' + esc(v) + '</div></div>'
    ).join('') + '</div>';
  }

  if (d.project.note) {
    html += '<div class="note"><span class="label">Project note</span>' + esc(d.project.note) + '</div>';
  }

  if (d.groups.length === 0) {
    html += '<div class="empty">No quantities entered for this shoot yet.</div>';
  }

  d.groups.forEach((g) => {
    html += '<div class="deptBar">' + esc(g.dept) + '</div>';
    g.subs.forEach((s) => {
      html += '<div class="subBar">' + esc(s.sub) + '</div><table><tbody>';
      s.items.forEach((it) => {
        const vals = d.days.map((day) => it.qtyByDay[day.id] || 0);
        const shown = d.perDayQty
          ? vals.map((v, i) => '<span style="display:inline-block;min-width:20px">' + v + '</span>').join(' ')
          : String(Math.max(0, ...vals));
        html += '<tr><td><div class="itemName">' + esc(it.name) + '</div>' +
          (it.catNote ? '<div class="catNote">' + esc(it.catNote) + '</div>' : '') + '</td>' +
          '<td class="qty">' + shown + '</td>' +
          '<td class="notes">' + esc(it.note) + '</td></tr>';
      });
      html += '</tbody></table>';
    });
  });

  root.innerHTML = html;
}
render();

// Reuses the same jsPDF + embedded JetBrains Mono approach as the live app,
// but with a simpler, fixed layout — this button just needs a clean,
// correct PDF of a frozen snapshot, not pixel-parity with the live export.
async function downloadPdf() {
  const btn = document.getElementById("dlBtn");
  btn.disabled = true;
  btn.textContent = "Generating…";
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    if (window.__JBM_REGULAR_B64) {
      doc.addFileToVFS("JBM-R.ttf", window.__JBM_REGULAR_B64);
      doc.addFont("JBM-R.ttf", "JBM", "normal");
      doc.addFileToVFS("JBM-B.ttf", window.__JBM_BOLD_B64);
      doc.addFont("JBM-B.ttf", "JBM", "bold");
      doc.setFont("JBM", "normal");
    }
    const d = window.__SNAPSHOT__;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 48, marginTop = 50, marginBottom = 40;
    const usableW = pageW - marginX * 2;
    const rgb = (function (hex) {
      const h = (hex || "#000000").replace("#", "");
      const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    })(d.accent);
    let y = marginTop;
    function ensure(h) { if (y + h > pageH - marginBottom) { doc.addPage(); y = marginTop; } }
    function setF(style, size, color) { doc.setFont("JBM", style); doc.setFontSize(size); doc.setTextColor(color[0], color[1], color[2]); }

    setF("bold", 16, rgb);
    doc.text((d.project.name || "").toUpperCase(), marginX, y);
    if (d.project.shootDateRange) {
      setF("normal", 11, [0, 0, 0]);
      doc.text("· " + d.project.shootDateRange, marginX + doc.getTextWidth((d.project.name || "").toUpperCase()) + 8, y);
    }
    y += 22;
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.setLineWidth(2);
    doc.line(marginX, y, marginX + usableW, y);
    y += 16;

    d.groups.forEach((g) => {
      ensure(40);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(marginX, y, usableW, 17, "F");
      setF("bold", 11, [255, 255, 255]);
      doc.text(g.dept.toUpperCase(), marginX + 8, y + 12);
      y += 17;
      g.subs.forEach((s) => {
        ensure(30);
        doc.setFillColor(242, 242, 242);
        doc.rect(marginX, y, usableW, 15, "F");
        setF("bold", 9, [0, 0, 0]);
        doc.text(s.sub.toUpperCase(), marginX + 10, y + 11);
        y += 15;
        s.items.forEach((it) => {
          ensure(18);
          setF("normal", 10, [0, 0, 0]);
          doc.text(it.name, marginX + 8, y + 11);
          const vals = d.days.map((day) => it.qtyByDay[day.id] || 0);
          const shown = String(Math.max(0, ...vals));
          setF("bold", 10, rgb);
          doc.text(shown, marginX + usableW - 60, y + 11, { align: "center" });
          if (it.note) { setF("normal", 8.5, [136, 136, 136]); doc.text(it.note, marginX + usableW - 200, y + 11); }
          y += 16;
          doc.setDrawColor(240, 240, 240);
          doc.line(marginX + 8, y, marginX + usableW, y);
        });
        y += 3;
      });
    });

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (d.project.name || "equipment-list").replace(/[^a-z0-9]+/gi, "-") + ".pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } finally {
    btn.disabled = false;
    btn.textContent = "Download PDF";
  }
}
document.getElementById("dlBtn").addEventListener("click", downloadPdf);
<\/script>
</body>
</html>`;
  }
