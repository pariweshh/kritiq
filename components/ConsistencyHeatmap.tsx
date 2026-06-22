/**
 * ConsistencyHeatmap
 * GitHub-style activity grid: 7 rows (days) × N week-columns, oldest → today
 * (today is bottom-right). Cell shade scales with that day's analysis count.
 * Plain Views — no dependency. Caller passes `counts` (oldest → today).
 */

import { borderRadius, colors, spacing, typography } from "@/constants/theme"
import { StyleSheet, Text, View } from "react-native"

const ROWS = 7

interface ConsistencyHeatmapProps {
  /** Per-day counts, oldest → today; length is rendered as ceil(len/7) columns. */
  counts: number[]
}

function cellColor(count: number): string {
  if (count <= 0) return colors.bg.elevated
  if (count === 1) return "rgba(0, 255, 136, 0.35)"
  if (count === 2) return "rgba(0, 255, 136, 0.65)"
  return colors.accent.primary
}

export default function ConsistencyHeatmap({ counts }: ConsistencyHeatmapProps) {
  const weeks = Math.ceil(counts.length / ROWS)
  return (
    <View style={styles.card}>
      <View style={styles.grid}>
        {Array.from({ length: weeks }, (_, c) => (
          <View key={c} style={styles.col}>
            {Array.from({ length: ROWS }, (_, r) => (
              <View
                key={r}
                style={[
                  styles.cell,
                  { backgroundColor: cellColor(counts[c * ROWS + r] ?? 0) },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {[0, 1, 2, 3].map((n) => (
          <View
            key={n}
            style={[styles.legendCell, { backgroundColor: cellColor(n) }]}
          />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    gap: 4,
  },
  col: {
    flex: 1,
    gap: 4,
  },
  cell: {
    aspectRatio: 1,
    borderRadius: 2,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: spacing.md,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontFamily: typography.fonts.label,
    fontSize: 9,
    color: colors.text.tertiary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
})
