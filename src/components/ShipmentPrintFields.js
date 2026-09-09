import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme";

// Small inline courier + tracking-number picker, used right before printing
// the address label -- lets the courier be identified on the printed label
// itself so the delivery person can match parcels by tracking number when
// several are out at once. Local state only, filled in fresh each print.
//
// Aramex often confirms a pickup with only a Collection Reference -- the
// real Air Waybill/tracking number is issued later, sometimes after the
// courier has already left. Collection Reference is a separate field (not a
// fallback for tracking number) so the label can show it now and get
// reprinted with the real tracking number once that arrives.
const COURIERS = ["Aramex", "DHL", "Other"];

export default function ShipmentPrintFields({
  courier,
  trackingNumber,
  collectionReference,
  onCourierChange,
  onTrackingChange,
  onCollectionRefChange,
}) {
  return (
    <View style={styles.wrap}>
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
      <View style={styles.inputsRow}>
        <TextInput
          value={trackingNumber}
          onChangeText={onTrackingChange}
          placeholder="Tracking / waybill number"
          placeholderTextColor={colors.mutedText}
          style={styles.trackingInput}
        />
        <TextInput
          value={collectionReference}
          onChangeText={onCollectionRefChange}
          placeholder="Collection reference (if no tracking # yet)"
          placeholderTextColor={colors.mutedText}
          style={styles.trackingInput}
        />
      </View>
    </View>
  );
}

export function useShipmentPrintFields() {
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [collectionReference, setCollectionReference] = useState("");
  return { courier, trackingNumber, collectionReference, setCourier, setTrackingNumber, setCollectionReference };
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  courierGroup: { flexDirection: "row", gap: 4 },
  inputsRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
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
    minWidth: 170,
    borderRadius: radius - 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    fontSize: 12,
    color: colors.text,
  },
});
