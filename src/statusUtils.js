import { EMPLOYEE_STATUS_META, EMPLOYEE_STATUS_STEPS } from "./theme";

// Rolls a Shopify order's per-item statuses into one summary pill for the list
// view. Same "furthest-behind item" logic as the owner dashboard (see
// summarizeOwnerOrder in OwnerOrderListScreen.js) so a glance at either
// dashboard gives the same one-line read on where an order actually stands —
// previously this counted "items ready" instead, which could show a
// different-looking summary than the owner view for the same order.
export function summarizeOrder(items) {
  const total = items.length;
  const doneCount = items.filter((i) => i.status === "delivered").length;
  if (doneCount === total) return { label: "Delivered", color: EMPLOYEE_STATUS_META.delivered.color };

  const indices = items.map((i) => EMPLOYEE_STATUS_STEPS.indexOf(i.status));
  const minIdx = Math.min(...indices);
  const stalest = EMPLOYEE_STATUS_STEPS[minIdx];
  const meta = EMPLOYEE_STATUS_META[stalest] || EMPLOYEE_STATUS_META.ordered;
  return { label: meta.label, color: meta.color };
}
