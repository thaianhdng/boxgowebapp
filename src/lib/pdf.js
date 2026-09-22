import { loadJbmFont } from "./font.js";
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
  const [{ jsPDF }, font] = await Promise.all([import("jspdf"), loadJbmFont()]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });

    // Embed JetBrains Mono directly (regular + bold) so Vietnamese
    // diacritics render as real, selectable text rather than a flattened
    // screenshot image.
    doc.addFileToVFS("JetBrainsMono-Regular.ttf", font.regular);
    doc.addFont("JetBrainsMono-Regular.ttf", "JetBrainsMono", "normal");
    doc.addFileToVFS("JetBrainsMono-Bold.ttf", font.bold);
    doc.addFont("JetBrainsMono-Bold.ttf", "JetBrainsMono", "bold");
    doc.setFont("JetBrainsMono", "normal");

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
      doc.setFont("JetBrainsMono", "bold");
      doc.setFontSize(8);
      doc.setTextColor(136, 136, 136);
      doc.text("ITEM", rowX, y);
      if (maxColW > 0) {
        doc.text("MAX", rowX + nameColW + maxColW / 2, y, { align: "center" });
      }
      if (perDayQty) {
        days.forEach((d, i) => {
          doc.text(d.label.replace("Day ", "D"), rowX + nameColW + maxColW + i * dayColW + dayColW / 2, y, { align: "center" });
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

    // Header: tag + name + date (left), prepared-by (right)
    const headerTopY = y;
    let leftX = marginX;
    doc.setFont("JetBrainsMono", "bold");
    if (project?.tag) {
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const tagText = project.tag.toUpperCase();
      doc.text(tagText, leftX, y);
      leftX += doc.getTextWidth(tagText) + 8;
    }
    doc.setFontSize(17);
    doc.setTextColor(...accentRgb);
    const nameText = (project?.name || "Equipment List").toUpperCase();
    doc.text(nameText, leftX, y);
    leftX += doc.getTextWidth(nameText) + 8;
    if (shootDateRange) {
      doc.setTextColor(0, 0, 0);
      doc.text(`· ${shootDateRange}`, leftX, y);
    }

    // Prepared-by block, right-aligned
    let rightY = headerTopY;
    const rightX = marginX + usableWidth;
    if (preparedBy.name) {
      doc.setFont("JetBrainsMono", "bold");
      doc.setFontSize(17);
      doc.setTextColor(0, 0, 0);
      doc.text(preparedBy.name, rightX, rightY, { align: "right" });
      rightY += 14;
    }
    if (preparedBy.email) {
      doc.setFont("JetBrainsMono", "normal");
      doc.setFontSize(9);
      doc.setTextColor(85, 85, 85);
      doc.text(preparedBy.email, rightX, rightY, { align: "right" });
      rightY += 11;
    }
    if (preparedBy.phone) {
      doc.setFont("JetBrainsMono", "normal");
      doc.setFontSize(9);
      doc.setTextColor(85, 85, 85);
      doc.text(preparedBy.phone, rightX, rightY, { align: "right" });
      rightY += 11;
    }

    y = Math.max(headerTopY + 10, rightY) + 8;

    // Info strip: Production House / Rental House flow left-to-right based
    // on actual content width (matching the preview's flex layout), and
    // Created On sits as a third block, right-aligned, on the same line —
    // one single strip instead of a separate stacked block up top.
    const hasCreatedOn = Boolean(project?.createdAt);
    if (infoPairs.length > 0 || hasCreatedOn) {
      let px = marginX;
      const gap = 28;
      infoPairs.forEach((pair) => {
        doc.setFont("JetBrainsMono", "bold");
        doc.setFontSize(8);
        doc.setTextColor(136, 136, 136);
        const labelText = pair.label.toUpperCase();
        doc.text(labelText, px, y);
        const labelWidth = doc.getTextWidth(labelText);

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        const valueText = pair.values.join(" · ");
        doc.text(valueText, px, y + 13);
        const valueWidth = doc.getTextWidth(valueText);

        px += Math.max(labelWidth, valueWidth) + gap;
      });

      if (hasCreatedOn) {
        doc.setFont("JetBrainsMono", "bold");
        doc.setFontSize(8);
        doc.setTextColor(136, 136, 136);
        doc.text("CREATED ON", rightX, y, { align: "right" });
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        {
          const createdD = new Date(project.createdAt);
          doc.text(`${formatDMY(fmtDate(createdD))}  ${formatTime24(createdD)}`, rightX, y + 13, { align: "right" });
        }
      }

      y += 26;
    }

    // Divider
    doc.setDrawColor(...accentRgb);
    doc.setLineWidth(3);
    doc.line(marginX, y, marginX + usableWidth, y);
    doc.setLineWidth(1);
    y += 14;

    // Project note
    if (project?.note) {
      doc.setFont("JetBrainsMono", "bold");
      doc.setFontSize(8);
      doc.setTextColor(136, 136, 136);
      doc.text("PROJECT NOTE", marginX, y);
      y += 12;
      doc.setFont("JetBrainsMono", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      const noteLines = doc.splitTextToSize(project.note, usableWidth);
      noteLines.forEach((line) => { doc.text(line, marginX, y); y += lh(10); });
      y += 8;
    }

    if (Object.keys(visibleGrouped).length === 0) {
      doc.setFont("JetBrainsMono", "normal");
      doc.setFontSize(11);
      doc.setTextColor(136, 136, 136);
      doc.text("No quantities entered for this shoot yet.", marginX, y);
    } else {
      ensureSpace(16);
      drawColumnHeader();
    }

    orderedKeys(visibleGrouped, Object.keys(departments)).forEach((dept) => {
      ensureSpace(20 + 16 + 14 + 16);
      doc.setFillColor(...accentRgb);
      doc.rect(marginX, y, usableWidth, 17, "F");
      doc.setFont("JetBrainsMono", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(dept.toUpperCase(), marginX + 8, y + 12);
      y += 17;

      orderedKeys(visibleGrouped[dept], departments[dept] || []).forEach((sub) => {
        ensureSpace(15 + 14 + 16);
        doc.setFillColor(242, 242, 242);
        doc.rect(marginX, y, usableWidth, 15, "F");
        doc.setFont("JetBrainsMono", "bold");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(sub.toUpperCase(), marginX + 12, y + 11);
        y += 15;

        // Row geometry: a shared baseline offset can't give equal visual
        // clearance on both sides of the divider — a line's cap-height
        // eats into the space below its own baseline, but there's no
        // matching eat-in above the previous line's baseline (uppercase
        // text has no descender). So top and bottom use different values,
        // each sized off the embedded font's real metrics (cap-height
        // 0.731em, worst-case descender incl. Vietnamese marks 0.213em)
        // plus a flat 3pt of intended clearance:
        const G = 4.5;
        const topPad = G + 0.731 * 10;   // clears the next line's cap-height
        const bottomPad = G + 0.22 * 10; // clears this line's descender
        const itemsInSub = visibleGrouped[dept][sub];
        itemsInSub.forEach((c, idx) => {
          const entry = itemData[c.id];
          const projectNote = entry?.noteHidden ? "" : (entry?.notes || "");
          doc.setFont("JetBrainsMono", "normal");
          doc.setFontSize(10);
          const nameLines = doc.splitTextToSize(c.name, nameColW - 4);
          doc.setFontSize(8.5);
          const catNoteLines = c.note ? doc.splitTextToSize(c.note, nameColW - 4) : [];
          doc.setFontSize(10);
          const projectNoteLines = projectNote ? doc.splitTextToSize(projectNote, notesColW - 4) : [];
          const rowLines = Math.max(nameLines.length + catNoteLines.length, projectNoteLines.length, 1);
          const rowHeight = topPad + (rowLines - 1) * lh(10) + bottomPad;

          ensureSpace(rowHeight);
          const rowTop = y;

          doc.setFont("JetBrainsMono", "bold");
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          let ty = rowTop + topPad;
          nameLines.forEach((line) => { doc.text(line, rowX, ty); ty += lh(10); });
          if (catNoteLines.length) {
            doc.setFont("JetBrainsMono", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(136, 136, 136);
            catNoteLines.forEach((line) => { doc.text(line, rowX, ty); ty += lh(8.5); });
          }

          if (maxColW > 0) {
            const qtyValues = days.map((d) => entry?.quantities?.[d.id] || 0).filter((q) => q > 0);
            const peak = qtyValues.length > 0 ? Math.max(...qtyValues) : 0;
            doc.setFont("JetBrainsMono", "bold");
            doc.setFontSize(10);
            if (peak > 0) doc.setTextColor(...accentRgb); else doc.setTextColor(210, 210, 206);
            doc.text(String(peak), rowX + nameColW + maxColW / 2, rowTop + topPad, { align: "center" });
          }

          doc.setFont("JetBrainsMono", "bold");
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
            doc.setFont("JetBrainsMono", "normal");
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
        y += 3;
      });
    });

    // Footer: brand/tagline on the left, page numbers on the right — one
    // clean line, keeping the header itself free for per-document info.
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("JetBrainsMono", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(180, 180, 180);
      doc.text("BOXGO · EQUIPMENT LIST COMPOSER", marginX, pageHeight - marginBottom / 2);
      doc.setFont("JetBrainsMono", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - marginBottom / 2, { align: "right" });
    }

    const blob = doc.output("blob");
    return { blob, totalPages };
  }
