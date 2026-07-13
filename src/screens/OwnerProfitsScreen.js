import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform } from "react-native";
import { colors, spacing, radius, formatAmount } from "../theme";
import { fetchOwnerOrders, ownerLogout } from "../api";
import Sidebar from "../components/Sidebar";

const RANGE_OPTIONS = [
  { key: "7", label: "Last 7 Days" },
  { key: "30", label: "Last 30 Days" },
  { key: "all", label: "All Time" },
];

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function orderAllInCost(order) {
  return (
    (order.totalCostAED || 0) +
    (order.totalShippingFeesAED || 0) +
    (order.paymentGatewayFeeAED || 0) +
    (order.shopifyFeeAED || 0) +
    (order.deliveryFeeAED || 0)
  );
}

export default function OwnerProfitsScreen({ view = "profits", onNavigate, onLoggedOut }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("30");
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (range === "all") return orders;
    const days = Number(range);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return orders.filter((o) => o.orderDate && new Date(o.orderDate) >= cutoff);
  }, [orders, range]);

  const totals = useMemo(() => {
    const revenue = filtered.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const itemCost = filtered.reduce((s, o) => s + (o.totalCostAED || 0), 0);
    const shipping = filtered.reduce((s, o) => s + (o.totalShippingFeesAED || 0), 0);
    const gatewayShopify = filtered.reduce((s, o) => s + (o.paymentGatewayFeeAED || 0) + (o.shopifyFeeAED || 0), 0);
    const delivery = filtered.reduce((s, o) => s + (o.deliveryFeeAED || 0), 0);
    const totalCost = itemCost + shipping + gatewayShopify + delivery;
    const netProfit = filtered.reduce((s, o) => s + (o.profit || 0), 0);
    const avgMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    return { revenue, itemCost, shipping, gatewayShopify, delivery, totalCost, netProfit, avgMargin };
  }, [filtered]);

  const costBreakdown = useMemo(() => {
    const parts = [
      { label: "Item Cost", value: totals.itemCost, color: colors.primary },
      { label: "Shipping", value: totals.shipping, color: colors.info },
      { label: "Gateway + Shopify Fees", value: totals.gatewayShopify, color: colors.warning },
      { label: "Delivery", value: totals.delivery, color: colors.secondaryTeal },
    ];
    const total = totals.totalCost || 1;
    return parts.map((p) => ({ ...p, pct: (p.value / total) * 100 }));
  }, [totals]);

  const dailyTrend = useMemo(() => {
    const byDay = new Map();
    for (const o of filtered) {
      if (!o.orderDate) continue;
      const day = new Date(o.orderDate).toISOString().slice(0, 10);
      const entry = byDay.get(day) || { day, revenue: 0, profit: 0 };
      entry.revenue += o.totalPrice || 0;
      entry.profit += o.profit || 0;
      byDay.set(day, entry);
    }
    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  }, [filtered]);

  const maxTrendValue = Math.max(1, ...dailyTrend.map((d) => Math.max(d.revenue, d.profit)));

  const handleExport = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") window.print();
  };

  const rangeLabel = RANGE_OPTIONS.find((r) => r.key === range)?.label || "All Time";

  return (
    <View style={styles.page}>
      <Sidebar active={view} onNavigate={onNavigate} showProfits onLogout={async () => { await ownerLogout(); onLoggedOut(); }} />

      <ScrollView style={styles.main} contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.heading}>Profit & Margins</Text>
            <Text style={styles.subheading}>Live operational margin tracking across all logistics channels</Text>
          </View>
          <View style={styles.topRowActions}>
            <View>
              <Pressable style={styles.rangeBtn} onPress={() => setRangeMenuOpen((v) => !v)}>
                <Text style={styles.rangeBtnText}>{rangeLabel} ▾</Text>
              </Pressable>
              {rangeMenuOpen && (
                <View style={styles.rangeMenu}>
                  {RANGE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.key}
                      style={styles.rangeMenuItem}
                      onPress={() => {
                        setRange(opt.key);
                        setRangeMenuOpen(false);
                      }}
                    >
                      <Text style={[styles.rangeMenuItemText, opt.key === range && styles.rangeMenuItemTextActive]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            <Pressable style={styles.exportBtn} onPress={handleExport}>
              <Text style={styles.exportBtnText}>⬇ Export PDF</Text>
            </Pressable>
          </View>
        </View>

        {loading && <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />}
        {!!error && !loading && <Text style={styles.error}>{error}</Text>}

        {!loading && !error && (
          <>
            <View style={styles.cardsRow}>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>TOTAL REVENUE</Text>
                <Text style={styles.cardValue}>AED {formatAmount(totals.revenue)}</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>TOTAL COST</Text>
                <Text style={styles.cardValue}>AED {formatAmount(totals.totalCost)}</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>NET PROFIT</Text>
                <Text style={[styles.cardValue, styles.cardValueProfit, totals.netProfit < 0 && styles.cardValueNegative]}>
                  AED {formatAmount(totals.netProfit)}
                </Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>AVG. MARGIN %</Text>
                <Text style={styles.cardValue}>{totals.avgMargin.toFixed(1)}%</Text>
              </View>
            </View>

            <View style={styles.tableCard}>
              <Text style={styles.sectionHeading}>Recent Orders Analysis</Text>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { flex: 1.2 }]}>Order Number</Text>
                <Text style={[styles.th, { flex: 0.6 }]}>Items</Text>
                <Text style={[styles.th, { flex: 1 }]}>Customer Paid</Text>
                <Text style={[styles.th, { flex: 1 }]}>Total Cost</Text>
                <Text style={[styles.th, { flex: 1 }]}>Net Profit</Text>
                <Text style={[styles.th, { flex: 0.7 }]}>Margin %</Text>
              </View>
              {filtered
                .slice()
                .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
                .map((o) => {
                  const cost = orderAllInCost(o);
                  const margin = o.totalPrice > 0 ? ((o.profit || 0) / o.totalPrice) * 100 : 0;
                  return (
                    <View key={o.orderNumber} style={styles.tableRow}>
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.tdStrong}>{o.orderNumber}</Text>
                        <Text style={styles.tdMuted}>{formatDate(o.orderDate)}</Text>
                      </View>
                      <Text style={[styles.td, { flex: 0.6 }]}>{o.items.length}</Text>
                      <Text style={[styles.td, { flex: 1 }]}>{formatAmount(o.totalPrice)}</Text>
                      <Text style={[styles.td, { flex: 1 }]}>{formatAmount(cost)}</Text>
                      <Text style={[styles.td, styles.tdProfit, { flex: 1 }, (o.profit || 0) < 0 && styles.tdNegative]}>
                        {(o.profit || 0) >= 0 ? "+" : ""}
                        {formatAmount(o.profit)}
                      </Text>
                      <Text style={[styles.tdPill, margin < 0 && styles.tdPillNegative, { flex: 0.7 }]}>{margin.toFixed(1)}%</Text>
                    </View>
                  );
                })}
              {filtered.length === 0 && <Text style={styles.empty}>No orders in this range.</Text>}
              <Text style={styles.tableFooter}>Showing {filtered.length} of {filtered.length} orders</Text>
            </View>

            <View style={styles.bottomRow}>
              <View style={styles.trendsCard}>
                <Text style={styles.sectionHeading}>Margin Trends</Text>
                <View style={styles.trendLegendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.legendText}>Gross Revenue</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.secondaryTeal }]} />
                    <Text style={styles.legendText}>Net Profit</Text>
                  </View>
                </View>
                {dailyTrend.length === 0 ? (
                  <Text style={styles.empty}>No orders in this range.</Text>
                ) : (
                  <View style={styles.chartRow}>
                    {dailyTrend.map((d) => (
                      <View key={d.day} style={styles.chartBarGroup}>
                        <View style={styles.chartBars}>
                          <View style={[styles.chartBar, { height: (d.revenue / maxTrendValue) * 140, backgroundColor: colors.primary }]} />
                          <View style={[styles.chartBar, { height: (Math.max(d.profit, 0) / maxTrendValue) * 140, backgroundColor: colors.secondaryTeal }]} />
                        </View>
                        <Text style={styles.chartLabel}>{formatDate(d.day)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.costCard}>
                <Text style={styles.sectionHeading}>Cost Breakdown</Text>
                {costBreakdown.map((c) => (
                  <View key={c.label} style={styles.costRow}>
                    <View style={styles.costRowTop}>
                      <Text style={styles.costLabel}>{c.label}</Text>
                      <Text style={styles.costPct}>{c.pct.toFixed(0)}%</Text>
                    </View>
                    <View style={styles.costBarTrack}>
                      <View style={[styles.costBarFill, { width: `${Math.min(c.pct, 100)}%`, backgroundColor: c.color }]} />
                    </View>
                  </View>
                ))}
              </View>
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
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.lg, zIndex: 20 },
  topRowActions: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  heading: { fontSize: 22, fontWeight: "700", color: colors.text },
  subheading: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
  rangeBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius - 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rangeBtnText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  rangeMenu: {
    position: "absolute",
    top: 40,
    right: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius - 4,
    minWidth: 160,
    zIndex: 50,
    elevation: 4,
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)",
  },
  rangeMenuItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  rangeMenuItemText: { fontSize: 13, color: colors.text },
  rangeMenuItemTextActive: { color: colors.primary, fontWeight: "700" },
  exportBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius - 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exportBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  error: { color: colors.danger, marginTop: spacing.md },
  empty: { color: colors.mutedText, paddingVertical: spacing.lg, textAlign: "center" },

  cardsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, flexWrap: "wrap" },
  card: {
    flex: 1,
    minWidth: 160,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardLabel: { fontSize: 10, color: colors.mutedText, letterSpacing: 0.5, marginBottom: spacing.sm },
  cardValue: { fontSize: 22, fontWeight: "700", color: colors.text },
  cardValueProfit: { color: colors.secondaryTeal },
  cardValueNegative: { color: colors.danger },

  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeading: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  tableHeaderRow: { flexDirection: "row", paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  th: { fontSize: 11, color: colors.mutedText, fontWeight: "700" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  td: { fontSize: 13, color: colors.text },
  tdStrong: { fontSize: 13, fontWeight: "700", color: colors.primary },
  tdMuted: { fontSize: 11, color: colors.mutedText },
  tdProfit: { fontWeight: "700", color: colors.secondaryTeal },
  tdNegative: { color: colors.danger },
  tdPill: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondaryTeal,
    backgroundColor: colors.secondaryTeal + "18",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
    textAlign: "center",
    overflow: "hidden",
  },
  tdPillNegative: { color: colors.danger, backgroundColor: colors.danger + "18" },
  tableFooter: { fontSize: 12, color: colors.mutedText, marginTop: spacing.sm },

  bottomRow: { flexDirection: "row", gap: spacing.lg, flexWrap: "wrap" },
  trendsCard: {
    flex: 2,
    minWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  trendLegendRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.mutedText },
  chartRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 170 },
  chartBarGroup: { alignItems: "center", flex: 1 },
  chartBars: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 140 },
  chartBar: { width: 10, borderRadius: 3, minHeight: 2 },
  chartLabel: { fontSize: 10, color: colors.mutedText, marginTop: spacing.xs },

  costCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  costRow: { marginBottom: spacing.md },
  costRowTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  costLabel: { fontSize: 12, color: colors.text, fontWeight: "600" },
  costPct: { fontSize: 12, color: colors.mutedText, fontWeight: "700" },
  costBarTrack: { height: 6, borderRadius: 3, backgroundColor: colors.background, overflow: "hidden" },
  costBarFill: { height: 6, borderRadius: 3 },
});
