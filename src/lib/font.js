import jbmRegularUrl from "../assets/fonts/JetBrainsMono-Regular.ttf?url";
import jbmBoldUrl from "../assets/fonts/JetBrainsMono-Bold.ttf?url";


// JetBrains Mono (full Vietnamese coverage) embedded into generated PDFs.
// Served as static .ttf files and only fetched the first time a PDF or
// share snapshot is built; jsPDF's addFileToVFS wants base64, so convert
// once and cache.
function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
let jbmFontPromise = null;
export function loadJbmFont() {
  if (!jbmFontPromise) {
    const fetchB64 = (url) => fetch(url).then((r) => r.arrayBuffer()).then(arrayBufferToBase64);
    jbmFontPromise = Promise.all([fetchB64(jbmRegularUrl), fetchB64(jbmBoldUrl)])
      .then(([regular, bold]) => ({ regular, bold }))
      .catch((err) => { jbmFontPromise = null; throw err; });
  }
  return jbmFontPromise;
}