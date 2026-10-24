import { loadPdfFont, pdfFontFor } from "./font.js";
import { runColumns } from "./dayLinks.js";
import { formatShootDateRange, fmtDate, formatDMY, formatTime24, computeVisibleGrouped, orderedKeys, hexToRgb, groupCatalog, withCustomItems } from "./utils.js";

// Rasterizes the visible preview screen and slices it into a real
// multi-page PDF file that downloads directly. This avoids the browser's
// own print dialog and pagination entirely — no window.print(), no
// dependency on how any particular browser or hosting page measures the
// printable area, so page count is exactly what the content needs,
// computed by us, every time.
// Builds the actual PDF and returns it as a Blob — no side effects, no
// download. Used both by the real download button and by the preview
// screen, so the preview is never anything other than this exact file.
// jsPDF is loaded on demand (it's a sizeable library, and most visits
// never export a PDF) rather than imported at the top of the file.
export async function buildPdf({ project, catalog, departments, accentHex, preparedBy }) {
  const days = project?.days || [];
  const itemData = project?.itemData || {};
  const manifestGrouped = groupCatalog(withCustomItems(catalog, project));
  const fontChoice = pdfFontFor(project?.pdfFont);
  const [{ jsPDF }, font] = await Promise.all([import("jspdf"), loadPdfFont(fontChoice.id)]);

  // A single item spilling onto a page of its own (owner's call): the
  // list is drawn again with slightly tighter rows if that brings it back.
  // Two or more items on the last page keep their own page.
  const FITS = [{ pad: 4.4, item: 8 }, { pad: 3.6, item: 8 }, { pad: 2.8, item: 8 }];
  let out = draw(FITS[0]);
  if (out.totalPages > 1 && out.lastPageRows <= 1) {
    for (const fit of FITS.slice(1)) {
      const tighter = draw(fit);
      if (tighter.totalPages < out.totalPages) { out = tighter; break; }
    }
  }
  return { blob: out.doc.output("blob"), totalPages: out.totalPages };

  // One full layout of the document with the given row padding / item size.
  function draw(fit) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    // Embed the project's chosen font directly (regular + bold) so
    // Vietnamese diacritics render as real, selectable text rather than a
    // flattened screenshot image.
    const FONT = "PdfFont";
    doc.addFileToVFS(`${fontChoice.id}-Regular.ttf`, font.regular);
    doc.addFont(`${fontChoice.id}-Regular.ttf`, FONT, "normal");
    doc.addFileToVFS(`${fontChoice.id}-Bold.ttf`, font.bold);
    doc.addFont(`${fontChoice.id}-Bold.ttf`, FONT, "bold");
    doc.setFont(FONT, "normal");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    // Compact layout (owner's call, "B"): 8pt items, subcategories in a
    // left column instead of their own bars. Print-safe margins (owner's
    // call, "A"): 15mm at the sides and top, 18mm at the bottom, with the
    // footer 10mm from the edge — clear of the ~5mm most printers can't
    // print.
    const marginX = 43, marginTop = 43, marginBottom = 51;
    const footerY = pageHeight - 28;
    const usableWidth = pageWidth - marginX * 2;
    const contentBottom = pageHeight - marginBottom;

    const dayColW = 20;
    // Matches the on-screen manifest: when the project uses one shared
    // quantity for every day ("All days same"), the PDF prints a single
    // QTY column instead of a MAX column plus one column per day.
    const perDayQty = !!project?.perDayQty;
    // Linked days (same equipment) that sit back to back print as one
    // column headed "D1/2/3" on one line, widened to fit its heading
    // (owner's call); the rest keep a 20pt column each. `x` = centre.
    const dayNo = (d) => d.label.replace("Day ", "");
    doc.setFont(FONT, "bold");
    doc.setFontSize(6.5);
    const cols = (perDayQty ? runColumns(days, project?.dayLinks) : []).map((c) => {
      const head = days.length === 1 ? "QTY" : `D${c.days.map(dayNo).join("/")}`;
      return { ...c, head, w: Math.max(dayColW, Math.ceil(doc.getTextWidth(head)) + 7) };
    });
    const singleQtyColW = dayColW;
    const maxColW = perDayQty && cols.length > 1 ? dayColW : 0;
    const dayColsWidth = perDayQty ? cols.reduce((sum, c) => sum + c.w, 0) : singleQtyColW;
    // Subcategory names sit in a column at the left, beside their first
    // item (owner's call), instead of taking a row of their own.
    const subColW = 78;
    const rowX = marginX + subColW;
    const rowWidth = usableWidth - subColW;
    // The item column has one fixed width (owner's call): what's left once
    // 7 day columns, MAX and a 120pt NOTES column are set aside, so every
    // list has room for those; fewer days give the spare room to NOTES.
    const nameColW = rowWidth - dayColW * 8 - 120;
    const notesColW = rowWidth - nameColW - maxColW - dayColsWidth;
    let colLeft = rowX + nameColW + maxColW;
    cols.forEach((c) => { c.x = colLeft + c.w / 2; colLeft += c.w; });
    const accentRgb = hexToRgb(accentHex);
    const lh = (size) => size * 1.25;
    const BAR_H = 13;
    const barBaseline = (size) => (BAR_H + fontChoice.capHeight * size) / 2;

    let y = marginTop;
    let pageRows = 0; // item rows on the current page

    function newPage() {
      doc.addPage();
      y = marginTop;
      pageRows = 0;
      drawColumnHeader();
    }
    function ensureSpace(h) {
      if (y + h > contentBottom) newPage();
    }
    function drawColumnHeader() {
      doc.setFont(FONT, "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(136, 136, 136);
      doc.text("SECTION", marginX + 6, y);
      doc.text("ITEM", rowX, y);
      doc.text("NOTES", rowX + nameColW + maxColW + dayColsWidth, y);
      // The quantity headings (MAX, D1, D2…, QTY) in the accent colour
      // (owner's call); SECTION, ITEM and NOTES stay grey.
      doc.setTextColor(...accentRgb);
      if (maxColW > 0) {
        doc.text("MAX", rowX + nameColW + maxColW / 2, y, { align: "center" });
      }
      if (perDayQty) {
        cols.forEach((c) => doc.text(c.head, c.x, y, { align: "center" }));
      } else {
        doc.text("QTY", rowX + nameColW + maxColW + singleQtyColW / 2, y, { align: "center" });
      }
      y += 9;
    }

    const visibleGrouped = computeVisibleGrouped(manifestGrouped, itemData);
    const infoPairs = [
      { label: "Production House", values: [project?.productionHouse, project?.producer].filter(Boolean) },
      { label: "Rental House", values: [project?.rentalHouse, project?.gaffer].filter(Boolean) },
    ].filter((pair) => pair.values.length > 0);
    const shootDateRange = formatShootDateRange(project?.days);

    // Brand line now lives in the footer (see below) so the header stays
    // dedicated to the information that actually matters per-document.

    // Header: prepared-by (right), and tag + name + shoot dates (left) in
    // the space left of it — a long name wraps instead of running under
    // the prepared-by block, and the dates move to their own line when
    // they don't fit after the name.
    const headerTopY = y;
    const rightX = marginX + usableWidth;
    const rightLines = [
      preparedBy.name && { text: preparedBy.name, style: "bold", size: 12, color: [0, 0, 0], step: 10.5 },
      preparedBy.email && { text: preparedBy.email, style: "normal", size: 7.5, color: [85, 85, 85], step: 9 },
      preparedBy.phone && { text: preparedBy.phone, style: "normal", size: 7.5, color: [85, 85, 85], step: 9 },
    ].filter(Boolean);
    let rightW = 0;
    rightLines.forEach((l) => { doc.setFont(FONT, l.style); doc.setFontSize(l.size); rightW = Math.max(rightW, doc.getTextWidth(l.text)); });
    let rightY = headerTopY;
    rightLines.forEach((l) => {
      doc.setFont(FONT, l.style);
      doc.setFontSize(l.size);
      doc.setTextColor(...l.color);
      doc.text(l.text, rightX, rightY, { align: "right" });
      rightY += l.step;
    });

    const leftWidth = usableWidth - (rightW ? rightW + 18 : 0);
    let leftX = marginX;
    doc.setFont(FONT, "bold");
    if (project?.tag) {
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      const tagText = project.tag.toUpperCase();
      doc.text(tagText, leftX, y);
      leftX += doc.getTextWidth(tagText) + 7;
    }
    const nameWidth = leftWidth - (leftX - marginX);
    doc.setFontSize(13);
    doc.setTextColor(...accentRgb);
    const nameLines = doc.splitTextToSize((project?.name || "Equipment List").toUpperCase(), nameWidth);
    let leftY = y;
    nameLines.forEach((line, i) => {
      if (i) leftY += lh(13);
      doc.text(line, leftX, leftY);
    });
    if (shootDateRange) {
      doc.setTextColor(0, 0, 0);
      const last = nameLines[nameLines.length - 1] || "";
      const after = `· ${shootDateRange}`;
      const lastW = doc.getTextWidth(last);
      if (lastW + 8 + doc.getTextWidth(after) <= nameWidth) {
        doc.text(after, leftX + lastW + 8, leftY);
      } else {
        leftY += lh(13);
        doc.text(shootDateRange, leftX, leftY);
      }
    }

    y = Math.max(leftY + 8, rightY) + 6;

    // Info strip: Production House and Rental House (the house and its
    // Producer / Gaffer on one line, "·" between; owner's call) flow left
    // to right, and Created On (date · time) sits right-aligned. The names
    // are slightly spaced out; houses too long for the space are cut off
    // with "…".
    const hasCreatedOn = Boolean(project?.createdAt);
    if (infoPairs.length > 0 || hasCreatedOn) {
      const gap = 24;
      const SPACE = 0.4; // extra space between letters of the names
      const createdD = hasCreatedOn ? new Date(project.createdAt) : null;
      const createdText = hasCreatedOn ? `${formatDMY(fmtDate(createdD))} · ${formatTime24(createdD)}` : "";
      const width = (text, size, cs = 0) => {
        doc.setFont(FONT, "bold");
        doc.setFontSize(size);
        return doc.getTextWidth(text) + cs * Math.max(0, text.length - 1);
      };
      const createdW = hasCreatedOn ? Math.max(width("CREATED ON", 6.5), width(createdText, 8.5, SPACE)) : 0;
      const cols = [
        { label: "Production House", parts: [project?.productionHouse, project?.producer] },
        { label: "Rental House", parts: [project?.rentalHouse, project?.gaffer] },
      ].map((c) => ({ ...c, parts: c.parts.filter(Boolean) })).filter((c) => c.parts.length);
      const natural = cols.map((c) => Math.max(width(c.label.toUpperCase(), 6.5), width(c.parts.join(" · "), 8.5, SPACE)));
      const avail = usableWidth - (hasCreatedOn ? createdW + gap : 0);
      const fits = natural.reduce((a, b) => a + b, 0) + gap * Math.max(0, cols.length - 1) <= avail;
      const share = cols.length ? (avail - gap * (cols.length - 1)) / cols.length : 0;
      const cut = (text, max) => {
        if (width(text, 8.5, SPACE) <= max) return text;
        let t = text;
        while (t.length > 1 && width(`${t}…`, 8.5, SPACE) > max) t = t.slice(0, -1);
        return `${t.trimEnd()}…`;
      };
      // House and person on one line: when they don't fit, the house is
      // cut first so the person still shows (each keeps at least half).
      const pair = ([house, person], max) => {
        if (!person) return cut(house, max);
        const full = `${house} · ${person}`;
        if (width(full, 8.5, SPACE) <= max) return full;
        const rest = max - width(` · ${person}`, 8.5, SPACE);
        const houseMax = Math.max(rest, max / 2);
        const h = cut(house, houseMax);
        return `${h} · ${cut(person, max - width(`${h} · `, 8.5, SPACE))}`;
      };
      let px = marginX;
      cols.forEach((c, i) => {
        const colW = fits ? natural[i] : share;
        doc.setFont(FONT, "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(136, 136, 136);
        doc.text(c.label.toUpperCase(), px, y);
        const text = pair(c.parts, colW);
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        doc.text(text, px, y + 10, { charSpace: SPACE });
        px += colW + gap;
      });

      if (hasCreatedOn) {
        doc.setFont(FONT, "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(136, 136, 136);
        doc.text("CREATED ON", rightX, y, { align: "right" });
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        // Right-aligned by hand: jsPDF's align ignores the letter spacing.
        doc.text(createdText, rightX - width(createdText, 8.5, SPACE), y + 10, { charSpace: SPACE });
      }

      y += 10 + 9;
    }

    // Divider
    doc.setDrawColor(...accentRgb);
    doc.setLineWidth(1.5);
    doc.line(marginX, y, marginX + usableWidth, y);
    doc.setLineWidth(1);
    y += 11;

    // Project note, then the list's own note (owner's lists) in italics
    // under it. The fonts have no italic, so it's slanted.
    const noteText = (project?.note || "").trim();
    const listNoteText = (project?.listNote || "").trim();
    if (noteText) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 51, 51);
      doc.splitTextToSize(noteText, usableWidth).forEach((line) => { doc.text(line, marginX, y); y += lh(8); });
    }
    if (listNoteText) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(8);
      doc.setTextColor(85, 85, 85);
      const slant = 0.2;
      doc.splitTextToSize(listNoteText, usableWidth - 4).forEach((line) => {
        doc.saveGraphicsState();
        doc.internal.write(`1 0 ${slant} 1 ${(-slant * (pageHeight - y)).toFixed(3)} 0 cm`);
        doc.text(line, marginX, y);
        doc.restoreGraphicsState();
        y += lh(8);
      });
    }
    if (noteText || listNoteText) y += 6;

    if (Object.keys(visibleGrouped).length === 0) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(9);
      doc.setTextColor(136, 136, 136);
      doc.text("No quantities entered for this shoot yet.", marginX, y);
    } else {
      ensureSpace(16);
      drawColumnHeader();
    }

    // Row geometry: the same gap above the first line's capitals and below
    // the last line's baseline, so text sits centred between the dividers
    // whether or not a row has a spec line or a long note. (Cap-height
    // from the embedded font; the gap is wider than the deepest descender
    // of any of the fonts, incl. Vietnamese marks, so those still clear
    // the divider.)
    const ITEM = fit.item, SPEC = 6.8, SUB = 6;
    const PAD = fit.pad;
    const topPad = PAD + fontChoice.capHeight * ITEM; // first baseline, from the row top
    const specGap = 8.5;                              // name baseline → spec-line baseline

    orderedKeys(visibleGrouped, Object.keys(departments)).forEach((dept) => {
      // Category bar; text centred on its capitals.
      ensureSpace(BAR_H + 30);
      doc.setFillColor(...accentRgb);
      doc.rect(marginX, y, usableWidth, BAR_H, "F");
      doc.setFont(FONT, "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(dept.toUpperCase(), marginX + 6, y + barBaseline(8.5));
      y += BAR_H;

      orderedKeys(visibleGrouped[dept], departments[dept] || []).forEach((sub, subIdx) => {
        // A thin line between subcategories (the rows inside one have
        // lighter lines that start at the item column).
        if (subIdx > 0) {
          doc.setDrawColor(215, 215, 210);
          doc.line(marginX, y, marginX + usableWidth, y);
        }
        // The subcategory's name, small, spaced-out and in the accent
        // colour (like the composer), in the left column beside its first
        // item, and again if the subcategory carries on over a page.
        // "Others" is the wildcard category (owner's call): its items,
        // and any item without a subcategory, have no name there.
        let subLines = [];
        if (sub && !/^others?$/i.test(dept.trim())) {
          doc.setFont(FONT, "bold");
          doc.setFontSize(SUB);
          subLines = doc.splitTextToSize(sub.toUpperCase(), subColW - 10);
        }
        const itemsInSub = visibleGrouped[dept][sub];
        itemsInSub.forEach((c, idx) => {
          const entry = itemData[c.id];
          const projectNote = entry?.noteHidden ? "" : (entry?.notes || "");
          doc.setFont(FONT, "normal");
          doc.setFontSize(ITEM);
          const nameLines = doc.splitTextToSize(c.name, nameColW - 4);
          // The catalog's spec note ("S35") sits under the name (owner's call).
          doc.setFontSize(SPEC);
          const catNoteLines = c.note ? doc.splitTextToSize(c.note, nameColW - 4) : [];
          doc.setFontSize(ITEM);
          const projectNoteLines = projectNote ? doc.splitTextToSize(projectNote, notesColW - 4) : [];
          // Distance from the first baseline to the last one, per column.
          const leftDepth = (nameLines.length - 1) * lh(ITEM)
            + (catNoteLines.length ? specGap + (catNoteLines.length - 1) * lh(SPEC) : 0);
          const rightDepth = Math.max(projectNoteLines.length - 1, 0) * lh(ITEM);
          const subDepth = idx === 0 ? Math.max(subLines.length - 1, 0) * lh(SUB) : 0;
          const rowHeight = topPad + Math.max(leftDepth, rightDepth, subDepth) + PAD;

          const before = y;
          ensureSpace(rowHeight);
          const rowTop = y;

          if (subLines.length && (idx === 0 || rowTop !== before)) {
            doc.setFont(FONT, "bold");
            doc.setFontSize(SUB);
            doc.setTextColor(...accentRgb);
            let sy = rowTop + topPad;
            subLines.forEach((line) => { doc.text(line, marginX + 6, sy, { charSpace: 0.5 }); sy += lh(SUB); });
          }

          // Item names in regular weight (quantities stay bold).
          doc.setFont(FONT, "normal");
          doc.setFontSize(ITEM);
          doc.setTextColor(0, 0, 0);
          let ty = rowTop + topPad;
          nameLines.forEach((line, i) => { if (i) ty += lh(ITEM); doc.text(line, rowX, ty); });
          if (catNoteLines.length) {
            ty += specGap;
            doc.setFontSize(SPEC);
            doc.setTextColor(136, 136, 136);
            catNoteLines.forEach((line, i) => { if (i) ty += lh(SPEC); doc.text(line, rowX, ty); });
          }

          if (maxColW > 0) {
            const qtyValues = days.map((d) => entry?.quantities?.[d.id] || 0).filter((q) => q > 0);
            const peak = qtyValues.length > 0 ? Math.max(...qtyValues) : 0;
            doc.setFont(FONT, "bold");
            doc.setFontSize(ITEM);
            if (peak > 0) doc.setTextColor(...accentRgb); else doc.setTextColor(210, 210, 206);
            doc.text(String(peak), rowX + nameColW + maxColW / 2, rowTop + topPad, { align: "center" });
          }

          doc.setFont(FONT, "bold");
          doc.setFontSize(ITEM);
          doc.setTextColor(0, 0, 0);
          if (perDayQty) {
            // A 0 prints grey (owner's call), like MAX's.
            cols.forEach((col) => {
              const qty = entry?.quantities?.[col.id] || 0;
              if (qty > 0) doc.setTextColor(0, 0, 0); else doc.setTextColor(210, 210, 206);
              doc.text(String(qty), col.x, rowTop + topPad, { align: "center" });
            });
          } else {
            // "All days same" mode: every day carries the same value, so
            // the max across whatever's stored is the value to show.
            const sharedVals = days.map((d) => entry?.quantities?.[d.id] || 0).filter((q) => q > 0);
            const sharedQty = sharedVals.length > 0 ? Math.max(...sharedVals) : 0;
            if (sharedQty > 0) doc.setTextColor(0, 0, 0); else doc.setTextColor(210, 210, 206);
            doc.text(String(sharedQty), rowX + nameColW + maxColW + singleQtyColW / 2, rowTop + topPad, { align: "center" });
          }

          if (projectNoteLines.length) {
            doc.setFont(FONT, "normal");
            doc.setFontSize(ITEM);
            doc.setTextColor(136, 136, 136);
            let ny = rowTop + topPad;
            projectNoteLines.forEach((line) => { doc.text(line, rowX + nameColW + maxColW + dayColsWidth, ny); ny += lh(ITEM); });
          }

          y = rowTop + rowHeight;
          pageRows += 1;
          if (idx < itemsInSub.length - 1) {
            doc.setDrawColor(238, 238, 238);
            doc.line(rowX, y, rowX + rowWidth, y);
          }
        });
      });
    });

    // Footer: brand/tagline on the left, page numbers on the right — one
    // clean line, keeping the header itself free for per-document info.
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont(FONT, "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(180, 180, 180);
      doc.text("BOXGO · EQUIPMENT LIST COMPOSER", marginX, footerY);
      doc.setFont(FONT, "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, footerY, { align: "right" });
    }

    return { doc, totalPages, lastPageRows: pageRows };
  }
}
