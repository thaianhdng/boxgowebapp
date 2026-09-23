// Draws every page of a PDF into `container` with pdf.js: a canvas per page
// plus pdf.js's invisible text layer on top, so text stays selectable and
// copyable. Used instead of an <iframe> of the PDF because iPhone Safari
// only ever shows the first page of an embedded PDF.
//
// The legacy build is used for older iOS Safari support; both it and its
// worker load only when a preview is actually opened.

const TEXT_LAYER_CSS = `
.pdf-page { position: relative; margin: 0 auto 16px; background: #fff; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
.pdf-page canvas { display: block; }
.textLayer { position: absolute; inset: 0; overflow: clip; opacity: 1; line-height: 1; text-align: initial;
  -webkit-text-size-adjust: none; text-size-adjust: none; forced-color-adjust: none; transform-origin: 0 0; z-index: 0; }
.textLayer :is(span, br) { color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%; }
.textLayer > :not(.markedContent), .textLayer .markedContent span:not(.markedContent) { z-index: 1; }
.textLayer span.markedContent { top: 0; height: 0; }
.textLayer ::selection { background: rgba(0, 0, 255, 0.25); }
.textLayer br::selection { background: transparent; }
.textLayer .endOfContent { display: block; position: absolute; inset: 100% 0 0; z-index: 0; cursor: default; user-select: none; }
.textLayer.selecting .endOfContent { top: 0; }
`;

let stylesAdded = false;
function addStyles() {
  if (stylesAdded) return;
  const style = document.createElement("style");
  style.textContent = TEXT_LAYER_CSS;
  document.head.appendChild(style);
  stylesAdded = true;
}

let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

// Returns a cancel function; stops drawing further pages once called.
export function renderPdfPages(container, blob, { maxWidth = 900, onDone, onError } = {}) {
  let cancelled = false;
  let doc = null;
  (async () => {
    try {
      addStyles();
      const pdfjs = await loadPdfjs();
      doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
      if (cancelled) return;
      container.replaceChildren();
      const width = Math.min(maxWidth, container.clientWidth || maxWidth);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        if (cancelled) return;
        const scale = width / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale });

        const wrap = document.createElement("div");
        wrap.className = "pdf-page";
        wrap.style.width = `${viewport.width}px`;
        wrap.style.height = `${viewport.height}px`;

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const textDiv = document.createElement("div");
        textDiv.className = "textLayer";
        textDiv.style.setProperty("--scale-factor", String(scale));

        wrap.append(canvas, textDiv);
        container.append(wrap);

        await page.render({
          canvasContext: canvas.getContext("2d"),
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        }).promise;
        await new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: textDiv, viewport }).render();
      }
      if (!cancelled) onDone?.(doc.numPages);
    } catch (err) {
      if (!cancelled) onError?.(err);
    }
  })();
  return () => {
    cancelled = true;
    doc?.destroy();
  };
}
