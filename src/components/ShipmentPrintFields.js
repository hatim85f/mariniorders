import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme";

// Small inline courier + tracking-number picker, used right before printing
// the address label -- lets the courier be identified on the printed label
// itself so the delivery person can match parcels by tracking number when
// several are out at once. Local state only, filled in fresh each print.
const COURIERS = ["Aramex", "DHL", "Other"];

export default function ShipmentPrintFields({ courier, trackingNumber, onCourierChange, onTrackingChange }) {
  return (
    <View style={styles.row}>
      <View style={styles.courierGroup}>
        {COURIERS.map((c) => (
          <Pressable
            key={c}
            onPress={() => onCourierChange(courier === c ? "" : c)}
            style={[styles.chip, courier === c && styles.chipActive]}
          >
            <Text style={[styles.chipText, courier === c && styles.chipTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={trackingNumber}
        onChangeText={onTrackingChange}
        placeholder="Tracking / waybill number"
        placeholderTextColor={colors.mutedText}
        style={styles.trackingInput}
      />
    </View>
  );
}

export function useShipmentPrintFields() {
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  return { courier, trackingNumber, setCourier, setTrackingNumber };
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  courierGroup: { flexDirection: "row", gap: 4 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 11, fontWeight: "600", color: colors.mutedText },
  chipTextActive: { color: "#fff" },
  trackingInput: {
    height: 30,
    minWidth: 160,
    borderRadius: radius - 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    fontSize: 12,
    color: colors.text,
  },
});
