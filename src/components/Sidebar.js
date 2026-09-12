import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme";

// "Settings" stays a placeholder for now — no screen behind it yet.
// "Profits" and "Confirmations" are owner-only — the employee dashboard never
// sees cost/margin data or purchase-matching decisions.
const NAV_ITEMS = [
  { key: "orders", label: "Orders", enabled: true },
  { key: "history", label: "History", enabled: true },
  { key: "stock", label: "Stock", enabled: true },
  { key: "onTheWay", label: "On the Way", enabled: true },
  { key: "purchases", label: "Upload Purchases", enabled: true, ownerOnly: true },
  { key: "confirmations", label: "Confirmations", enabled: true, ownerOnly: true, badgeKey: true },
  { key: "profits", label: "Profits", enabled: true, ownerOnly: true },
  { key: "settings", label: "Settings", enabled: false },
];

export default function Sidebar({ active, onNavigate, onLogout, showProfits = false, confirmationsCount = 0, unreadNotifications = 0, onSyncNow, syncing = false, syncMessage = "" }) {
  const items = NAV_ITEMS.filter((item) => !item.ownerOnly || showProfits);
  return (
    <View style={styles.sidebar}>
      <View>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brand}>Janmarini</Text>
            <Text style={styles.brandSub}>Tracking Dashboard</Text>
          </View>
          {showProfits && (
            <View style={styles.headerActionsRow}>
              <Pressable onPress={onSyncNow} disabled={syncing} style={styles.syncButton}>
                <Text style={styles.syncIcon}>{syncing ? "⏳" : "🔄"}</Text>
              </Pressable>
              <Pressable onPress={() => onNavigate?.("notifications")} style={styles.bellButton}>
                <Text style={styles.bellIcon}>🔔</Text>
                {unreadNotifications > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.navBadgeText}>{unreadNotifications > 9 ? "9+" : unreadNotifications}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          )}
        </View>
        {!!syncMessage && <Text style={styles.syncMessage}>{syncMessage}</Text>}

        <View style={styles.nav}>
          {items.map((item) => (
            <Pressable
              key={item.key}
              disabled={!item.enabled}
              onPress={() => onNavigate?.(item.key)}
              style={[styles.navItem, active === item.key && styles.navItemActive]}
            >
              <View style={styles.navItemRow}>
                <Text
                  style={[
                    styles.navText,
                    active === item.key && styles.navTextActive,
                    !item.enabled && styles.navTextDisabled,
                  ]}
                >
                  {item.label}
                </Text>
                {item.badgeKey && confirmationsCount > 0 && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>{confirmationsCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable onPress={onLogout} style={styles.profile}>
        <Text style={styles.profileText}>Fulfillment Team</Text>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 200,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  brandRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  brand: { fontSize: 18, fontWeight: "700", color: colors.primary },
  brandSub: { fontSize: 11, color: colors.mutedText, marginBottom: spacing.lg },
  syncMessage: { fontSize: 10, color: colors.primary, marginTop: -spacing.md, marginBottom: spacing.sm },
  headerActionsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  syncButton: { padding: 4 },
  syncIcon: { fontSize: 16 },
  bellButton: { padding: 4 },
  bellIcon: { fontSize: 18 },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.danger,
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  nav: { marginTop: spacing.md },
  navItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius - 4, marginBottom: 2 },
  navItemActive: { backgroundColor: colors.primary + "18" },
  navItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navText: { fontSize: 14, color: colors.mutedText, fontWeight: "500" },
  navTextActive: { color: colors.primary, fontWeight: "700" },
  navTextDisabled: { color: colors.border },
  navBadge: { backgroundColor: colors.danger, borderRadius: 999, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  navBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  profile: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  profileText: { fontSize: 13, fontWeight: "600", color: colors.text },
  logoutText: { fontSize: 12, color: colors.danger, marginTop: 2 },
});
