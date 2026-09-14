// Lets the fulfillment team pick the Aramex shipping-label PDF (downloaded
// from Aramex's own site after booking a pickup) and rotates it 90° so it
// fits into the second, previously-empty half of the address-label print
// sheet (see printLabels.js) — the Aramex label itself is portrait-shaped,
// the empty slot on the print sheet is landscape, so it needs to be rotated
// to actually fit rather than shrunk down illegibly.
//
// Rendered client-side with pdf.js rather than sent to the backend: the
// label is only needed for this one print, and keeping it out of the
// database avoids storing a second copy of something Aramex already has on
// file under its tracking number.
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

// pdf.js needs a worker script; pulling it from a CDN avoids bundling it
// ourselves (Metro/webpack config for a raw worker file is a bigger lift
// than this feature justifies). Version must match the installed package.
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// Opens a native file picker restricted to PDFs. Resolves with the picked
// File, or null if the user cancels (no reliable "cancel" event on <input
// type=file> across browsers, so this relies on a focus-return heuristic).
function pickPdfFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.style.display = "none";
    let settled = false;

    const cleanup = () => {
      window.removeEventListener("focus", onFocus);
      document.body.removeChild(input);
    };
    const onFocus = () => {
      // The file dialog closing refocuses the window; give the change event
      // (which fires first when a file *was* picked) a moment to win.
      setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(null);
        }
      }, 300);
    };

    input.onchange = () => {
      settled = true;
      cleanup();
      resolve(input.files && input.files[0] ? input.files[0] : null);
    };
    window.addEventListener("focus", onFocus);
    document.body.appendChild(input);
    input.click();
  });
}

// Renders page 1 of the given PDF file to a canvas, rotates it 90° clockwise,
// and returns a PNG data URL of the rotated image — ready to drop straight
// into an <img> tag on the print page.
async function rotatePdfPageToDataUrl(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  // Scale 3x for crisp print output — Aramex labels are dense with small
  // barcode/text detail that blurs badly at screen resolution.
  const viewport = page.getViewport({ scale: 3 });

  const renderCanvas = document.createElement("canvas");
  renderCanvas.width = viewport.width;
  renderCanvas.height = viewport.height;
  await page.render({ canvasContext: renderCanvas.getContext("2d"), viewport }).promise;

  // Swap width/height for the rotated output canvas, then rotate the
  // rendered page 90° clockwise into it.
  const rotatedCanvas = document.createElement("canvas");
  rotatedCanvas.width = renderCanvas.height;
  rotatedCanvas.height = renderCanvas.width;
  const ctx = rotatedCanvas.getContext("2d");
  ctx.translate(rotatedCanvas.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(renderCanvas, 0, 0);

  return rotatedCanvas.toDataURL("image/png");
}

// Full flow: pick a file, render+rotate it. Returns null if the user
// cancelled the file picker or the PDF couldn't be rendered — callers should
// treat null as "no label attached", not throw an alert, since cancelling is
// a normal outcome here.
export async function pickAndRotateAramexLabel() {
  const file = await pickPdfFile();
  if (!file) return null;
  try {
    return await rotatePdfPageToDataUrl(file);
  } catch (e) {
    window.alert(`Couldn't read that PDF as an Aramex label: ${e.message}`);
    return null;
  }
}
