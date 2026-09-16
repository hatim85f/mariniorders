import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator } from "react-native";
import { colors, spacing, radius, EMPLOYEE_STATUS_META } from "../theme";
import Sidebar from "../components/Sidebar";
import StatusTracker from "../components/StatusTracker";
import { markOrderFulfilled, saveOrderShipment, refreshOrderTracking, getShipmentRate, requestShipment } from "../api";
import { printOrderLabels } from "../printLabels";
import { pickAndRotateAramexLabel } from "../attachAramexLabel";
import ShipmentPrintFields, { useShipmentPrintFields } from "../components/ShipmentPrintFields";

function formatAddress(addr) {
  if (!addr) return "";
  return [addr.address1, addr.address2, addr.city, addr.country].filter(Boolean).join(", ");
}

export default function OrderDetailScreen({ order, onBack, onLoggedOut, view = "orders", onNavigate }) {
  const [fulfilling, setFulfilling] = useState(false);
  const [error, setError] = useState("");
  const [fulfilled, setFulfilled] = useState(order.fulfilled);
  const shipment = useShipmentPrintFields(order);
  const [savingShipment, setSavingShipment] = useState(false);
  const [shipmentSavedAt, setShipmentSavedAt] = useState(null);
  const [aramexLabelDataUrl, setAramexLabelDataUrl] = useState(null);
  const [attachingLabel, setAttachingLabel] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState(order.outboundTrackingStatus || "");
  const [refreshingTracking, setRefreshingTracking] = useState(false);
  const [requestingShipment, setRequestingShipment] = useState(false);

  const handleAttachLabel = async () => {
    setAttachingLabel(true);
    try {
      const dataUrl = await pickAndRotateAramexLabel();
      if (dataUrl) setAramexLabelDataUrl(dataUrl);
    } finally {
      setAttachingLabel(false);
    }
  };

  const handleSaveShipment = async () => {
    setSavingShipment(true);
    setError("");
    try {
      await saveOrderShipment(order.orderNumber, {
        courier: shipment.courier,
        trackingNumber: shipment.trackingNumber,
        collectionReference: shipment.collectionReference,
      });
      setShipmentSavedAt(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingShipment(false);
    }
  };

  const handlePrint = async () => {
    printOrderLabels(order, { courier: shipment.courier, trackingNumber: shipment.trackingNumber, collectionReference: shipment.collectionReference }, aramexLabelDataUrl);
    // Fire-and-forget — printing shouldn't wait on the network, but the
    // number typed in right before printing is almost always the final one.
    handleSaveShipment();
  };

  const handleRefreshTracking = async () => {
    setRefreshingTracking(true);
    setError("");
    try {
      const data = await refreshOrderTracking(order.orderNumber);
      if (data.noUpdateYet) {
        setTrackingStatus("");
        window.alert("Aramex has no tracking update yet for this waybill.");
      } else {
        setTrackingStatus(data.outboundTrackingStatus || "");
      }
    } catch (e) {
      setError(e.message);
      window.alert(e.message);
    } finally {
      setRefreshingTracking(false);
    }
  };

  const handleRequestShipment = async () => {
    const weightInput = window.prompt("Package weight in kg (e.g. 0.5)", "0.5");
    if (!weightInput) return;
    const weight = Number(weightInput);
    if (!weight || weight <= 0) {
      window.alert("Enter a valid weight in kg.");
      return;
    }
    const piecesInput = window.prompt("Number of pieces/boxes", "1");
    const numberOfPieces = Number(piecesInput) || 1;

    setRequestingShipment(true);
    setError("");
    try {
      const rate = await getShipmentRate(order.orderNumber, { weight, numberOfPieces });
      const proceed = window.confirm(
        `Aramex quote: ${rate.currency} ${Number(rate.amount).toFixed(2)} for ${weight}kg, ${numberOfPieces} piece(s).\n\nBook this shipment now?`
      );
      if (!proceed) return;

      const result = await requestShipment(order.orderNumber, { weight, numberOfPieces });
      shipment.setCourier("Aramex");
      shipment.setTrackingNumber(result.trackingNumber);
      window.alert(`Shipment booked. Aramex tracking number: ${result.trackingNumber}`);
    } catch (e) {
      setError(e.message);
      window.alert(`Aramex error: ${e.message}`);
    } finally {
      setRequestingShipment(false);
    }
  };

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
          <View style={styles.printRow}>
            <ShipmentPrintFields
              courier={shipment.courier}
              trackingNumber={shipment.trackingNumber}
              collectionReference={shipment.collectionReference}
              onCourierChange={shipment.setCourier}
              onTrackingChange={shipment.setTrackingNumber}
              onCollectionRefChange={shipment.setCollectionReference}
            />
            <View style={styles.printActions}>
              <Pressable onPress={handleRequestShipment} disabled={requestingShipment} style={styles.requestShipmentBtn}>
                <Text style={styles.requestShipmentBtnText}>
                  {requestingShipment ? "Requesting…" : "📦 Request Shipment"}
                </Text>
              </Pressable>
              <Pressable onPress={handleAttachLabel} disabled={attachingLabel} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>
                  {attachingLabel ? "Reading PDF…" : aramexLabelDataUrl ? "📎 Label attached ✓" : "📎 Attach Aramex Label"}
                </Text>
              </Pressable>
              <Pressable onPress={handleSaveShipment} disabled={savingShipment} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>{savingShipment ? "Saving…" : "💾 Save Tracking"}</Text>
              </Pressable>
              <Pressable
                onPress={handleRefreshTracking}
                disabled={refreshingTracking || !shipment.trackingNumber}
                style={styles.saveBtn}
              >
                <Text style={styles.saveBtnText}>{refreshingTracking ? "Checking…" : "🔄 Refresh Tracking"}</Text>
              </Pressable>
              <Pressable onPress={handlePrint} style={styles.printBtn}>
                <Text style={styles.printBtnText}>🖨 Print Address Details</Text>
              </Pressable>
            </View>
          </View>
          {!!shipmentSavedAt && (
            <Text style={styles.savedNote}>Saved {shipmentSavedAt.toLocaleTimeString()}</Text>
          )}
          {!!trackingStatus && (
            <Text style={styles.trackingStatusNote}>Aramex status: {trackingStatus}</Text>
          )}
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
  printRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  printActions: { flexDirection: "row", gap: spacing.sm },
  printBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius - 4,
  },
  printBtnText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  saveBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius - 4,
  },
  saveBtnText: { color: colors.mutedText, fontWeight: "700", fontSize: 13 },
  requestShipmentBtn: {
    backgroundColor: colors.secondaryTeal,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius - 4,
  },
  requestShipmentBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  savedNote: { fontSize: 11, color: colors.success, marginBottom: spacing.sm, marginTop: -4 },
  trackingStatusNote: { fontSize: 12, color: colors.primary, fontWeight: "600", marginBottom: spacing.sm, marginTop: -4 },
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
