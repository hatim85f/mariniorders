import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator } from "react-native";
import { colors, spacing, radius, EMPLOYEE_STATUS_META } from "../theme";
import Sidebar from "../components/Sidebar";
import StatusTracker from "../components/StatusTracker";
import { markOrderFulfilled } from "../api";
import { printOrderLabels } from "../printLabels";

function formatAddress(addr) {
  if (!addr) return "";
  return [addr.address1, addr.address2, addr.city, addr.country].filter(Boolean).join(", ");
}

export default function OrderDetailScreen({ order, onBack, onLoggedOut, view = "orders", onNavigate }) {
  const [fulfilling, setFulfilling] = useState(false);
  const [error, setError] = useState("");
  const [fulfilled, setFulfilled] = useState(order.fulfilled);

  const handleMarkFulfilled = async () => {
    setFulfilling(true);
    setError("");
    try {
      await markOrderFulfilled(order.orderNumber);
      setFulfilled(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setFulfilling(false);
    }
  };

  return (
    <View style={styles.page}>
      <Sidebar active={view} onNavigate={onNavigate} onLogout={onLoggedOut} />

      <ScrollView style={styles.main} contentContainerStyle={{ padding: spacing.lg }}>
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>← Back to Orders</Text>
        </Pressable>

        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <Text style={styles.orderTitle}>Order {order.orderNumber}</Text>
            <View style={styles.headerActions}>
              <Pressable onPress={() => printOrderLabels(order)} style={styles.printBtn}>
                <Text style={styles.printBtnText}>🖨 Print Address Details</Text>
              </Pressable>
              {fulfilled ? (
                <View style={styles.fulfilledPill}>
                  <Text style={styles.fulfilledPillText}>✓ Fulfilled</Text>
                </View>
              ) : (
                <Pressable
                  onPress={handleMarkFulfilled}
                  disabled={fulfilling}
                  style={({ pressed }) => [styles.fulfillBtn, pressed && styles.fulfillBtnPressed]}
                >
                  {fulfilling ? <ActivityIndicator color="#fff" /> : <Text style={styles.fulfillBtnText}>Mark Fulfilled</Text>}
                </Pressable>
              )}
            </View>
          </View>
          {!!error && <Text style={styles.error}>{error}</Text>}
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
              <Text style={styles.headerLabel}>EMAIL</Text>
              <Text style={styles.headerValue}>{order.customerEmail || "—"}</Text>
            </View>
            <View>
              <Text style={styles.headerLabel}>ADDRESS</Text>
              <Text style={styles.headerValue}>{formatAddress(order.shippingAddress) || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.itemsHeadingRow}>
          <View style={styles.itemsHeadingAccent} />
          <Text style={styles.itemsHeading}>Order Items ({order.items.length})</Text>
        </View>

        {order.items.map((item, idx) => {
          const meta = EMPLOYEE_STATUS_META[fulfilled ? "delivered" : item.status] || EMPLOYEE_STATUS_META.ordered;
          return (
            <View key={idx} style={[styles.itemCard, { borderLeftColor: meta.color }]}>
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
                  {!!item.aramexTracking && (
                    <Text style={styles.trackingText}>{item.trackingCarrier === "dhl" ? "DHL" : "Aramex"} tracking: {item.aramexTracking}</Text>
                  )}
                  {!fulfilled && !!item.etaNote && <Text style={styles.etaText}>{item.etaNote}</Text>}
                </View>
              </View>
              <StatusTracker status={fulfilled ? "delivered" : item.status} />
            </View>
          );
        })}
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
    borderTopWidth: 4,
    borderTopColor: colors.primary,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  orderTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  headerCols: { flexDirection: "row", gap: spacing.xl, flexWrap: "wrap" },
  headerLabel: { fontSize: 10, color: colors.primary, fontWeight: "700", letterSpacing: 0.5, marginBottom: 2 },
  headerValue: { fontSize: 14, fontWeight: "600", color: colors.text },
  itemsHeadingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  itemsHeadingAccent: { width: 4, height: 16, borderRadius: 2, backgroundColor: colors.secondaryTeal },
  itemsHeading: { fontSize: 15, fontWeight: "700", color: colors.text },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  itemTopRow: { flexDirection: "row", alignItems: "center" },
  itemImage: { width: 96, height: 96, borderRadius: 12, marginRight: spacing.md, backgroundColor: colors.background },
  itemImagePlaceholder: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  itemImagePlaceholderText: { color: colors.mutedText, fontWeight: "700", fontSize: 24 },
  itemName: { fontSize: 15, fontWeight: "700", color: colors.text },
  itemQty: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
  trackingText: { fontSize: 12, color: colors.primary, marginTop: 4, fontWeight: "600" },
  etaText: { fontSize: 12, color: colors.secondaryTeal, marginTop: 4, fontWeight: "600" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  printBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius - 4,
  },
  printBtnText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  fulfillBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius - 4,
  },
  fulfillBtnPressed: { backgroundColor: colors.primaryDark },
  fulfillBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  fulfilledPill: { backgroundColor: colors.success + "22", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  fulfilledPillText: { color: colors.success, fontWeight: "700", fontSize: 13 },
  error: { color: colors.danger, fontSize: 12, marginBottom: spacing.sm },
});
