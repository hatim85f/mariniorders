import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { colors, spacing, radius } from "../theme";
import { fetchPendingReceipts, confirmPendingReceipt, rejectPendingReceipt, ownerLogout } from "../api";
import Sidebar from "../components/Sidebar";

function isShipmentReceipt(receipt) {
  return receipt.aiParsed?.contentType ? receipt.aiParsed.contentType === "shipment" : receipt.source === "shopandship";
}

// One readable line per item/box — this is the only place tracking numbers
// ever appear, and only as the system's own resolved result. The owner is
// never asked to cross-reference a seller tracking number against a Shop &
// Ship tracking number himself — that matching is entirely automatic.
function ItemDetail({ item, shipment }) {
  if (shipment) {
    const matched = item.matchedOrderNumbers?.length;
    return (
      <View style={styles.itemBlock}>
        <Text style={styles.itemTitle}>Box {item.snsShipmentNumber || "?"} — {item.status || "unknown status"}</Text>
        <View style={styles.itemFacts}>
          {!!item.feesAED && <Text style={styles.itemFact}>Fees: AED {item.feesAED} {item.feesPaid ? "(paid)" : "(unpaid)"}</Text>}
          {!!item.weight && <Text style={styles.itemFact}>Weight: {item.weight} lb</Text>}
        </View>
        {!!item.blockedReason && <Text style={styles.itemBlocked}>⚠ {item.blockedReason}</Text>}
        <Text style={styles.itemAction}>
          {matched
            ? `Will link this box to order${matched > 1 ? "s" : ""} ${item.matchedOrderNumbers.join(", ")} and update its tracking status.`
            : "Will record this box's tracking status — not yet linked to a specific order (nothing to lose by confirming; you can link it later)."}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.itemBlock}>
      <Text style={styles.itemTitle}>{item.itemName || "Unnamed item"}</Text>
      <View style={styles.itemFacts}>
        {!!item.matchedOrderNumber && <Text style={styles.itemFact}>Order {item.matchedOrderNumber}</Text>}
        {!!item.costUSD && <Text style={styles.itemFact}>Cost: ${item.costUSD}</Text>}
        {!!item.seller && <Text style={styles.itemFact}>Seller: {item.seller}</Text>}
      </View>
      <Text style={styles.itemAction}>
        {item.matchedOrderNumber
          ? `Will record/update this purchase against order ${item.matchedOrderNumber} — only fills in details that are currently missing, never overwrites something already recorded.`
          : "No matching order found — this item can't be applied automatically and will be skipped even if you confirm."}
      </Text>
    </View>
  );
}

function ConfirmationCard({ receipt, onConfirm, onReject, busy }) {
  const shipment = isShipmentReceipt(receipt);
  const list = receipt.aiParsed?.list || [];
  const hasActionable = list.some((i) => (shipment ? i.snsShipmentNumber : i.matchedOrderNumber));

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardSource}>{shipment ? "Shop & Ship" : "eBay"}</Text>
        <Text style={styles.cardDate}>{new Date(receipt.receivedAt || receipt.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Text>
      </View>
      <Text style={styles.cardSubject}>{receipt.subject || "(no subject)"}</Text>

      {list.length === 0 ? (
        <Text style={styles.noData}>No usable order/shipment data found in this message — safe to reject, nothing will be applied.</Text>
      ) : (
        <View style={styles.itemsWrap}>
          {list.map((item, i) => (
            <ItemDetail key={i} item={item} shipment={shipment} />
          ))}
        </View>
      )}

      <View style={styles.cardActions}>
        <Pressable disabled={busy} style={styles.rejectBtn} onPress={() => onReject(receipt._id)}>
          <Text style={styles.rejectBtnText}>Reject</Text>
        </Pressable>
        {hasActionable && (
          <Pressable disabled={busy} style={styles.confirmBtn} onPress={() => onConfirm(receipt._id)}>
            <Text style={styles.confirmBtnText}>{busy ? "..." : list.length > 1 ? `Confirm all ${list.length}` : "Confirm"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function OwnerConfirmationsScreen({ view = "confirmations", onNavigate, onLoggedOut }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPending(await fetchPendingReceipts());
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

  const handleConfirm = async (id) => {
    setBusyId(id);
    try {
      await confirmPendingReceipt(id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    setBusyId(id);
    try {
      await rejectPendingReceipt(id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

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
        <Text style={styles.heading}>Confirmations</Text>
        <Text style={styles.subheading}>
          Read from your mailbox and matched automatically — review what was found, then one tap applies it.
        </Text>

        {loading && <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />}
        {!!error && !loading && <Text style={styles.error}>{error}</Text>}

        {!loading && !error && pending.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyText}>Nothing waiting for your review right now.</Text>
          </View>
        )}

        {!loading && !error && pending.length > 0 && (
          <ScrollView contentContainerStyle={styles.list}>
            {pending.map((r) => (
              <ConfirmationCard key={r._id} receipt={r} busy={busyId === r._id} onConfirm={handleConfirm} onReject={handleReject} />
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
  error: { color: colors.danger, marginTop: spacing.md },
  emptyState: { marginTop: spacing.xl, alignItems: "flex-start" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  emptyText: { fontSize: 13, color: colors.mutedText, marginTop: 4 },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    maxWidth: 560,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  cardSource: { fontSize: 11, fontWeight: "700", color: colors.mutedText, letterSpacing: 0.5 },
  cardDate: { fontSize: 11, color: colors.mutedText },
  cardSubject: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 4, marginBottom: spacing.md },
  noData: { fontSize: 13, color: colors.mutedText, fontStyle: "italic" },
  itemsWrap: { gap: spacing.md },
  itemBlock: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary + "55",
    paddingLeft: spacing.md,
  },
  itemTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  itemFacts: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: 4 },
  itemFact: { fontSize: 12, color: colors.secondaryTeal, fontWeight: "600" },
  itemBlocked: { fontSize: 12, color: colors.danger, fontWeight: "600", marginTop: 4 },
  itemAction: { fontSize: 12, color: colors.mutedText, marginTop: 6 },
  cardActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius - 4,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  rejectBtnText: { fontSize: 13, fontWeight: "700", color: colors.mutedText },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius - 4,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  confirmBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});
