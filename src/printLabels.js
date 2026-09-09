// Builds a single address/phone/WhatsApp-QR/courier-tracking label (the
// order-contents second label was removed -- only the top half of the A4
// sheet prints now) and sends it to the browser's print dialog -- the user
// picks their actual printer (HP or otherwise) there; a web page can't
// target a specific printer directly for security reasons.
//
// The label height below (128mm) assumes a generic 2-labels-per-A4 sticker
// sheet, printing only the first slot. If your actual sheet has different
// label positions, adjust LABEL_HEIGHT/PAGE_MARGIN to match.
const PAGE_MARGIN_MM = 10;
const LABEL_HEIGHT_MM = 128;
const LABEL_GAP_MM = 8;

// Inline SVGs (not external image requests) so the label always prints
// correctly even if the network is slow/unavailable at print time -- the QR
// code itself still needs a network call to generate, these icons don't.
const PHONE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0F766D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
const WHATSAPP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#25D366"/><path fill="#fff" d="M23.47 8.52A10.6 10.6 0 0 0 16.02 5c-5.86 0-10.63 4.77-10.63 10.63 0 1.87.49 3.7 1.42 5.31L5 27l6.2-1.62a10.6 10.6 0 0 0 4.82 1.23h.005c5.86 0 10.63-4.77 10.63-10.63 0-2.84-1.1-5.51-3.18-7.46zm-7.45 16.3h-.004a8.84 8.84 0 0 1-4.5-1.23l-.32-.19-3.34.88.9-3.26-.21-.33a8.84 8.84 0 0 1-1.36-4.71c0-4.88 3.97-8.85 8.86-8.85a8.8 8.8 0 0 1 6.26 2.6 8.8 8.8 0 0 1 2.59 6.26c0 4.88-3.97 8.83-8.85 8.83zm4.85-6.62c-.27-.13-1.59-.78-1.83-.87-.25-.09-.43-.13-.61.13-.18.27-.7.87-.86 1.05-.16.18-.32.2-.59.07-.27-.13-1.14-.42-2.17-1.34-.8-.71-1.34-1.6-1.5-1.87-.16-.27-.02-.42.12-.55.12-.12.27-.32.4-.48.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.48-.07-.13-.61-1.47-.84-2.02-.22-.53-.44-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.28 0 1.35.98 2.65 1.12 2.83.13.18 1.93 2.95 4.68 4.13.65.28 1.16.45 1.56.58.66.21 1.25.18 1.72.11.53-.08 1.59-.65 1.81-1.28.22-.63.22-1.16.16-1.28-.07-.12-.25-.19-.52-.32z"/></svg>`;

function svgDataUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

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

export function buildLabelsHtml(order, shipment) {
  const addressLine = formatAddress(order.shippingAddress);
  const waLink = toWhatsAppLink(order.customerPhone);
  const qrUrl = waLink ? qrCodeUrl(waLink) : "";
  const phoneIconUri = svgDataUri(PHONE_ICON_SVG);
  const waIconUri = svgDataUri(WHATSAPP_ICON_SVG);
  const courier = shipment?.courier || "";
  const trackingNumber = shipment?.trackingNumber || "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Order ${escapeHtml(order.orderNumber)} Label</title>
<style>
  @page { size: A4; margin: ${PAGE_MARGIN_MM}mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; margin: 0; color: #1F2937; }
  .label {
    width: 100%;
    height: ${LABEL_HEIGHT_MM}mm;
    border: 1px solid #E2E8F0;
    border-radius: 3mm;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .accentBar { height: 3mm; background: #0F766D; flex-shrink: 0; }
  .labelBody { padding: 8mm; flex: 1; display: flex; flex-direction: column; justify-content: space-between; font-family: Arial, Helvetica, sans-serif; }
  .orderNo { font-size: 11px; color: #6B7280; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; }
  .name { font-size: 25px; font-weight: 600; color: #1F2937; margin: 5mm 0 2mm; font-family: Georgia, serif; }
  .addr { font-size: 16px; color: #374151; line-height: 1.5; }
  .bottomRow { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 6mm; }
  .phoneRow { display: flex; align-items: center; gap: 2mm; }
  .iconSm { width: 16px; height: 16px; }
  .phone { font-size: 18px; font-weight: 600; color: #1F2937; }
  .qrWrap { position: relative; }
  .qr { display: block; border: 1px solid #E2E8F0; border-radius: 2mm; }
  .waBadge { position: absolute; bottom: -4px; right: -4px; border-radius: 50%; border: 2px solid #fff; }
  .shipmentBox { margin-top: 5mm; padding: 4mm 5mm; background: #F0FDFA; border: 1px solid #99F6E4; border-radius: 2mm; }
  .shipmentRow { display: flex; justify-content: space-between; align-items: center; }
  .shipmentLabel { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #0F766D; font-weight: 700; }
  .shipmentValue { font-size: 20px; font-weight: 700; color: #0F172A; }
  .courierValue { font-size: 15px; font-weight: 700; color: #0F766D; text-transform: uppercase; }
</style>
</head>
<body>
  <div class="label">
    <div class="accentBar"></div>
    <div class="labelBody">
      <div>
        <div class="orderNo">Order ${escapeHtml(order.orderNumber)}</div>
        <div class="name">${escapeHtml(order.customerName || "Unknown customer")}</div>
        <div class="addr">${escapeHtml(addressLine)}</div>
      </div>
      <div>
        ${(courier || trackingNumber) ? `<div class="shipmentBox">
          <div class="shipmentRow">
            <span class="courierValue">${escapeHtml(courier || "—")}</span>
            <span class="shipmentValue">${escapeHtml(trackingNumber || "—")}</span>
          </div>
          <div class="shipmentLabel">Tracking Number</div>
        </div>` : ""}
        <div class="bottomRow">
          <div class="phoneRow">
            <img class="iconSm" src="${phoneIconUri}" />
            <span class="phone">${escapeHtml(order.customerPhone || "")}</span>
          </div>
          ${qrUrl ? `<div class="qrWrap"><img class="qr" src="${qrUrl}" width="100" height="100" alt="WhatsApp QR" /><img class="waBadge" src="${waIconUri}" width="28" height="28" /></div>` : ""}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Opens the HTML in a new tab and triggers the browser's print dialog. Must
// be called synchronously from a click handler (the pattern used below) so
// popup blockers treat it as a user-initiated action.
export function printOrderLabels(order, shipment) {
  const html = buildLabelsHtml(order, shipment);
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
