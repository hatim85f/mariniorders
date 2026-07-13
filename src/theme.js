// Codex FZE hybrid palette — kept in sync with Codex_CRM's own brand colors
// and the Stitch design system used to mock these screens.
export const colors = {
  logoGold: "#FACC15",
  logoOrange: "#FB923C",
  primary: "#6366F1",
  primaryDark: "#4F46E5",
  secondaryTeal: "#0F766D",
  secondaryTealDark: "#115E59",

  background: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  mutedText: "#64748B",

  success: "#22C55E",
  warning: "#F59E0B",
  info: "#3B82F6",
  neutral: "#94A3BB",
  danger: "#EF4444",
};

// Full internal per-item status chain (used by the backend, and by the owner
// dashboard which needs to see everything). The employee dashboard collapses
// this down — see EMPLOYEE_STATUS_STEPS below.
export const STATUS_META = {
  ordered: { label: "Ordered", color: colors.neutral },
  shipped_by_seller: { label: "Shipped by seller", color: colors.warning },
  at_shop_and_ship: { label: "At Shop & Ship", color: colors.warning },
  fees_paid: { label: "Shipping fees paid", color: colors.warning },
  in_transit_to_dubai: { label: "In transit to Dubai", color: colors.info },
  at_destination: { label: "At destination (Dubai)", color: colors.info },
  in_office: { label: "Ready to pack", color: colors.success },
  delivered: { label: "Delivered", color: colors.success },
};

export const STATUS_STEPS = [
  "ordered",
  "shipped_by_seller",
  "at_shop_and_ship",
  "fees_paid",
  "in_transit_to_dubai",
  "at_destination",
  "in_office",
  "delivered",
];

// Employee dashboard: she doesn't know or need to know about "shipped by
// seller" / "at Shop & Ship" / fee payment — those stages get folded into a
// single "Awaiting shipment" bucket.
export const EMPLOYEE_STATUS_META = {
  ordered: { label: "Awaiting shipment", color: colors.neutral },
  shipped_by_seller: { label: "Awaiting shipment", color: colors.neutral },
  at_shop_and_ship: { label: "Awaiting shipment", color: colors.neutral },
  in_transit_to_dubai: { label: "In transit to Dubai", color: colors.info },
  in_office: { label: "Ready to pack", color: colors.success },
  delivered: { label: "Delivered", color: colors.success },
};

export const EMPLOYEE_STATUS_STEPS = ["ordered", "in_transit_to_dubai", "in_office", "delivered"];

// Maps a raw (owner-level) status onto its employee-facing bucket.
export function toEmployeeStatus(rawStatus) {
  if (rawStatus === "shipped_by_seller" || rawStatus === "at_shop_and_ship") return "ordered";
  return rawStatus;
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = 12;

// Thousands-separated money display (e.g. 1632 -> "1,632.00").
export function formatAmount(n) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
