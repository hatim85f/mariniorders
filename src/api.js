import AsyncStorage from "@react-native-async-storage/async-storage";

// Same Heroku app as Codex CRM — the Janmarini routes are mounted at /api/janmarini.
// Override for local dev via EXPO_PUBLIC_API_BASE_URL.
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://codex-crm-24a42f641a41.herokuapp.com";

const TOKEN_KEY = "janmarini_employee_token";

export async function login(pin) {
  const res = await fetch(`${API_BASE_URL}/api/janmarini/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  await AsyncStorage.setItem(TOKEN_KEY, data.token);
  return data.token;
}

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function logout() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function fetchOrders() {
  const token = await getStoredToken();
  const res = await fetch(`${API_BASE_URL}/api/janmarini/orders`, {
    headers: { "x-auth-token": token || "" },
  });
  if (res.status === 401) {
    await logout();
    throw new Error("Session expired, please log in again");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load orders");
  return data;
}

export async function markOrderFulfilled(orderNumber) {
  const token = await getStoredToken();
  const res = await fetch(`${API_BASE_URL}/api/janmarini/orders/${encodeURIComponent(orderNumber)}/fulfill`, {
    method: "POST",
    headers: { "x-auth-token": token || "" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to mark order fulfilled");
  return data;
}

// ---- Owner dashboard (Hatim only — full detail, costs, fees) --------------

const OWNER_TOKEN_KEY = "janmarini_owner_token";

export async function ownerLogin(pin) {
  const res = await fetch(`${API_BASE_URL}/api/janmarini/owner/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  await AsyncStorage.setItem(OWNER_TOKEN_KEY, data.token);
  return data.token;
}

export async function getOwnerToken() {
  return AsyncStorage.getItem(OWNER_TOKEN_KEY);
}

export async function ownerLogout() {
  await AsyncStorage.removeItem(OWNER_TOKEN_KEY);
}

export async function fetchOwnerOrders() {
  const token = await getOwnerToken();
  const res = await fetch(`${API_BASE_URL}/api/janmarini/owner/orders`, {
    headers: { "x-auth-token": token || "" },
  });
  if (res.status === 401) {
    await ownerLogout();
    throw new Error("Session expired, please log in again");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load orders");
  return data;
}

// AI-parsed receipts/screenshots waiting for a one-tap confirm before
// anything is written to Purchase/InboundShipment.
export async function fetchPendingReceipts() {
  const token = await getOwnerToken();
  const res = await fetch(`${API_BASE_URL}/api/janmarini/owner/pending-receipts`, {
    headers: { "x-auth-token": token || "" },
  });
  if (res.status === 401) {
    await ownerLogout();
    throw new Error("Session expired, please log in again");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load pending receipts");
  return data;
}

export async function confirmPendingReceipt(id) {
  const token = await getOwnerToken();
  const res = await fetch(`${API_BASE_URL}/api/janmarini/owner/pending-receipts/${id}/confirm`, {
    method: "POST",
    headers: { "x-auth-token": token || "" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to confirm");
  return data;
}

export async function rejectPendingReceipt(id) {
  const token = await getOwnerToken();
  const res = await fetch(`${API_BASE_URL}/api/janmarini/owner/pending-receipts/${id}/reject`, {
    method: "POST",
    headers: { "x-auth-token": token || "" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to reject");
  return data;
}

// Raised automatically when a confirmed purchase receipt shows an item
// reached the ship-to warehouse (e.g. Shipito) -- see
// janmariniReceiptParser.js applyOnePurchase on the backend.
export async function fetchNotifications() {
  const token = await getOwnerToken();
  const res = await fetch(`${API_BASE_URL}/api/janmarini/owner/notifications`, {
    headers: { "x-auth-token": token || "" },
  });
  if (res.status === 401) {
    await ownerLogout();
    throw new Error("Session expired, please log in again");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load notifications");
  return data;
}

export async function markNotificationRead(id) {
  const token = await getOwnerToken();
  const res = await fetch(`${API_BASE_URL}/api/janmarini/owner/notifications/${id}/read`, {
    method: "POST",
    headers: { "x-auth-token": token || "" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to mark notification read");
  return data;
}

export async function markAllNotificationsRead() {
  const token = await getOwnerToken();
  const res = await fetch(`${API_BASE_URL}/api/janmarini/owner/notifications/mark-all-read`, {
    method: "POST",
    headers: { "x-auth-token": token || "" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to mark all notifications read");
  return data;
}

export async function syncNow() {
  const token = await getOwnerToken();
  const res = await fetch(`${API_BASE_URL}/api/janmarini/owner/sync-now`, {
    method: "POST",
    headers: { "x-auth-token": token || "" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Sync failed");
  return data;
}

// ---- Upload Purchases -------------------------------------------------------

export async function uploadPurchaseBill(file) {
  const token = await getOwnerToken();
  const form = new FormData();
  form.append("bill", file);
  const res = await fetch(`${API_BASE_URL}/api/janmarini/owner/purchases/upload`, {
    method: "POST",
    headers: { "x-auth-token": token || "" },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to parse bill");
  return data;
}

export async function confirmPurchaseAssignments(payload) {
  const token = await getOwnerToken();
  const res = await fetch(`${API_BASE_URL}/api/janmarini/owner/purchases/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-auth-token": token || "" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to save purchases");
  return data;
}

// ---- Stock (unassigned inventory) ------------------------------------------
// Shared between the employee and owner dashboards — pass isOwner so the
// right token is sent (the backend only checks token validity here, not
// role, but cost is only included in the response for an owner token).

async function stockToken(isOwner) {
  return isOwner ? getOwnerToken() : getStoredToken();
}

export async function fetchStock(isOwner = false) {
  const token = await stockToken(isOwner);
  const res = await fetch(`${API_BASE_URL}/api/janmarini/stock`, {
    headers: { "x-auth-token": token || "" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load stock");
  return data;
}

export async function addStockItem(payload, isOwner = false) {
  const token = await stockToken(isOwner);
  const res = await fetch(`${API_BASE_URL}/api/janmarini/stock`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-auth-token": token || "" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to add stock item");
  return data;
}

export async function updateStockItem(id, payload, isOwner = false) {
  const token = await stockToken(isOwner);
  const res = await fetch(`${API_BASE_URL}/api/janmarini/stock/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-auth-token": token || "" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update stock item");
  return data;
}

export async function deleteStockItem(id, isOwner = false) {
  const token = await stockToken(isOwner);
  const res = await fetch(`${API_BASE_URL}/api/janmarini/stock/${id}`, {
    method: "DELETE",
    headers: { "x-auth-token": token || "" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete stock item");
  return data;
}

// ---- Purchases (generic edit/delete, used by the On the Way page) ---------
// Unlike the /stock endpoints above, these cover both unassigned stock AND
// order-linked purchases, since "On the Way" lists both.

export async function updatePurchase(id, payload, isOwner = false) {
  const token = await stockToken(isOwner);
  const res = await fetch(`${API_BASE_URL}/api/janmarini/purchases/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-auth-token": token || "" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update purchase");
  return data;
}

export async function deletePurchase(id, isOwner = false) {
  const token = await stockToken(isOwner);
  const res = await fetch(`${API_BASE_URL}/api/janmarini/purchases/${id}`, {
    method: "DELETE",
    headers: { "x-auth-token": token || "" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete purchase");
  return data;
}
