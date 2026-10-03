import jbmRegularUrl from "../assets/fonts/JetBrainsMono-Regular.ttf?url";
import jbmBoldUrl from "../assets/fonts/JetBrainsMono-Bold.ttf?url";
import interRegularUrl from "../assets/fonts/Inter-Regular.ttf?url";
import interBoldUrl from "../assets/fonts/Inter-Bold.ttf?url";
import plexRegularUrl from "../assets/fonts/IBMPlexSans-Regular.ttf?url";
import plexBoldUrl from "../assets/fonts/IBMPlexSans-Bold.ttf?url";
import barlowRegularUrl from "../assets/fonts/BarlowSemiCondensed-Regular.ttf?url";
import barlowBoldUrl from "../assets/fonts/BarlowSemiCondensed-Bold.ttf?url";


// Fonts a PDF can be set in — chosen per project on the preview page
// (project.pdfFont). All have full Vietnamese coverage; the added ones are
// trimmed to Latin + Vietnamese + common symbols (OFL licences alongside).
// capHeight (fraction of the font size) lines rows up in lib/pdf.js.
export const PDF_FONTS = [
  { id: "jetbrains", name: "JetBrains Mono", regular: jbmRegularUrl, bold: jbmBoldUrl, capHeight: 0.731 },
  { id: "inter", name: "Inter", regular: interRegularUrl, bold: interBoldUrl, capHeight: 0.728 },
  { id: "plex", name: "IBM Plex Sans", regular: plexRegularUrl, bold: plexBoldUrl, capHeight: 0.698 },
  { id: "barlow", name: "Barlow Semi Condensed", regular: barlowRegularUrl, bold: barlowBoldUrl, capHeight: 0.7 },
];
export const DEFAULT_PDF_FONT = "jetbrains";

export function pdfFontFor(id) {
  return PDF_FONTS.find((f) => f.id === id) || PDF_FONTS[0];
}

// Served as static .ttf files and only fetched the first time a PDF in
// that font is built; jsPDF's addFileToVFS wants base64, so convert once
// and cache.
function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
const fontPromises = new Map();
export function loadPdfFont(id) {
  const font = pdfFontFor(id);
  if (!fontPromises.has(font.id)) {
    const fetchB64 = (url) => fetch(url).then((r) => r.arrayBuffer()).then(arrayBufferToBase64);
    fontPromises.set(font.id, Promise.all([fetchB64(font.regular), fetchB64(font.bold)])
      .then(([regular, bold]) => ({ regular, bold }))
      .catch((err) => { fontPromises.delete(font.id); throw err; }));
  }
  return fontPromises.get(font.id);
}
