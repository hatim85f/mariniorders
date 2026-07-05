import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { colors, spacing, radius } from "../theme";
import { login, ownerLogin } from "../api";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "clear"];

// mode="employee" (default) is the fulfillment-tracking dashboard; mode="owner"
// unlocks Hatim's full-detail dashboard — same PIN pad, different backend call.
export default function PinLoginScreen({ onLoggedIn, mode = "employee" }) {
  const [digits, setDigits] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const press = (key) => {
    setError("");
    if (key === "back") return setDigits((d) => d.slice(0, -1));
    if (key === "clear") return setDigits([]);
    if (digits.length < 4) setDigits((d) => [...d, key]);
  };

  const unlock = async () => {
    setLoading(true);
    setError("");
    try {
      await (mode === "owner" ? ownerLogin(digits.join("")) : login(digits.join("")));
      onLoggedIn();
    } catch (e) {
      setError(e.message);
      setDigits([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.brandRow}>
        <View style={styles.logoDot} />
        <Text style={styles.brand}>Janmarini</Text>
      </View>
      <Text style={styles.brandSub}>{mode === "owner" ? "Owner Dashboard" : "Tracking Dashboard"}</Text>

      <View style={styles.card}>
        <Text style={styles.heading}>Enter your PIN</Text>
        <Text style={styles.subheading}>Please provide your 4-digit security code to continue.</Text>

        <View style={styles.pinRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.pinBox}>
              <Text style={styles.pinDigit}>{digits[i] ? "•" : ""}</Text>
            </View>
          ))}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.keypad}>
          {KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => press(key)}
              style={({ pressed }) => [
                styles.key,
                key === "clear" && styles.keyClear,
                pressed && styles.keyPressed,
              ]}
            >
              <Text style={[styles.keyText, key === "clear" && styles.keyClearText]}>
                {key === "back" ? "⌫" : key === "clear" ? "Clear" : key}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          disabled={digits.length !== 4 || loading}
          onPress={unlock}
          style={({ pressed }) => [
            styles.unlockBtn,
            (digits.length !== 4 || loading) && styles.unlockBtnDisabled,
            pressed && styles.unlockBtnPressed,
          ]}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.unlockText}>🔒 Unlock</Text>}
        </Pressable>
      </View>

      <Text style={styles.footer}>© 2026 Janmarini Logistics Systems. All rights reserved.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  logoDot: { width: 10, height: 10, borderRadius: 3, backgroundColor: colors.primary },
  brand: { fontSize: 18, fontWeight: "700", color: colors.primary, marginLeft: spacing.xs },
  brandSub: { fontSize: 12, color: colors.mutedText, marginBottom: spacing.lg },
  card: {
    width: 340,
    maxWidth: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
  },
  heading: { fontSize: 18, fontWeight: "700", color: colors.text },
  subheading: {
    fontSize: 12,
    color: colors.mutedText,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  pinRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  pinBox: {
    width: 44,
    height: 52,
    borderRadius: radius - 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pinDigit: { fontSize: 22, color: colors.primary },
  error: { color: colors.danger, fontSize: 12, marginBottom: spacing.sm },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 260,
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  key: {
    width: 78,
    height: 52,
    borderRadius: radius - 4,
    backgroundColor: "#EEF0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  keyPressed: { opacity: 0.7 },
  keyClear: { backgroundColor: "transparent" },
  keyText: { fontSize: 16, color: colors.text, fontWeight: "600" },
  keyClearText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  unlockBtn: {
    width: "100%",
    height: 48,
    borderRadius: radius - 4,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockBtnDisabled: { backgroundColor: colors.neutral },
  unlockBtnPressed: { backgroundColor: colors.primaryDark },
  unlockText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  footer: { fontSize: 11, color: colors.mutedText, marginTop: spacing.xl, textAlign: "center" },
});
