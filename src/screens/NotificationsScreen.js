import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Linking, Image } from "react-native";
import { colors, spacing, radius } from "../theme";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, ownerLogout } from "../api";
import Sidebar from "../components/Sidebar";

// eBay's own email-header logo asset -- same URL eBay serves in its own
// transactional emails, used here purely as a source badge so an eBay-origin
// notification is recognizable at a glance.
const SOURCE_LOGOS = {
  ebay: "https://p.ebaystatic.com/aw/email/eBayLogo.png",
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function NotificationCard({ item, onOpen }) {
  const logo = SOURCE_LOGOS[item.source];
  return (
    <Pressable onPress={() => onOpen(item)} style={[styles.card, !item.read && styles.cardUnread]}>
      {!item.read && <View style={styles.dot} />}
      {!!logo && <Image source={{ uri: logo }} style={styles.sourceLogo} resizeMode="contain" />}
      <View style={styles.cardBody}>
        <Text style={styles.cardMessage}>{item.message}</Text>
        <View style={styles.cardMetaRow}>
          {!!item.orderNumber && <Text style={styles.cardMeta}>{item.orderNumber}</Text>}
          <Text style={styles.cardMeta}>{formatDate(item.createdAt)}</Text>
        </View>
        {!!item.receiptFiles?.length && (
          <View style={styles.filesRow}>
            {item.receiptFiles.map((url, i) => (
              <Pressable key={i} onPress={() => Linking.openURL(url)}>
                <Text style={styles.fileLink}>📄 View receipt{item.receiptFiles.length > 1 ? ` ${i + 1}` : ""}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen({ view = "notifications", onNavigate, onLoggedOut, onSyncNow, syncing = false, syncMessage = "" }) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchNotifications();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
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

  const handleOpen = async (item) => {
    if (item.read) return;
    setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(item._id);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <View style={styles.page}>
      <Sidebar active={view} onNavigate={onNavigate} showProfits unreadNotifications={unreadCount} onSyncNow={onSyncNow} syncing={syncing} syncMessage={syncMessage} onLogout={async () => { await ownerLogout(); onLoggedOut(); }} />

      <View style={styles.main}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.heading}>Notifications</Text>
            <Text style={styles.subheading}>Item-level warehouse/courier milestones — e.g. an item reaching the ship-to warehouse.</Text>
          </View>
          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          )}
        </View>

        {loading && <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />}
        {!!error && !loading && <Text style={styles.error}>{error}</Text>}

        {!loading && !error && items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nothing yet</Text>
            <Text style={styles.emptyText}>Notifications appear here as items reach the warehouse.</Text>
          </View>
        )}

        {!loading && !error && items.length > 0 && (
          <ScrollView contentContainerStyle={styles.list}>
            {items.map((item) => (
              <NotificationCard key={item._id} item={item} onOpen={handleOpen} />
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
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.lg },
  heading: { fontSize: 22, fontWeight: "700", color: colors.text },
  subheading: { fontSize: 13, color: colors.mutedText, marginTop: 2, maxWidth: 480 },
  markAllBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius - 4, paddingVertical: 6, paddingHorizontal: spacing.md },
  markAllText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  error: { color: colors.danger, marginTop: spacing.md },
  emptyState: { marginTop: spacing.xl, alignItems: "flex-start" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  emptyText: { fontSize: 13, color: colors.mutedText, marginTop: 4 },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  card: {
    maxWidth: 560,
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardUnread: { borderColor: colors.primary + "55", backgroundColor: colors.primary + "08" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  sourceLogo: { width: 36, height: 18, marginTop: 3 },
  cardBody: { flex: 1 },
  cardMessage: { fontSize: 14, color: colors.text, fontWeight: "600" },
  cardMetaRow: { flexDirection: "row", gap: spacing.md, marginTop: 4 },
  cardMeta: { fontSize: 11, color: colors.mutedText },
  filesRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  fileLink: { fontSize: 12, color: colors.secondaryTeal, fontWeight: "600" },
});
