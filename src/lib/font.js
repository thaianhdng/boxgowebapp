import barlowRegularUrl from "../assets/fonts/BarlowSemiCondensed-Regular.ttf?url";
import barlowBoldUrl from "../assets/fonts/BarlowSemiCondensed-Bold.ttf?url";
import barlowHeadUrl from "../assets/fonts/Barlow-Bold.ttf?url";
import jbmRegularUrl from "../assets/fonts/JetBrainsMono-Regular.ttf?url";
import jbmBoldUrl from "../assets/fonts/JetBrainsMono-Bold.ttf?url";
import interRegularUrl from "../assets/fonts/Inter-Regular.ttf?url";
import interBoldUrl from "../assets/fonts/Inter-Bold.ttf?url";
import plexRegularUrl from "../assets/fonts/IBMPlexSans-Regular.ttf?url";
import plexBoldUrl from "../assets/fonts/IBMPlexSans-Bold.ttf?url";


// Fonts a PDF can be set in — chosen per project on the preview page
// (project.pdfFont). All have full Vietnamese coverage; the added ones are
// trimmed to Latin + Vietnamese + common symbols (OFL licences alongside).
// capHeight (fraction of the font size) lines rows up in lib/pdf.js.
// `head` (optional) is a bold font for the headings — title, category bars
// and subcategory names — as in the app: the Barlow pair (owner's call) is
// Barlow Semi Condensed with Barlow headings.
//
// The ids before Barlow became the default ("jetbrains", "inter", "plex")
// are deliberately not in this list: every list saved with one of them now
// prints in Barlow (owner's call: all lists switch); picks made since use
// the ids below.
export const PDF_FONTS = [
  { id: "barlow", name: "Barlow", regular: barlowRegularUrl, bold: barlowBoldUrl, head: barlowHeadUrl, capHeight: 0.7 },
  { id: "jetbrains-mono", name: "JetBrains Mono", regular: jbmRegularUrl, bold: jbmBoldUrl, capHeight: 0.731 },
  { id: "inter-sans", name: "Inter", regular: interRegularUrl, bold: interBoldUrl, capHeight: 0.728 },
  { id: "plex-sans", name: "IBM Plex Sans", regular: plexRegularUrl, bold: plexBoldUrl, capHeight: 0.698 },
];
export const DEFAULT_PDF_FONT = "barlow";

// Unknown ids (e.g. a font since removed from the list) fall back to the
// default.
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
    fontPromises.set(font.id, Promise.all([fetchB64(font.regular), fetchB64(font.bold), font.head ? fetchB64(font.head) : null])
      .then(([regular, bold, head]) => ({ regular, bold, head }))
      .catch((err) => { fontPromises.delete(font.id); throw err; }));
  }
  return fontPromises.get(font.id);
}
