import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors, STATUS_META, STATUS_STEPS, EMPLOYEE_STATUS_META, EMPLOYEE_STATUS_STEPS } from "../theme";

const STEP_WIDTH = 84;
const LINE_WIDTH = 40;

// Horizontal step tracker for one item. Pass `steps`/`meta` to reuse this for
// the owner's full 7-stage view — defaults to the employee's simplified
// 4-stage view (Awaiting shipment → In transit to Dubai → Ready to pack →
// Delivered), which is all she needs to see.
// Wrapped in its own horizontal scroll so narrow containers never clip the
// last step instead of silently cutting it off.
export default function StatusTracker({ status, steps = EMPLOYEE_STATUS_STEPS, meta = EMPLOYEE_STATUS_META }) {
  const currentIndex = steps.indexOf(status);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.row}>
        {steps.map((step, idx) => {
          const done = idx < currentIndex;
          const active = idx === currentIndex;
          const stepMeta = meta[step];
          const dotColor = done ? colors.success : active ? stepMeta.color : colors.border;
          return (
            <React.Fragment key={step}>
              <View style={styles.stepCol}>
                <View style={[styles.dot, { backgroundColor: dotColor }, active && styles.dotActive]}>
                  <Text style={styles.dotText}>{done ? "✓" : ""}</Text>
                </View>
                <Text style={[styles.stepLabel, active && { color: stepMeta.color, fontWeight: "700" }]}>
                  {stepMeta.label}
                </Text>
              </View>
              {idx < steps.length - 1 && (
                <View style={[styles.line, { backgroundColor: idx < currentIndex ? colors.success : colors.border }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginTop: 12 },
  row: { flexDirection: "row", alignItems: "flex-start" },
  stepCol: { alignItems: "center", width: STEP_WIDTH },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dotActive: { borderWidth: 2, borderColor: colors.surface, shadowOpacity: 0 },
  dotText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepLabel: { fontSize: 10, color: colors.mutedText, textAlign: "center", marginTop: 4 },
  line: { height: 2, width: LINE_WIDTH, marginTop: 11 },
});
