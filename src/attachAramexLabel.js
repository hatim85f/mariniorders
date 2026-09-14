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

// Aramex's own label PDFs render the actual barcode/address block into just
// the top-left corner of a full blank page (confirmed by inspecting one
// directly) — rendering the whole page gives a mostly-white image where the
// real label is a small corner of it, no matter how big the print slot is.
// This scans the rendered canvas for the bounding box of non-white content
// and crops to that, with a small margin, before rotating.
function trimToContent(canvas, padding = 12) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  let minX = width, minY = height, maxX = -1, maxY = -1;
  // Step by 2px in each direction — plenty accurate for finding a bounding
  // box and roughly 4x faster than scanning every pixel on a scale-3 render.
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      const isBackground = a < 10 || (r > 245 && g > 245 && b > 245);
      if (!isBackground) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return canvas; // nothing but blank page found — return as-is rather than fail

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const trimmed = document.createElement("canvas");
  trimmed.width = maxX - minX + 1;
  trimmed.height = maxY - minY + 1;
  trimmed.getContext("2d").drawImage(canvas, minX, minY, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
  return trimmed;
}

// Renders page 1 of the given PDF file to a canvas, crops to the actual
// label content, rotates it 90° clockwise, and returns a PNG data URL —
// ready to drop straight into an <img> tag on the print page.
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
  const renderCtx = renderCanvas.getContext("2d");
  // getImageData needs an opaque white base — a transparent PDF background
  // would otherwise read as "background" everywhere in trimToContent.
  renderCtx.fillStyle = "#FFFFFF";
  renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
  await page.render({ canvasContext: renderCtx, viewport }).promise;

  const contentCanvas = trimToContent(renderCanvas);

  // Swap width/height for the rotated output canvas, then rotate the
  // cropped label 90° clockwise into it.
  const rotatedCanvas = document.createElement("canvas");
  rotatedCanvas.width = contentCanvas.height;
  rotatedCanvas.height = contentCanvas.width;
  const ctx = rotatedCanvas.getContext("2d");
  ctx.translate(rotatedCanvas.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(contentCanvas, 0, 0);

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
