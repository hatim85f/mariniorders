import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { colors, spacing, radius, STATUS_META, STATUS_STEPS, formatAmount } from "../theme";
import { fetchOwnerOrders, ownerLogout, fetchPendingReceipts } from "../api";
import Sidebar from "../components/Sidebar";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatMoney(amount, currency) {
  if (!amount) return "—";
  return `${currency || "AED"} ${formatAmount(amount)}`;
}

// Owner cares about the furthest-along AND furthest-behind item, since that's
// what tells him where the bottleneck is.
function summarizeOwnerOrder(items) {
  const indices = items.map((i) => STATUS_STEPS.indexOf(i.status));
  const minIdx = Math.min(...indices);
  const stalest = STATUS_STEPS[minIdx];
  const meta = STATUS_META[stalest] || STATUS_META.ordered;
  const doneCount = items.filter((i) => i.status === "delivered").length;
  return { label: doneCount === items.length ? "Delivered" : meta.label, color: meta.color };
}

function OwnerOrderCard({ order, onPress }) {
  const summary = summarizeOwnerOrder(order.items);
  const profit = order.profit ?? 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.cardLabel}>ORDER NUMBER</Text>
          <Text style={styles.cardOrderNumber}>{order.orderNumber}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: summary.color + "22" }]}>
          <Text style={[styles.pillText, { color: summary.color }]}>{summary.label}</Text>
        </View>
      </View>

      <Text style={styles.customerName}>{order.customerName || "Unknown customer"}</Text>
      <Text style={styles.customerPhone}>{order.customerPhone || "—"}</Text>
      {!!order.customerEmail && <Text style={styles.customerPhone}>{order.customerEmail}</Text>}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{formatDate(order.orderDate)}</Text>
        <Text style={styles.metaText}>Sold: {formatMoney(order.totalPrice, order.currency)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaCostText}>Cost: AED {formatAmount(order.totalCostAED)}</Text>
        <Text style={styles.metaCostText}>Shipping: AED {formatAmount(order.totalShippingFeesAED)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaCostText}>Gateway+Shopify: AED {formatAmount((order.paymentGatewayFeeAED || 0) + (order.shopifyFeeAED || 0))}</Text>
        <Text style={styles.metaCostText}>Delivery: AED {formatAmount(order.deliveryFeeAED)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={[styles.metaProfitText, profit < 0 && styles.metaProfitNegative]}>
          Profit: AED {formatAmount(profit)}
        </Text>
      </View>
    </Pressable>
  );
}

const isDelivered = (order) => order.fulfilled || order.items.every((i) => i.status === "delivered");

export default function OwnerOrderListScreen({ view = "orders", onNavigate, onOpenOrder, onLoggedOut }) {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrders(await fetchOwnerOrders());
    } catch (e) {
      setError(e.message);
      if (/session expired/i.test(e.message)) onLoggedOut();
    } finally {
      setLoading(false);
    }
  }, [onLoggedOut]);

  const loadPending = useCallback(async () => {
    try {
      setPending(await fetchPendingReceipts());
    } catch (e) {
      // non-fatal — the main orders list still loads fine without this
    }
  }, []);

  useEffect(() => {
    load();
    loadPending();
  }, [load, loadPending]);

  const scoped = orders.filter((o) => (view === "history" ? isDelivered(o) : !isDelivered(o)));
  const filtered = scoped.filter((o) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return o.orderNumber.toLowerCase().includes(q) || (o.customerName || "").toLowerCase().includes(q);
  });

  return (
    <View style={styles.page}>
      <Sidebar
        active={view}
        onNavigate={onNavigate}
        showProfits
        confirmationsCount={pending.length}
        onLogout={async () => { await ownerLogout(); onLoggedOut(); }}
      />

      <View style={styles.main}>
        <View style={styles.topBar}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search order # or customer name..."
            placeholderTextColor={colors.mutedText}
            style={styles.search}
          />
        </View>

        {view === "orders" && pending.length > 0 && (
          <Pressable style={styles.pendingBanner} onPress={() => onNavigate?.("confirmations")}>
            <View>
              <Text style={styles.pendingBannerTitle}>{pending.length} item{pending.length === 1 ? "" : "s"} need your confirmation</Text>
              <Text style={styles.pendingBannerSub}>Read from your mailbox and matched automatically.</Text>
            </View>
            <Text style={styles.pendingBannerLink}>Review →</Text>
          </Pressable>
        )}

        <Text style={styles.heading}>{view === "history" ? "Delivered Orders (Owner View)" : "All Orders (Owner View)"}</Text>
        <Text style={styles.subheading}>{view === "history" ? `${scoped.length} order${scoped.length === 1 ? "" : "s"} delivered` : "Full detail — costs, fees, every stage"}</Text>

        {loading && <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />}
        {!!error && !loading && <Text style={styles.error}>{error}</Text>}

        {!loading && !error && (
          <ScrollView contentContainerStyle={styles.grid}>
            {filtered.map((order) => (
              <View key={order.orderNumber} style={styles.gridItem}>
                <OwnerOrderCard order={order} onPress={() => onOpenOrder(order)} />
              </View>
            ))}
            {filtered.length === 0 && <Text style={styles.empty}>No orders match your search.</Text>}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: "row", backgroundColor: colors.background },
  main: { flex: 1, padding: spacing.lg },
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
  heading: { fontSize: 22, fontWeight: "700", color: colors.text },
  subheading: { fontSize: 13, color: colors.mutedText, marginTop: 2, marginBottom: spacing.lg },
  error: { color: colors.danger, marginTop: spacing.md },
  pendingBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.warning + "14",
    borderWidth: 1,
    borderColor: colors.warning + "55",
    borderRadius: radius,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  pendingBannerTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  pendingBannerSub: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
  pendingBannerLink: { fontSize: 13, fontWeight: "700", color: colors.primary },
  empty: { color: colors.mutedText, marginTop: spacing.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingBottom: spacing.xl },
  gridItem: { width: 320, maxWidth: "100%" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardPressed: { opacity: 0.85 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardLabel: { fontSize: 10, color: colors.mutedText, letterSpacing: 0.5 },
  cardOrderNumber: { fontSize: 16, fontWeight: "700", color: colors.text },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "700" },
  customerName: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: spacing.md },
  customerPhone: { fontSize: 12, color: colors.mutedText },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaText: { fontSize: 12, color: colors.mutedText, fontWeight: "500" },
  metaCostText: { fontSize: 12, color: colors.secondaryTeal, fontWeight: "700" },
  metaProfitText: { fontSize: 13, color: colors.success, fontWeight: "700" },
  metaProfitNegative: { color: colors.danger },
});
