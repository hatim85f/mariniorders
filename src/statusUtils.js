import { EMPLOYEE_STATUS_META } from "./theme";

// Rolls a Shopify order's per-item statuses into one summary pill for the list
// view. Item statuses here are already collapsed to the employee's 4 stages
// by the backend (ordered / in_transit_to_dubai / in_office / delivered).
export function summarizeOrder(items) {
  const total = items.length;
  const doneCount = items.filter((i) => i.status === "delivered").length;
  const readyCount = items.filter((i) => i.status === "in_office" || i.status === "delivered").length;

  if (doneCount === total) return { label: "Delivered", color: EMPLOYEE_STATUS_META.delivered.color };
  if (readyCount === total) return { label: "Ready to pack", color: EMPLOYEE_STATUS_META.in_office.color };
  if (readyCount > 0) return { label: `${readyCount} of ${total} items ready`, color: EMPLOYEE_STATUS_META.in_office.color };

  const anyInTransit = items.some((i) => i.status === "in_transit_to_dubai");
  if (anyInTransit) return { label: "In transit to Dubai", color: EMPLOYEE_STATUS_META.in_transit_to_dubai.color };

  return { label: "Awaiting shipment", color: EMPLOYEE_STATUS_META.ordered.color };
}
