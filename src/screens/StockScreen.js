import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { colors, spacing, radius, STATUS_META, formatAmount } from "../theme";
import { fetchStock, addStockItem, updateStockItem, deleteStockItem, logout, ownerLogout } from "../api";
import Sidebar from "../components/Sidebar";

// Unassigned inventory — items already bought (e.g. leftover from a
// cancelled order) or logged by hand, not yet tied to a customer order.
// Same screen for both dashboards; `isOwner` only toggles cost visibility
// and which token/logout path is used, matching every other screen here.
// Rendered as a list (one row per item) rather than a card grid — same
// fields, just easier to scan across many items at once.
function StockRow({ item, isOwner, onChanged }) {
  const meta = STATUS_META[item.status] || STATUS_META.in_office;
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [itemName, setItemName] = useState(item.itemName);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [tracking, setTracking] = useState(item.shopAndShipTracking || "");
  const [note, setNote] = useState(item.stockNote || "");
  const [cost, setCost] = useState(item.costUSD ? String(item.costUSD) : "");

  const save = async () => {
    if (!itemName.trim()) {
      setError("Item name is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await updateStockItem(
        item.id,
        {
          itemName: itemName.trim(),
          quantity: Number(quantity) || 1,
          shopAndShipTracking: tracking.trim(),
          stockNote: note.trim(),
          ...(isOwner ? { costUSD: Number(cost) || 0 } : {}),
        },
        isOwner
      );
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
      await deleteStockItem(item.id, isOwner);
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
        <Text style={styles.formHeading}>Edit stock item</Text>
        <TextInput value={itemName} onChangeText={setItemName} placeholder="Item name" placeholderTextColor={colors.mutedText} style={styles.input} />
        <View style={styles.formRow}>
          <TextInput value={quantity} onChangeText={setQuantity} placeholder="Qty" placeholderTextColor={colors.mutedText} keyboardType="numeric" style={[styles.input, styles.inputSmall]} />
          <TextInput value={tracking} onChangeText={setTracking} placeholder="Shop & Ship tracking #" placeholderTextColor={colors.mutedText} style={[styles.input, styles.inputFlex]} />
          {isOwner && (
            <TextInput value={cost} onChangeText={setCost} placeholder="Cost (USD)" placeholderTextColor={colors.mutedText} keyboardType="numeric" style={[styles.input, styles.inputSmall]} />
          )}
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
        <Text style={styles.cellLabel}>Shop &amp; Ship</Text>
        <Text style={styles.cellValue}>{item.shopAndShipTracking || "—"}</Text>
      </View>
      {isOwner && (
        <View style={[styles.cell, styles.cellCost]}>
          <Text style={styles.cellLabel}>Cost</Text>
          <Text style={styles.cellValueCost}>{item.costUSD ? `$${formatAmount(item.costUSD)}` : "—"}</Text>
        </View>
      )}
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

function AddStockForm({ isOwner, onAdded }) {
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setItemName("");
    setQuantity("1");
    setTracking("");
    setNote("");
    setCost("");
  };

  const submit = async () => {
    if (!itemName.trim()) {
      setError("Item name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addStockItem(
        {
          itemName: itemName.trim(),
          quantity: Number(quantity) || 1,
          shopAndShipTracking: tracking.trim(),
          stockNote: note.trim(),
          ...(isOwner ? { costUSD: Number(cost) || 0 } : {}),
        },
        isOwner
      );
      reset();
      setOpen(false);
      onAdded();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Pressable style={styles.addToggle} onPress={() => setOpen(true)}>
        <Text style={styles.addToggleText}>+ Add stock item</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formHeading}>Add stock item</Text>
      <TextInput
        value={itemName}
        onChangeText={setItemName}
        placeholder="Item name"
        placeholderTextColor={colors.mutedText}
        style={styles.input}
      />
      <View style={styles.formRow}>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Quantity"
          placeholderTextColor={colors.mutedText}
          keyboardType="numeric"
          style={[styles.input, styles.inputSmall]}
        />
        <TextInput
          value={tracking}
          onChangeText={setTracking}
          placeholder="Shop & Ship tracking #"
          placeholderTextColor={colors.mutedText}
          style={[styles.input, styles.inputFlex]}
        />
      </View>
      {isOwner && (
        <TextInput
          value={cost}
          onChangeText={setCost}
          placeholder="Cost (USD)"
          placeholderTextColor={colors.mutedText}
          keyboardType="numeric"
          style={styles.input}
        />
      )}
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Note (optional) — e.g. from cancelled order #1754"
        placeholderTextColor={colors.mutedText}
        style={styles.input}
      />
      {!!error && <Text style={styles.formError}>{error}</Text>}
      <View style={styles.formActions}>
        <Pressable style={styles.cancelBtn} onPress={() => { setOpen(false); setError(""); }}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
        <Pressable disabled={saving} style={styles.saveBtn} onPress={submit}>
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function StockScreen({ view = "stock", onNavigate, onLoggedOut, isOwner = false }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchStock(isOwner));
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

  const filtered = items.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.itemName.toLowerCase().includes(q) ||
      (item.shopAndShipTracking || "").toLowerCase().includes(q) ||
      (item.stockNote || "").toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.page}>
      <Sidebar
        active={view}
        onNavigate={onNavigate}
        showProfits={isOwner}
        onLogout={async () => { await (isOwner ? ownerLogout() : logout()); onLoggedOut(); }}
      />

      <View style={styles.main}>
        <Text style={styles.heading}>Available Stock</Text>
        <Text style={styles.subheading}>Items already bought but not tied to a current order.</Text>

        <View style={styles.topBar}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search item name, tracking #, note..."
            placeholderTextColor={colors.mutedText}
            style={styles.search}
          />
        </View>

        <AddStockForm isOwner={isOwner} onAdded={load} />

        {loading && <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />}
        {!!error && !loading && <Text style={styles.error}>{error}</Text>}

        {!loading && !error && items.length === 0 && (
          <Text style={styles.empty}>No stock items right now.</Text>
        )}

        {!loading && !error && items.length > 0 && filtered.length === 0 && (
          <Text style={styles.empty}>No stock items match your search.</Text>
        )}

        {!loading && !error && filtered.length > 0 && (
          <ScrollView contentContainerStyle={styles.list}>
            <View style={styles.listHeader}>
              <Text style={[styles.headerCell, styles.cellName]}>Item</Text>
              <Text style={[styles.headerCell, styles.cellQty]}>Qty</Text>
              <Text style={[styles.headerCell, styles.cellTracking]}>Shop &amp; Ship</Text>
              {isOwner && <Text style={[styles.headerCell, styles.cellCost]}>Cost</Text>}
              <Text style={[styles.headerCell, styles.cellStatus]}>Status</Text>
              <Text style={[styles.headerCell, styles.cellActions]}></Text>
            </View>
            {filtered.map((item) => (
              <StockRow key={item.id} item={item} isOwner={isOwner} onChanged={load} />
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
  subheading: { fontSize: 13, color: colors.mutedText, marginTop: 2, marginBottom: spacing.lg },
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

  list: { paddingBottom: spacing.xl, minWidth: 720 },
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
  cellCost: { width: 90 },
  cellStatus: { width: 110 },
  cellActions: { width: 140, flexDirection: "row", gap: spacing.xs },

  cellLabel: { fontSize: 10, color: colors.mutedText, marginBottom: 2 },
  cellValue: { fontSize: 13, color: colors.text, fontWeight: "500" },
  cellValueCost: { fontSize: 13, color: colors.secondaryTeal, fontWeight: "700" },

  itemName: { fontSize: 14, fontWeight: "700", color: colors.text },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  pillText: { fontSize: 11, fontWeight: "700" },
  note: { fontSize: 12, color: colors.mutedText, marginTop: 2, fontStyle: "italic" },

  addToggle: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius - 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  addToggleText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    maxWidth: 480,
  },
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
