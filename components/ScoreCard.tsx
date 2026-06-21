/**
 * ScoreCard Component
 * The heart of Kritiq — the shareable score card.
 * "Refined Performance Dark" aesthetic.
 *
 * Used in the result screen and for sharing.
 * Wrapped in ViewShot for screenshot/sharing.
 */

import {
  borderRadius,
  colors,
  getMetricColor,
  getScoreTier,
  shadows,
  spacing,
  typography,
} from "@/constants/theme"
import type { AnalysisResult } from "@/constants/types"
import { format } from "date-fns"
import { LinearGradient } from "expo-linear-gradient"
import React from "react"
import { StyleSheet, Text, View } from "react-native"

interface ScoreCardProps {
  result: AnalysisResult
}

function MetricBar({
  name,
  score,
}: {
  readonly name: string
  readonly score: number
}) {
  const barWidth = `${Math.min(100, score)}%`
  const barColor = getMetricColor(score)

  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{name.toUpperCase()}</Text>
      <View style={styles.metricBarWrap}>
        <LinearGradient
          colors={[barColor, barColor + "80"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.metricBar, { width: barWidth as any }]}
        />
      </View>
      <Text style={[styles.metricValue, { color: barColor }]}>
        {Math.round(score)}
      </Text>
    </View>
  )
}

export default function ScoreCard({ result }: Readonly<ScoreCardProps>) {
  const { label: tierLabel, color: tierColor } = getScoreTier(
    result.overallScore,
  )
  const dateStr = format(
    new Date(result.timestamp),
    "MMM dd, yyyy",
  ).toUpperCase()

  const scoreValue = Math.round(result.overallScore)

  return (
    <View style={styles.card}>
      {/* Top glow line */}
      <LinearGradient
        colors={[
          "transparent",
          colors.accent.primary,
          colors.accent.secondary,
          "transparent",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.glowLine}
      />

      {/* Header */}
      <View style={styles.cardTop}>
        <Text style={styles.brand}>
          KRIT<Text style={styles.brandAccent}>IQ</Text>
        </Text>
        <Text style={styles.dateLabel}>{dateStr}</Text>
      </View>

      {/* Exercise Name */}
      <Text style={styles.exerciseName}>{result.exerciseName}</Text>

      {/* Big Score */}
      <View style={styles.scoreSection}>
        <Text style={[styles.bigScore, { color: tierColor }]}>
          {scoreValue}
        </Text>
        <Text style={styles.scoreLabel}>/ 100</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Metrics */}
      <View style={styles.metrics}>
        {result.metrics.map((metric) => (
          <MetricBar
            key={metric.metricId}
            name={metric.name}
            score={metric.score}
          />
        ))}
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View
          style={[
            styles.verdict,
            {
              borderColor: tierColor + "33",
              backgroundColor: tierColor + "14",
            },
          ]}
        >
          <Text style={[styles.verdictText, { color: tierColor }]}>
            {tierLabel}
          </Text>
        </View>
        <Text style={styles.watermark}>kritiq.app</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.elevated,
  },

  // Glow line
  glowLine: {
    height: 2,
    width: "100%",
  },

  // Header
  cardTop: {
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.cardPadding,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: {
    fontFamily: typography.fonts.display,
    fontSize: 15,
    color: colors.accent.primary,
    letterSpacing: 3,
  },
  brandAccent: {
    color: colors.text.muted,
  },
  dateLabel: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    color: colors.text.muted,
    letterSpacing: 1,
  },

  // Exercise name
  exerciseName: {
    fontFamily: typography.fonts.label,
    fontSize: 12,
    letterSpacing: 4,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.xl,
  },

  // Score
  scoreSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing["2xl"],
    gap: spacing.md,
  },
  bigScore: {
    fontFamily: typography.fonts.display,
    fontSize: 104,
    lineHeight: 104,
    color: colors.text.primary,
  },
  scoreLabel: {
    fontFamily: typography.fonts.heading,
    fontSize: 15,
    color: colors.text.tertiary,
    letterSpacing: 3,
    textTransform: "uppercase",
    paddingBottom: 16,
  },

  // Divider
  divider: {
    height: 1,
    marginHorizontal: spacing.cardPadding,
    backgroundColor: colors.border.default,
  },

  // Metrics
  metrics: {
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing["2xl"],
    gap: 14,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricLabel: {
    fontFamily: typography.fonts.label,
    fontSize: 12,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    width: 120,
  },
  metricBarWrap: {
    flex: 1,
    height: 5,
    backgroundColor: colors.bg.tertiary,
    borderRadius: 3,
    marginHorizontal: spacing.lg,
    overflow: "hidden",
  },
  metricBar: {
    height: "100%",
    borderRadius: 3,
  },
  metricValue: {
    fontFamily: typography.fonts.display,
    fontSize: 17,
    width: 34,
    textAlign: "right",
  },

  // Footer
  cardFooter: {
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  verdict: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  verdictText: {
    fontFamily: typography.fonts.heading,
    fontSize: 12,
    letterSpacing: 3,
  },
  watermark: {
    fontFamily: typography.fonts.mono,
    fontSize: 9,
    color: colors.text.muted,
    letterSpacing: 1,
  },
})
