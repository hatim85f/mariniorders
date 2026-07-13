import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { colors, spacing, radius, STATUS_META, formatAmount } from "../theme";
import { fetchStock, addStockItem, logout, ownerLogout } from "../api";
import Sidebar from "../components/Sidebar";

// Unassigned inventory — items already bought (e.g. leftover from a
// cancelled order) or logged by hand, not yet tied to a customer order.
// Same screen for both dashboards; `isOwner` only toggles cost visibility
// and which token/logout path is used, matching every other screen here.
function StockCard({ item, isOwner }) {
  const meta = STATUS_META[item.status] || STATUS_META.in_office;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.itemName}>{item.itemName}</Text>
        <View style={[styles.pill, { backgroundColor: meta.color + "22" }]}>
          <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
      <Text style={styles.qty}>Quantity: {item.quantity}</Text>
      {!!item.shopAndShipTracking && (
        <Text style={styles.tracking}>Shop &amp; Ship: {item.shopAndShipTracking}</Text>
      )}
      {isOwner && !!item.costUSD && <Text style={styles.cost}>Cost: ${formatAmount(item.costUSD)}</Text>}
      {!!item.stockNote && <Text style={styles.note}>{item.stockNote}</Text>}
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

        <AddStockForm isOwner={isOwner} onAdded={load} />

        {loading && <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />}
        {!!error && !loading && <Text style={styles.error}>{error}</Text>}

        {!loading && !error && items.length === 0 && (
          <Text style={styles.empty}>No stock items right now.</Text>
        )}

        {!loading && !error && items.length > 0 && (
          <ScrollView contentContainerStyle={styles.grid}>
            {items.map((item) => (
              <View key={item.id} style={styles.gridItem}>
                <StockCard item={item} isOwner={isOwner} />
              </View>
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
  error: { color: colors.danger, marginTop: spacing.md },
  empty: { color: colors.mutedText, marginTop: spacing.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingBottom: spacing.xl },
  gridItem: { width: 300, maxWidth: "100%" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  itemName: { fontSize: 14, fontWeight: "700", color: colors.text, flex: 1, marginRight: spacing.sm },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "700" },
  qty: { fontSize: 12, color: colors.mutedText, marginTop: spacing.sm },
  tracking: { fontSize: 12, color: colors.primary, fontWeight: "600", marginTop: 4 },
  cost: { fontSize: 12, color: colors.secondaryTeal, fontWeight: "700", marginTop: 4 },
  note: { fontSize: 12, color: colors.mutedText, marginTop: 4, fontStyle: "italic" },
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
});
