import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme";

// Only "Orders" is wired to real data — History/Settings are placeholders for now,
// this employee dashboard is read-only and intentionally minimal (v1 of the spec).
const NAV_ITEMS = [
  { key: "orders", label: "Orders" },
  { key: "history", label: "History" },
  { key: "settings", label: "Settings" },
];

export default function Sidebar({ active, onLogout }) {
  return (
    <View style={styles.sidebar}>
      <View>
        <Text style={styles.brand}>Janmarini</Text>
        <Text style={styles.brandSub}>Tracking Dashboard</Text>

        <View style={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <View key={item.key} style={[styles.navItem, active === item.key && styles.navItemActive]}>
              <Text style={[styles.navText, active === item.key && styles.navTextActive]}>{item.label}</Text>
            </View>
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
  brand: { fontSize: 18, fontWeight: "700", color: colors.primary },
  brandSub: { fontSize: 11, color: colors.mutedText, marginBottom: spacing.lg },
  nav: { marginTop: spacing.md },
  navItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius - 4, marginBottom: 2 },
  navItemActive: { backgroundColor: colors.primary + "18" },
  navText: { fontSize: 14, color: colors.mutedText, fontWeight: "500" },
  navTextActive: { color: colors.primary, fontWeight: "700" },
  profile: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  profileText: { fontSize: 13, fontWeight: "600", color: colors.text },
  logoutText: { fontSize: 12, color: colors.danger, marginTop: 2 },
});
