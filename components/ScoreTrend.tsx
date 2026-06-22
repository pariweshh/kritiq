/**
 * ScoreTrend
 * A compact bar chart of recent overall scores (chronological, oldest → newest),
 * each bar tinted by its score tier. Plain Views — no chart dependency. The
 * caller passes already-trimmed scores; render only when there are ≥2.
 */

import {
  borderRadius,
  colors,
  getMetricColor,
  spacing,
  typography,
} from "@/constants/theme"
import { StyleSheet, Text, View } from "react-native"

const CHART_HEIGHT = 120

interface ScoreTrendProps {
  /** Overall scores 0–100, chronological (oldest → newest). */
  scores: number[]
}

export default function ScoreTrend({ scores }: ScoreTrendProps) {
  const latest = scores[scores.length - 1] ?? 0
  return (
    <View style={styles.card}>
      <View style={[styles.chart, { height: CHART_HEIGHT }]}>
        {scores.map((score, i) => {
          const isLast = i === scores.length - 1
          return (
            <View key={i} style={styles.slot}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, (score / 100) * CHART_HEIGHT),
                    backgroundColor: getMetricColor(score),
                    opacity: isLast ? 1 : 0.5,
                  },
                ]}
              />
            </View>
          )
        })}
      </View>
      <View style={styles.footer}>
        <Text style={styles.caption}>Last {scores.length} sessions</Text>
        <Text style={styles.latest}>
          Latest{" "}
          <Text style={{ color: getMetricColor(latest) }}>
            {Math.round(latest)}
          </Text>
        </Text>
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
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  slot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "78%",
    borderRadius: 2,
    minHeight: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  caption: {
    fontFamily: typography.fonts.label,
    fontSize: 10,
    color: colors.text.tertiary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  latest: {
    fontFamily: typography.fonts.label,
    fontSize: 10,
    color: colors.text.tertiary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
})
