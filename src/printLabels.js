// Builds a two-label HTML sheet (address/phone/WhatsApp-QR label + order
// items label) sized for a standard A4 sticker sheet pre-cut into two
// labels, and sends it to the browser's print dialog -- the user picks
// their actual printer (HP or otherwise) there; a web page can't target a
// specific printer directly for security reasons.
//
// The two label heights below (128mm each, stacked with a small gap) assume
// a generic 2-labels-per-A4 sheet. If your actual sticker sheet has
// different label positions, adjust LABEL_HEIGHT/PAGE_MARGIN to match.
const PAGE_MARGIN_MM = 10;
const LABEL_HEIGHT_MM = 128;
const LABEL_GAP_MM = 8;

function formatAddress(addr) {
  if (!addr) return "";
  return [addr.address1, addr.address2, addr.city, addr.country].filter(Boolean).join(", ");
}

// wa.me needs digits only (no +, spaces, or dashes).
function toWhatsAppLink(phone) {
  const digits = (phone || "").replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function qrCodeUrl(data) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function buildLabelsHtml(order) {
  const addressLine = formatAddress(order.shippingAddress);
  const waLink = toWhatsAppLink(order.customerPhone);
  const qrUrl = waLink ? qrCodeUrl(waLink) : "";

  const itemsRows = (order.items || [])
    .map((i) => `<tr><td>${escapeHtml(i.name)}</td><td class="qtyCell">${escapeHtml(i.quantity)}</td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Order ${escapeHtml(order.orderNumber)} Labels</title>
<style>
  @page { size: A4; margin: ${PAGE_MARGIN_MM}mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #0F172A; }
  .label {
    width: 100%;
    height: ${LABEL_HEIGHT_MM}mm;
    border: 1px dashed #ccc;
    padding: 8mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .label + .label { margin-top: ${LABEL_GAP_MM}mm; }
  .brand { font-size: 16px; font-weight: bold; color: #4F46E5; }
  .orderNo { font-size: 12px; color: #666; margin-top: 2mm; }
  .name { font-size: 24px; font-weight: bold; margin: 5mm 0 2mm; }
  .addr { font-size: 17px; line-height: 1.4; }
  .bottomRow { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 6mm; }
  .phone { font-size: 20px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; margin-top: 4mm; }
  th, td { border-bottom: 1px solid #ddd; padding: 5px 0; text-align: left; }
  .qtyCell { text-align: right; width: 60px; }
</style>
</head>
<body>
  <div class="label">
    <div>
      <div class="brand">Janmarini</div>
      <div class="orderNo">Order ${escapeHtml(order.orderNumber)}</div>
      <div class="name">${escapeHtml(order.customerName || "Unknown customer")}</div>
      <div class="addr">${escapeHtml(addressLine)}</div>
    </div>
    <div class="bottomRow">
      <div class="phone">${escapeHtml(order.customerPhone || "")}</div>
      ${qrUrl ? `<img src="${qrUrl}" width="100" height="100" alt="WhatsApp QR" />` : ""}
    </div>
  </div>

  <div class="label">
    <div>
      <div class="brand">Order Contents — ${escapeHtml(order.orderNumber)}</div>
      <table>
        <thead><tr><th>Item</th><th class="qtyCell">Qty</th></tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

// Opens the HTML in a new tab and triggers the browser's print dialog. Must
// be called synchronously from a click handler (the pattern used below) so
// popup blockers treat it as a user-initiated action.
export function printOrderLabels(order) {
  const html = buildLabelsHtml(order);
  const win = window.open("", "_blank", "width=850,height=1000");
  if (!win) {
    window.alert("Please allow pop-ups for this site to print labels.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch (e) {
      // ignore -- user can still print manually from the opened tab
    }
  };
  win.onload = triggerPrint;
  // Fallback: some browsers don't reliably fire onload after document.write.
  setTimeout(triggerPrint, 400);
}
