import React from "react";
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from "react-native";
import { colors, spacing, radius, STATUS_STEPS, STATUS_META, formatAmount } from "../theme";
import Sidebar from "../components/Sidebar";
import StatusTracker from "../components/StatusTracker";

export default function OwnerOrderDetailScreen({ order, onBack, onLoggedOut, view = "orders", onNavigate }) {
  const totalCostAED = order.totalCostAED || 0;
  const totalFeesAED = order.totalShippingFeesAED || 0;
  const paymentGatewayFeeAED = order.paymentGatewayFeeAED || 0;
  const shopifyFeeAED = order.shopifyFeeAED || 0;
  const deliveryFeeAED = order.deliveryFeeAED || 0;
  const profit = order.profit ?? 0;

  return (
    <View style={styles.page}>
      <Sidebar active={view} onNavigate={onNavigate} showProfits onLogout={onLoggedOut} />

      <ScrollView style={styles.main} contentContainerStyle={{ padding: spacing.lg }}>
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>← Back to Orders</Text>
        </Pressable>

        <View style={styles.headerCard}>
          <Text style={styles.orderTitle}>Order {order.orderNumber}</Text>
          <View style={styles.headerCols}>
            <View>
              <Text style={styles.headerLabel}>CUSTOMER</Text>
              <Text style={styles.headerValue}>{order.customerName || "Unknown customer"}</Text>
            </View>
            <View>
              <Text style={styles.headerLabel}>PHONE</Text>
              <Text style={styles.headerValue}>{order.customerPhone || "—"}</Text>
            </View>
            <View>
              <Text style={styles.headerLabel}>SOLD FOR</Text>
              <Text style={styles.headerValue}>{order.currency} {formatAmount(order.totalPrice)}</Text>
            </View>
            <View>
              <Text style={styles.headerLabel}>TOTAL COST</Text>
              <Text style={styles.headerValueCost}>AED {formatAmount(totalCostAED)}</Text>
            </View>
            <View>
              <Text style={styles.headerLabel}>SHIPPING FEES</Text>
              <Text style={styles.headerValueCost}>AED {formatAmount(totalFeesAED)}</Text>
            </View>
            <View>
              <Text style={styles.headerLabel}>GATEWAY FEE (3%)</Text>
              <Text style={styles.headerValueCost}>AED {formatAmount(paymentGatewayFeeAED)}</Text>
            </View>
            <View>
              <Text style={styles.headerLabel}>SHOPIFY FEE (2.9%)</Text>
              <Text style={styles.headerValueCost}>AED {formatAmount(shopifyFeeAED)}</Text>
            </View>
            <View>
              <Text style={styles.headerLabel}>DELIVERY</Text>
              <Text style={styles.headerValueCost}>AED {formatAmount(deliveryFeeAED)}</Text>
            </View>
            <View>
              <Text style={styles.headerLabel}>PROFIT</Text>
              <Text style={[styles.headerValueCost, profit < 0 && styles.headerValueNegative]}>AED {formatAmount(profit)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.itemsHeading}>Order Items ({order.items.length})</Text>

        {order.items.map((item, idx) => (
          <View key={idx} style={styles.itemCard}>
            <View style={styles.itemTopRow}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Text style={styles.itemImagePlaceholderText}>{item.name?.[0] || "?"}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>Quantity: {item.quantity}</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>Seller: {item.seller || "—"}</Text>
                  <Text style={styles.detailText}>eBay #: {item.ebayOrderNumber || "—"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.costText}>Cost: AED {formatAmount(item.costAED)}</Text>
                  <Text style={styles.costText}>Shipping: AED {formatAmount(item.shippingFeesAED)} {item.feesPaid ? "✓ paid" : ""}</Text>
                </View>
                {!!item.aramexTracking && <Text style={styles.trackingText}>Aramex: {item.aramexTracking}</Text>}
                {!!item.blockedReason ? (
                  <Text style={styles.actionText}>🚩 {item.etaNote}</Text>
                ) : (
                  !!item.etaNote && <Text style={styles.etaText}>{item.etaNote}</Text>
                )}
                {!!item.flagNote && <Text style={styles.flagText}>⚠ {item.flagNote}</Text>}
              </View>
            </View>
            <StatusTracker status={item.status} steps={STATUS_STEPS} meta={STATUS_META} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: "row", backgroundColor: colors.background },
  main: { flex: 1 },
  backLink: { color: colors.primary, fontWeight: "600", marginBottom: spacing.md },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  orderTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  headerCols: { flexDirection: "row", gap: spacing.xl, flexWrap: "wrap" },
  headerLabel: { fontSize: 10, color: colors.mutedText, letterSpacing: 0.5, marginBottom: 2 },
  headerValue: { fontSize: 14, fontWeight: "600", color: colors.text },
  headerValueCost: { fontSize: 14, fontWeight: "700", color: colors.secondaryTeal },
  headerValueNegative: { color: colors.danger },
  itemsHeading: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemTopRow: { flexDirection: "row", alignItems: "flex-start" },
  itemImage: { width: 80, height: 80, borderRadius: 12, marginRight: spacing.md, backgroundColor: colors.background },
  itemImagePlaceholder: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  itemImagePlaceholderText: { color: colors.mutedText, fontWeight: "700", fontSize: 20 },
  itemName: { fontSize: 15, fontWeight: "700", color: colors.text },
  itemQty: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
  detailRow: { flexDirection: "row", gap: spacing.lg, marginTop: 4 },
  detailText: { fontSize: 12, color: colors.mutedText },
  costText: { fontSize: 12, color: colors.secondaryTeal, fontWeight: "600" },
  trackingText: { fontSize: 12, color: colors.primary, marginTop: 4, fontWeight: "600" },
  etaText: { fontSize: 12, color: colors.secondaryTeal, marginTop: 4, fontWeight: "600" },
  actionText: { fontSize: 12, color: colors.danger, marginTop: 4, fontWeight: "700" },
  flagText: { fontSize: 12, color: colors.danger, marginTop: 4, fontWeight: "600" },
});
