import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { colors, spacing, radius, STATUS_META } from "../theme";
import { fetchStock, updatePurchase, deletePurchase, logout, ownerLogout } from "../api";
import Sidebar from "../components/Sidebar";

// One already-bought item that hasn't reached the office yet — either still
// reserved for a live order, or freed back to unassigned stock (its
// `originOrderNumber` shows where it came from, e.g. a cancelled/refunded
// line). Checking this list before buying a replacement is the whole point:
// it answers "is one already on its way" with its courier tracking + status,
// not just a yes/no.
//
// Edit/delete here cover BOTH stock and order-linked rows (unlike the Stock
// page's row, which is stock-only) — this is exactly where a data-entry
// mistake from Upload Purchases (wrong order picked, a duplicate bill) shows
// up and needs fixing without going through the database by hand.
function OnTheWayRow({ item, onChanged }) {
  const meta = STATUS_META[item.status] || STATUS_META.ordered;
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [itemName, setItemName] = useState(item.itemName);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [orderNumber, setOrderNumber] = useState(item.orderNumber || "");
  const [note, setNote] = useState(item.stockNote || "");

  const save = async () => {
    if (!itemName.trim()) {
      setError("Item name is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await updatePurchase(item.id, {
        itemName: itemName.trim(),
        quantity: Number(quantity) || 1,
        orderNumber: orderNumber.trim(),
        stockNote: note.trim(),
      });
      setEditing(false);
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await deletePurchase(item.id);
      onChanged();
    } catch (e) {
      setError(e.message);
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  if (editing) {
    return (
      <View style={styles.editRow}>
        <Text style={styles.formHeading}>Edit item</Text>
        <TextInput value={itemName} onChangeText={setItemName} placeholder="Item name" placeholderTextColor={colors.mutedText} style={styles.input} />
        <View style={styles.formRow}>
          <TextInput value={quantity} onChangeText={setQuantity} placeholder="Qty" placeholderTextColor={colors.mutedText} keyboardType="numeric" style={[styles.input, styles.inputSmall]} />
          <TextInput
            value={orderNumber}
            onChangeText={setOrderNumber}
            placeholder="Order # (blank = unassigned stock)"
            placeholderTextColor={colors.mutedText}
            style={[styles.input, styles.inputFlex]}
          />
        </View>
        <TextInput value={note} onChangeText={setNote} placeholder="Note (optional)" placeholderTextColor={colors.mutedText} style={styles.input} />
        {!!error && <Text style={styles.formError}>{error}</Text>}
        <View style={styles.formActions}>
          <Pressable style={styles.cancelBtn} onPress={() => { setEditing(false); setError(""); }}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable disabled={busy} style={styles.saveBtn} onPress={save}>
            <Text style={styles.saveBtnText}>{busy ? "Saving..." : "Save"}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={[styles.cell, styles.cellName]}>
        <Text style={styles.itemName} numberOfLines={2}>{item.itemName}</Text>
        {!!item.stockNote && <Text style={styles.note} numberOfLines={2}>{item.stockNote}</Text>}
        {!!error && <Text style={styles.formError}>{error}</Text>}
      </View>
      <View style={[styles.cell, styles.cellQty]}>
        <Text style={styles.cellLabel}>Qty</Text>
        <Text style={styles.cellValue}>{item.quantity}</Text>
      </View>
      <View style={[styles.cell, styles.cellTracking]}>
        <Text style={styles.cellLabel}>Order</Text>
        <Text style={styles.cellValue}>
          {item.orderNumber || (item.originOrderNumber ? `from ${item.originOrderNumber}` : "unassigned")}
        </Text>
      </View>
      <View style={[styles.cell, styles.cellTracking]}>
        <Text style={styles.cellLabel}>Courier</Text>
        <Text style={styles.cellValue}>{item.trackingNumber || "—"}</Text>
      </View>
      <View style={[styles.cell, styles.cellStatus]}>
        <View style={[styles.pill, { backgroundColor: meta.color + "22" }]}>
          <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
      <View style={[styles.cell, styles.cellActions]}>
        <Pressable style={styles.editBtn} onPress={() => { setEditing(true); setConfirmDelete(false); }}>
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
        {!confirmDelete ? (
          <Pressable style={styles.deleteBtn} onPress={() => setConfirmDelete(true)}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </Pressable>
        ) : (
          <Pressable disabled={busy} style={[styles.deleteBtn, styles.deleteConfirmBtn]} onPress={remove}>
            <Text style={styles.deleteConfirmText}>{busy ? "..." : "Confirm?"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// Dedicated page rather than a section inside Stock — this is checked before
// every purchase decision ("is one already coming"), so it earns its own nav
// item instead of competing for space with the on-hand stock list.
export default function OnTheWayScreen({ view = "onTheWay", onNavigate, onLoggedOut, isOwner = false, unreadNotifications = 0, onSyncNow, syncing = false, syncMessage = "" }) {
  const [onTheWay, setOnTheWay] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchStock(isOwner);
      setOnTheWay(data.onTheWay || []);
    } catch (e) {
      setError(e.message);
      if (/session expired/i.test(e.message)) onLoggedOut();
    } finally {
      setLoading(false);
    }
  }, [isOwner, onLoggedOut]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = onTheWay.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.itemName.toLowerCase().includes(q) ||
      (item.orderNumber || "").toLowerCase().includes(q) ||
      (item.originOrderNumber || "").toLowerCase().includes(q) ||
      (item.trackingNumber || "").toLowerCase().includes(q) ||
      (item.stockNote || "").toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.page}>
      <Sidebar
        active={view}
        onNavigate={onNavigate}
        showProfits={isOwner}
        unreadNotifications={isOwner ? unreadNotifications : 0}
        onSyncNow={isOwner ? onSyncNow : undefined}
        syncing={syncing}
        syncMessage={syncMessage}
        onLogout={async () => { await (isOwner ? ownerLogout() : logout()); onLoggedOut(); }}
      />

      <View style={styles.main}>
        <Text style={styles.heading}>On the Way</Text>
        <Text style={styles.subheading}>Already-bought items not yet in the office — check here before buying a replacement.</Text>

        <View style={styles.topBar}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search item name, order #, tracking #, note..."
            placeholderTextColor={colors.mutedText}
            style={styles.search}
          />
        </View>

        {loading && <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />}
        {!!error && !loading && <Text style={styles.error}>{error}</Text>}

        {!loading && !error && onTheWay.length === 0 && (
          <Text style={styles.empty}>Nothing on the way right now.</Text>
        )}

        {!loading && !error && onTheWay.length > 0 && filtered.length === 0 && (
          <Text style={styles.empty}>No items match your search.</Text>
        )}

        {!loading && !error && filtered.length > 0 && (
          <ScrollView contentContainerStyle={styles.list}>
            <View style={styles.listHeader}>
              <Text style={[styles.headerCell, styles.cellName]}>Item</Text>
              <Text style={[styles.headerCell, styles.cellQty]}>Qty</Text>
              <Text style={[styles.headerCell, styles.cellTracking]}>Order</Text>
              <Text style={[styles.headerCell, styles.cellTracking]}>Courier</Text>
              <Text style={[styles.headerCell, styles.cellStatus]}>Status</Text>
              <Text style={[styles.headerCell, styles.cellActions]}></Text>
            </View>
            {filtered.map((item) => (
              <OnTheWayRow key={item.id} item={item} onChanged={load} />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: "row", backgroundColor: colors.background },
  main: { flex: 1, padding: spacing.lg },
  heading: { fontSize: 22, fontWeight: "700", color: colors.text },
  subheading: { fontSize: 13, color: colors.mutedText, marginTop: 2, marginBottom: spacing.lg, maxWidth: 560 },
  topBar: { flexDirection: "row", marginBottom: spacing.lg },
  search: {
    flex: 1,
    maxWidth: 420,
    height: 40,
    borderRadius: radius - 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  error: { color: colors.danger, marginTop: spacing.md },
  empty: { color: colors.mutedText, marginTop: spacing.xl },

  list: { paddingBottom: spacing.xl, minWidth: 820 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  headerCell: { fontSize: 11, fontWeight: "700", color: colors.mutedText, letterSpacing: 0.5, textTransform: "uppercase" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius - 4,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  editRow: {
    backgroundColor: colors.surface,
    borderRadius: radius - 4,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  cell: { paddingRight: spacing.sm },
  cellName: { flex: 3, minWidth: 200 },
  cellQty: { width: 50 },
  cellTracking: { width: 150 },
  cellStatus: { width: 130 },
  cellActions: { width: 140, flexDirection: "row", gap: spacing.xs },

  cellLabel: { fontSize: 10, color: colors.mutedText, marginBottom: 2 },
  cellValue: { fontSize: 13, color: colors.text, fontWeight: "500" },

  itemName: { fontSize: 14, fontWeight: "700", color: colors.text },
  note: { fontSize: 12, color: colors.mutedText, marginTop: 2, fontStyle: "italic" },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  pillText: { fontSize: 11, fontWeight: "700" },

  formHeading: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  formRow: { flexDirection: "row", gap: spacing.sm },
  input: {
    height: 40,
    borderRadius: radius - 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputSmall: { width: 90 },
  inputFlex: { flex: 1 },
  formError: { color: colors.danger, fontSize: 12, marginBottom: spacing.sm },
  formActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius - 4,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "700", color: colors.mutedText },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius - 4,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  editBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius - 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  editBtnText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  deleteBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius - 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  deleteBtnText: { fontSize: 12, fontWeight: "700", color: colors.danger },
  deleteConfirmBtn: { backgroundColor: colors.danger },
  deleteConfirmText: { fontSize: 12, fontWeight: "700", color: "#fff" },
});
