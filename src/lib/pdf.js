import { loadPdfFont, pdfFontFor } from "./font.js";
import { formatShootDateRange, fmtDate, formatDMY, formatTime24, computeVisibleGrouped, orderedKeys, hexToRgb, groupCatalog } from "./utils.js";

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
  const manifestGrouped = groupCatalog(catalog);
  const fontChoice = pdfFontFor(project?.pdfFont);
  const [{ jsPDF }, font] = await Promise.all([import("jspdf"), loadPdfFont(fontChoice.id)]);
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
    // Margins sized closer to a traditional A4 document (~2cm) rather
    // than the tighter working-draft margins used before.
    const marginX = 56, marginTop = 54, marginBottom = 46;
    const usableWidth = pageWidth - marginX * 2;
    const contentBottom = pageHeight - marginBottom;

    const dayColW = 24;
    const notesColW = 90;
    // Matches the on-screen manifest: when the project uses one shared
    // quantity for every day ("All days same"), the PDF prints a single
    // QTY column instead of a MAX column plus one column per day.
    const perDayQty = !!project?.perDayQty;
    const singleQtyColW = 24;
    const maxColW = perDayQty && days.length > 1 ? 24 : 0;
    const dayColsWidth = perDayQty ? days.length * dayColW : singleQtyColW;
    // Item rows get an extra inset on top of the page margin (matching the
    // on-screen preview's row padding), so they read as nested under their
    // subcategory bar instead of running flush to the page edge.
    const rowInset = 20;
    const rowX = marginX + rowInset;
    const rowWidth = usableWidth - rowInset * 2;
    const nameColW = rowWidth - maxColW - dayColsWidth - notesColW;
    const accentRgb = hexToRgb(accentHex);
    const lh = (size) => size * 1.28;
    const BAR_H = 17;
    const barBaseline = (size) => (BAR_H + fontChoice.capHeight * size) / 2;

    let y = marginTop;

    function newPage() {
      doc.addPage();
      y = marginTop;
      drawColumnHeader();
    }
    function ensureSpace(h) {
      if (y + h > contentBottom) newPage();
    }
    function drawColumnHeader() {
      doc.setFont(FONT, "bold");
      doc.setFontSize(8);
      doc.setTextColor(136, 136, 136);
      doc.text("ITEM", rowX, y);
      if (maxColW > 0) {
        doc.text("MAX", rowX + nameColW + maxColW / 2, y, { align: "center" });
      }
      if (perDayQty) {
        days.forEach((d, i) => {
          doc.text(days.length === 1 ? "QTY" : d.label.replace("Day ", "D"), rowX + nameColW + maxColW + i * dayColW + dayColW / 2, y, { align: "center" });
        });
      } else {
        doc.text("QTY", rowX + nameColW + maxColW + singleQtyColW / 2, y, { align: "center" });
      }
      doc.text("NOTES", rowX + nameColW + maxColW + dayColsWidth, y);
      y += 12;
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
      preparedBy.name && { text: preparedBy.name, style: "bold", size: 17, color: [0, 0, 0], step: 14 },
      preparedBy.email && { text: preparedBy.email, style: "normal", size: 9, color: [85, 85, 85], step: 11 },
      preparedBy.phone && { text: preparedBy.phone, style: "normal", size: 9, color: [85, 85, 85], step: 11 },
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
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const tagText = project.tag.toUpperCase();
      doc.text(tagText, leftX, y);
      leftX += doc.getTextWidth(tagText) + 8;
    }
    const nameWidth = leftWidth - (leftX - marginX);
    doc.setFontSize(17);
    doc.setTextColor(...accentRgb);
    const nameLines = doc.splitTextToSize((project?.name || "Equipment List").toUpperCase(), nameWidth);
    let leftY = y;
    nameLines.forEach((line, i) => {
      if (i) leftY += lh(17);
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
        leftY += lh(17);
        doc.text(shootDateRange, leftX, leftY);
      }
    }

    y = Math.max(leftY + 10, rightY) + 8;

    // Info strip: Production House and Rental House (the house, with its
    // Producer / Gaffer on the line below) flow left to right, and Created
    // On (date, with the time below) sits right-aligned. Houses too long
    // for the space are cut off with "…".
    const hasCreatedOn = Boolean(project?.createdAt);
    if (infoPairs.length > 0 || hasCreatedOn) {
      const gap = 28;
      const createdD = hasCreatedOn ? new Date(project.createdAt) : null;
      const createdLines = hasCreatedOn ? [formatDMY(fmtDate(createdD)), formatTime24(createdD)] : [];
      const width = (text, style, size) => { doc.setFont(FONT, style); doc.setFontSize(size); return doc.getTextWidth(text); };
      const createdW = hasCreatedOn ? Math.max(width("CREATED ON", "bold", 8), ...createdLines.map((t) => width(t, "bold", 11))) : 0;
      const cols = [
        { label: "Production House", lines: [[project?.productionHouse, "bold"], [project?.producer, "bold"]] },
        { label: "Rental House", lines: [[project?.rentalHouse, "bold"], [project?.gaffer, "bold"]] },
      ].map((c) => ({ ...c, lines: c.lines.filter(([t]) => t) })).filter((c) => c.lines.length);
      const natural = cols.map((c) => Math.max(width(c.label.toUpperCase(), "bold", 8), ...c.lines.map(([t, st]) => width(t, st, 11))));
      const avail = usableWidth - (hasCreatedOn ? createdW + gap : 0);
      const fits = natural.reduce((a, b) => a + b, 0) + gap * Math.max(0, cols.length - 1) <= avail;
      const share = cols.length ? (avail - gap * (cols.length - 1)) / cols.length : 0;
      const cut = (text, style, max) => {
        if (width(text, style, 11) <= max) return text;
        let t = text;
        while (t.length > 1 && width(`${t}…`, style, 11) > max) t = t.slice(0, -1);
        return `${t.trimEnd()}…`;
      };
      let px = marginX;
      let rows = createdLines.length;
      cols.forEach((c, i) => {
        const colW = fits ? natural[i] : share;
        doc.setFont(FONT, "bold");
        doc.setFontSize(8);
        doc.setTextColor(136, 136, 136);
        doc.text(c.label.toUpperCase(), px, y);
        c.lines.forEach(([text, style], k) => {
          doc.setFont(FONT, style);
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text(cut(text, style, colW), px, y + 13 * (k + 1));
        });
        rows = Math.max(rows, c.lines.length);
        px += colW + gap;
      });

      if (hasCreatedOn) {
        doc.setFont(FONT, "bold");
        doc.setFontSize(8);
        doc.setTextColor(136, 136, 136);
        doc.text("CREATED ON", rightX, y, { align: "right" });
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        createdLines.forEach((t, k) => doc.text(t, rightX, y + 13 * (k + 1), { align: "right" }));
      }

      y += 13 * rows + 13;
    }

    // Divider
    doc.setDrawColor(...accentRgb);
    doc.setLineWidth(1.5);
    doc.line(marginX, y, marginX + usableWidth, y);
    doc.setLineWidth(1);
    y += 14;

    // Project note, then the list's own note (owner's lists) in italics
    // under it. The fonts have no italic, so it's slanted.
    const noteText = (project?.note || "").trim();
    const listNoteText = (project?.listNote || "").trim();
    if (noteText) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      doc.splitTextToSize(noteText, usableWidth).forEach((line) => { doc.text(line, marginX, y); y += lh(10); });
    }
    if (listNoteText) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(10);
      doc.setTextColor(85, 85, 85);
      const slant = 0.2;
      doc.splitTextToSize(listNoteText, usableWidth - 4).forEach((line) => {
        doc.saveGraphicsState();
        doc.internal.write(`1 0 ${slant} 1 ${(-slant * (pageHeight - y)).toFixed(3)} 0 cm`);
        doc.text(line, marginX, y);
        doc.restoreGraphicsState();
        y += lh(10);
      });
    }
    if (noteText || listNoteText) y += 8;

    if (Object.keys(visibleGrouped).length === 0) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(11);
      doc.setTextColor(136, 136, 136);
      doc.text("No quantities entered for this shoot yet.", marginX, y);
    } else {
      ensureSpace(16);
      drawColumnHeader();
    }

    orderedKeys(visibleGrouped, Object.keys(departments)).forEach((dept) => {
      // Department and subcategory bars share one height; text is centred
      // on its capitals.
      ensureSpace(BAR_H * 2 + 14 + 16);
      doc.setFillColor(...accentRgb);
      doc.rect(marginX, y, usableWidth, BAR_H, "F");
      doc.setFont(FONT, "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(dept.toUpperCase(), marginX + 8, y + barBaseline(11));
      y += BAR_H;

      orderedKeys(visibleGrouped[dept], departments[dept] || []).forEach((sub) => {
        ensureSpace(BAR_H + 14 + 16);
        doc.setFillColor(242, 242, 242);
        doc.rect(marginX, y, usableWidth, BAR_H, "F");
        doc.setFont(FONT, "bold");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(sub.toUpperCase(), marginX + 12, y + barBaseline(9));
        y += BAR_H;

        // Row geometry: the same gap above the first line's capitals and
        // below the last line's baseline, so text sits centred between the
        // dividers whether or not a row has a spec line or a long note.
        // (Cap-height from the embedded font; the gap is wider than the
        // deepest descender of any of the fonts, incl. Vietnamese marks,
        // so those still clear the divider.)
        const PAD = 6;
        const topPad = PAD + fontChoice.capHeight * 10; // first baseline, from the row top
        const specGap = 11;                // name baseline → spec-line baseline
        const itemsInSub = visibleGrouped[dept][sub];
        itemsInSub.forEach((c, idx) => {
          const entry = itemData[c.id];
          const projectNote = entry?.noteHidden ? "" : (entry?.notes || "");
          doc.setFont(FONT, "normal");
          doc.setFontSize(10);
          const nameLines = doc.splitTextToSize(c.name, nameColW - 4);
          doc.setFontSize(8.5);
          const catNoteLines = c.note ? doc.splitTextToSize(c.note, nameColW - 4) : [];
          doc.setFontSize(10);
          const projectNoteLines = projectNote ? doc.splitTextToSize(projectNote, notesColW - 4) : [];
          // Distance from the first baseline to the last one, per column.
          const leftDepth = (nameLines.length - 1) * lh(10)
            + (catNoteLines.length ? specGap + (catNoteLines.length - 1) * lh(8.5) : 0);
          const rightDepth = Math.max(projectNoteLines.length - 1, 0) * lh(10);
          const rowHeight = topPad + Math.max(leftDepth, rightDepth) + PAD;

          ensureSpace(rowHeight);
          const rowTop = y;

          doc.setFont(FONT, "bold");
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          let ty = rowTop + topPad;
          nameLines.forEach((line, i) => { if (i) ty += lh(10); doc.text(line, rowX, ty); });
          if (catNoteLines.length) {
            ty += specGap;
            doc.setFont(FONT, "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(136, 136, 136);
            catNoteLines.forEach((line, i) => { if (i) ty += lh(8.5); doc.text(line, rowX, ty); });
          }

          if (maxColW > 0) {
            const qtyValues = days.map((d) => entry?.quantities?.[d.id] || 0).filter((q) => q > 0);
            const peak = qtyValues.length > 0 ? Math.max(...qtyValues) : 0;
            doc.setFont(FONT, "bold");
            doc.setFontSize(10);
            if (peak > 0) doc.setTextColor(...accentRgb); else doc.setTextColor(210, 210, 206);
            doc.text(String(peak), rowX + nameColW + maxColW / 2, rowTop + topPad, { align: "center" });
          }

          doc.setFont(FONT, "bold");
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          if (perDayQty) {
            days.forEach((d, i) => {
              const qty = entry?.quantities?.[d.id] || 0;
              doc.text(String(qty), rowX + nameColW + maxColW + i * dayColW + dayColW / 2, rowTop + topPad, { align: "center" });
            });
          } else {
            // "All days same" mode: every day carries the same value, so
            // the max across whatever's stored is the value to show.
            const sharedVals = days.map((d) => entry?.quantities?.[d.id] || 0).filter((q) => q > 0);
            const sharedQty = sharedVals.length > 0 ? Math.max(...sharedVals) : 0;
            doc.text(String(sharedQty), rowX + nameColW + maxColW + singleQtyColW / 2, rowTop + topPad, { align: "center" });
          }

          if (projectNoteLines.length) {
            doc.setFont(FONT, "normal");
            doc.setFontSize(10);
            doc.setTextColor(136, 136, 136);
            let ny = rowTop + topPad;
            projectNoteLines.forEach((line) => { doc.text(line, rowX + nameColW + maxColW + dayColsWidth, ny); ny += lh(10); });
          }

          y = rowTop + rowHeight;
          if (idx < itemsInSub.length - 1) {
            doc.setDrawColor(242, 242, 242);
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
      doc.setFontSize(7.5);
      doc.setTextColor(180, 180, 180);
      doc.text("BOXGO · EQUIPMENT LIST COMPOSER", marginX, pageHeight - marginBottom / 2);
      doc.setFont(FONT, "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - marginBottom / 2, { align: "right" });
    }

    const blob = doc.output("blob");
    return { blob, totalPages };
  }
