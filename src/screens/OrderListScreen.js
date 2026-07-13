import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, Image, ActivityIndicator } from "react-native";
import { colors, spacing, radius, formatAmount } from "../theme";
import { fetchOrders, logout } from "../api";
import { summarizeOrder } from "../statusUtils";
import Sidebar from "../components/Sidebar";

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatMoney(amount, currency) {
  if (!amount) return "—";
  return `${currency || "AED"} ${formatAmount(amount)}`;
}

function OrderCard({ order, onPress }) {
  const summary = summarizeOrder(order.items);
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

      <View style={styles.customerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(order.customerName)}</Text>
        </View>
        <View>
          <Text style={styles.customerName}>{order.customerName || "Unknown customer"}</Text>
          <Text style={styles.customerPhone}>{order.customerPhone || "—"}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{formatDate(order.orderDate)}</Text>
        <Text style={styles.metaText}>{formatMoney(order.totalPrice, order.currency)}</Text>
      </View>

      <View style={styles.thumbRow}>
        {order.items.slice(0, 4).map((item, idx) =>
          item.image ? (
            <Image key={idx} source={{ uri: item.image }} style={styles.thumb} />
          ) : (
            <View key={idx} style={[styles.thumb, styles.thumbPlaceholder]}>
              <Text style={styles.thumbPlaceholderText}>{item.name?.[0] || "?"}</Text>
            </View>
          )
        )}
        {order.items.length > 4 && (
          <View style={[styles.thumb, styles.thumbMore]}>
            <Text style={styles.thumbMoreText}>+{order.items.length - 4}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.manageLink}>Manage →</Text>
      </View>
    </Pressable>
  );
}

const isDelivered = (order) => order.fulfilled || order.items.every((i) => i.status === "delivered");

export default function OrderListScreen({ view = "orders", onNavigate, onOpenOrder, onLoggedOut }) {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrders(await fetchOrders());
    } catch (e) {
      setError(e.message);
      if (/session expired/i.test(e.message)) onLoggedOut();
    } finally {
      setLoading(false);
    }
  }, [onLoggedOut]);

  useEffect(() => {
    load();
  }, [load]);

  const scoped = orders.filter((o) => (view === "history" ? isDelivered(o) : !isDelivered(o)));
  const filtered = scoped.filter((o) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return o.orderNumber.toLowerCase().includes(q) || (o.customerName || "").toLowerCase().includes(q);
  });

  return (
    <View style={styles.page}>
      <Sidebar active={view} onNavigate={onNavigate} onLogout={async () => { await logout(); onLoggedOut(); }} />

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

        <Text style={styles.heading}>{view === "history" ? "Delivered Orders" : "Active Orders"}</Text>
        <Text style={styles.subheading}>
          {view === "history"
            ? `${scoped.length} order${scoped.length === 1 ? "" : "s"} delivered`
            : `Monitoring ${scoped.length} shipment${scoped.length === 1 ? "" : "s"} in real-time`}
        </Text>

        {loading && <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />}
        {!!error && !loading && <Text style={styles.error}>{error}</Text>}

        {!loading && !error && (
          <ScrollView contentContainerStyle={styles.grid}>
            {filtered.map((order) => (
              <View key={order.orderNumber} style={styles.gridItem}>
                <OrderCard order={order} onPress={() => onOpenOrder(order)} />
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
  customerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + "22",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  avatarText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  customerName: { fontSize: 13, fontWeight: "600", color: colors.text },
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
  thumbRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md },
  thumb: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.background },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  thumbPlaceholderText: { fontSize: 12, color: colors.mutedText },
  thumbMore: { alignItems: "center", justifyContent: "center", backgroundColor: colors.border },
  thumbMoreText: { fontSize: 11, color: colors.mutedText },
  cardFooter: { flexDirection: "row", justifyContent: "flex-end", marginTop: spacing.md },
  manageLink: { fontSize: 12, fontWeight: "600", color: colors.primary },
});
