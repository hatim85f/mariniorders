import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, ActivityIndicator, Platform } from "react-native";
import { colors, spacing, radius } from "../theme";
import { uploadPurchaseBill, confirmPurchaseAssignments, ownerLogout } from "../api";
import Sidebar from "../components/Sidebar";

// Replaces the old email-guessing purchase pipeline: upload the eBay bill
// PDF, the backend deterministically extracts each line item (fixed PDF
// layout -- see services/ebayBillParser.js on the backend for why this is
// safe where freeform email parsing wasn't), then the owner manually picks
// which Shopify order/item each line fulfills before anything is saved.

function AssignmentPicker({ openOrders, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredOrders = !q
    ? openOrders
    : openOrders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.items.some((i) => i.name.toLowerCase().includes(q))
      );

  const label = value
    ? value.orderNumber
      ? `${value.orderNumber} — ${value.orderItemName}`
      : "Stock (unassigned)"
    : "Choose order/item...";

  return (
    <View>
      <Pressable style={styles.pickerButton} onPress={() => setOpen((v) => !v)}>
        <Text style={[styles.pickerButtonText, !value && styles.pickerPlaceholder]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.pickerChevron}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open && (
        <View style={styles.pickerPanel}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search order # or customer..."
            placeholderTextColor={colors.mutedText}
            style={styles.pickerSearch}
          />
          <ScrollView style={styles.pickerList} nestedScrollEnabled>
            <Pressable
              style={styles.pickerRow}
              onPress={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <Text style={styles.pickerRowStock}>Stock (unassigned) — no order needs this yet</Text>
            </Pressable>
            {filteredOrders.map((o) => (
              <View key={o.orderNumber}>
                <Text style={styles.pickerOrderHeading}>
                  {o.orderNumber} — {o.customerName}
                </Text>
                {o.items.map((item) => (
                  <Pressable
                    key={`${o.orderNumber}-${item.name}`}
                    style={styles.pickerRow}
                    onPress={() => {
                      onChange({ orderNumber: o.orderNumber, orderItemName: item.name });
                      setOpen(false);
                    }}
                  >
                    <Text style={styles.pickerRowText}>
                      {item.quantity}x {item.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
            {!filteredOrders.length && <Text style={styles.pickerEmpty}>No matching open orders.</Text>}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// A bill line's quantity doesn't always match what the picked order needs
// (e.g. bought 2 of an item, the order only needs 1) -- assignQty lets the
// owner split it: assignQty units go to the order, the rest is submitted as
// its own free-stock line, instead of forcing the whole quantity onto one
// order (the exact bug that left an order looking like it needed 2 of
// something it only needed 1 of).
function BillItemCard({ item, index, assignment, assignQty, onAssignmentChange, onAssignQtyChange, onFieldChange, openOrders }) {
  const remainder = assignment?.orderNumber ? Math.max(0, item.quantity - assignQty) : 0;
  return (
    <View style={styles.itemCard}>
      <Text style={styles.itemName}>{item.itemName}</Text>
      <Text style={styles.itemMeta}>
        Seller: {item.seller || "—"} · eBay order: {item.ebayOrderNumber || "—"}
      </Text>

      <View style={styles.fieldRow}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Qty bought</Text>
          <TextInput
            value={String(item.quantity)}
            onChangeText={(v) => onFieldChange(index, "quantity", v)}
            keyboardType="numeric"
            style={styles.fieldInputSmall}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Cost per unit (USD)</Text>
          <TextInput
            value={String(item.costUSD)}
            onChangeText={(v) => onFieldChange(index, "costUSD", v)}
            keyboardType="numeric"
            style={styles.fieldInputSmall}
          />
        </View>
      </View>

      <Text style={styles.fieldLabel}>Assign to</Text>
      <AssignmentPicker openOrders={openOrders} value={assignment} onChange={(a) => onAssignmentChange(index, a)} />

      {!!assignment?.orderNumber && item.quantity > 1 && (
        <View style={styles.splitRow}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Units for this order</Text>
            <TextInput
              value={String(assignQty)}
              onChangeText={(v) => onAssignQtyChange(index, v)}
              keyboardType="numeric"
              style={styles.fieldInputSmall}
            />
          </View>
          {remainder > 0 && (
            <Text style={styles.splitNote}>+{remainder} left over will be saved as free stock</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function UploadPurchasesScreen({ view = "purchases", onNavigate, onLoggedOut, unreadNotifications = 0, onSyncNow, syncing = false, syncMessage = "" }) {
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(null);
  const [items, setItems] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [assignments, setAssignments] = useState([]); // parallel array to items: null | {orderNumber, orderItemName}
  const [assignQtys, setAssignQtys] = useState([]); // parallel array to items: units of this line going to the order (rest -> stock)

  const pickFile = () => {
    if (Platform.OS !== "web") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (file) await handleUpload(file);
    };
    input.click();
  };

  const handleUpload = async (file) => {
    setParsing(true);
    setError("");
    setSuccessMsg("");
    try {
      const data = await uploadPurchaseBill(file);
      setReceiptUrl(data.receiptUrl);
      setPurchaseDate(data.purchaseDate);
      setItems(data.items);
      setOpenOrders(data.openOrders || []);
      setAssignments(data.items.map(() => null));
      setAssignQtys(data.items.map((i) => i.quantity));
    } catch (e) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  };

  const updateField = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const numValue = field === "quantity" ? Number(value) || 1 : Number(value) || 0;
      next[index] = { ...next[index], [field]: numValue };
      return next;
    });
    if (field === "quantity") {
      const qty = Number(value) || 1;
      setAssignQtys((prev) => {
        const next = [...prev];
        next[index] = Math.min(next[index] ?? qty, qty);
        return next;
      });
    }
  };

  const updateAssignment = (index, value) => {
    setAssignments((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    // Default to the whole quantity going to the newly-picked order — the
    // owner only needs to touch "Units for this order" when a split is
    // actually needed.
    setAssignQtys((prev) => {
      const next = [...prev];
      next[index] = items[index]?.quantity ?? 1;
      return next;
    });
  };

  const updateAssignQty = (index, value) => {
    setAssignQtys((prev) => {
      const next = [...prev];
      const qty = items[index]?.quantity ?? 1;
      next[index] = Math.max(1, Math.min(Number(value) || 1, qty));
      return next;
    });
  };

  const reset = () => {
    setReceiptUrl("");
    setPurchaseDate(null);
    setItems([]);
    setOpenOrders([]);
    setAssignments([]);
    setAssignQtys([]);
    setError("");
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const assignmentRows = [];
      items.forEach((item, i) => {
        const base = {
          itemName: item.itemName,
          costUSD: item.costUSD,
          seller: item.seller,
          ebayOrderNumber: item.ebayOrderNumber,
          ebayItemId: item.ebayItemId,
        };
        const orderNumber = assignments[i]?.orderNumber || "";
        const orderItemName = assignments[i]?.orderItemName || "";
        const forOrder = orderNumber ? Math.min(assignQtys[i] ?? item.quantity, item.quantity) : 0;
        const remainder = item.quantity - forOrder;

        // Bought quantity can exceed what the picked order needs -- split
        // into two rows so the extra becomes its own free-stock line instead
        // of silently inflating what the order is recorded as needing.
        if (orderNumber && forOrder > 0) {
          assignmentRows.push({ ...base, quantity: forOrder, orderNumber, orderItemName });
        }
        if (remainder > 0) {
          assignmentRows.push({ ...base, quantity: remainder, orderNumber: "", orderItemName: "" });
        }
        if (!orderNumber) {
          assignmentRows.push({ ...base, quantity: item.quantity, orderNumber: "", orderItemName: "" });
        }
      });

      const payload = { receiptUrl, purchaseDate, assignments: assignmentRows };
      await confirmPurchaseAssignments(payload);
      setSuccessMsg(`Saved ${assignmentRows.length} purchase${assignmentRows.length === 1 ? "" : "s"} to the CRM.`);
      reset();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.page}>
      <Sidebar
        active={view}
        onNavigate={onNavigate}
        showProfits
        unreadNotifications={unreadNotifications}
        onSyncNow={onSyncNow}
        syncing={syncing}
        syncMessage={syncMessage}
        onLogout={async () => { await ownerLogout(); onLoggedOut(); }}
      />

      <ScrollView style={styles.main} contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.heading}>Upload Purchases</Text>
        <Text style={styles.subheading}>Upload an eBay "Order details" bill — items are extracted automatically, you assign each one to an order.</Text>

        {!items.length && (
          <Pressable style={styles.uploadButton} onPress={pickFile} disabled={parsing}>
            <Text style={styles.uploadButtonText}>{parsing ? "Reading bill..." : "📄 Choose eBay bill PDF"}</Text>
          </Pressable>
        )}

        {parsing && <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!successMsg && <Text style={styles.success}>{successMsg}</Text>}

        {!!items.length && (
          <>
            <Text style={styles.foundText}>Found {items.length} item{items.length === 1 ? "" : "s"} in this bill:</Text>
            {items.map((item, i) => (
              <BillItemCard
                key={i}
                index={i}
                item={item}
                assignment={assignments[i]}
                assignQty={assignQtys[i] ?? item.quantity}
                onAssignmentChange={updateAssignment}
                onAssignQtyChange={updateAssignQty}
                onFieldChange={updateField}
                openOrders={openOrders}
              />
            ))}

            <View style={styles.bottomActions}>
              <Pressable style={styles.cancelBtn} onPress={reset} disabled={saving}>
                <Text style={styles.cancelBtnText}>Discard</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={submit} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : `Save ${items.length} purchase${items.length === 1 ? "" : "s"}`}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: "row", backgroundColor: colors.background },
  main: { flex: 1 },
  heading: { fontSize: 22, fontWeight: "700", color: colors.text },
  subheading: { fontSize: 13, color: colors.mutedText, marginTop: 2, marginBottom: spacing.lg, maxWidth: 560 },

  uploadButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radius - 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  uploadButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  error: { color: colors.danger, marginTop: spacing.md },
  success: { color: colors.secondaryTeal, marginTop: spacing.md, fontWeight: "600" },
  foundText: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: spacing.md },

  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius - 4,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    maxWidth: 560,
  },
  itemName: { fontSize: 14, fontWeight: "700", color: colors.text },
  itemMeta: { fontSize: 12, color: colors.mutedText, marginTop: 2, marginBottom: spacing.sm },

  fieldRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm },
  splitRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  splitNote: { fontSize: 12, color: colors.secondaryTeal, fontWeight: "600", flex: 1 },
  fieldGroup: {},
  fieldLabel: { fontSize: 11, color: colors.mutedText, fontWeight: "600", marginBottom: 4 },
  fieldInputSmall: {
    width: 100,
    height: 36,
    borderRadius: radius - 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    color: colors.text,
  },

  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 40,
    borderRadius: radius - 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  pickerButtonText: { fontSize: 13, color: colors.text, flex: 1 },
  pickerPlaceholder: { color: colors.mutedText },
  pickerChevron: { fontSize: 10, color: colors.mutedText },
  pickerPanel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius - 6,
    backgroundColor: colors.surface,
    marginTop: 4,
    padding: spacing.sm,
  },
  pickerSearch: {
    height: 36,
    borderRadius: radius - 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pickerList: { maxHeight: 240 },
  pickerRow: { paddingVertical: 8, paddingHorizontal: spacing.sm, borderRadius: radius - 8 },
  pickerRowText: { fontSize: 13, color: colors.text },
  pickerRowStock: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  pickerOrderHeading: { fontSize: 11, fontWeight: "700", color: colors.mutedText, textTransform: "uppercase", marginTop: spacing.xs, paddingHorizontal: spacing.sm },
  pickerEmpty: { fontSize: 12, color: colors.mutedText, padding: spacing.sm },

  bottomActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md, maxWidth: 560 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius - 4, paddingVertical: spacing.md, alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: colors.mutedText },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius - 4, paddingVertical: spacing.md, alignItems: "center" },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
