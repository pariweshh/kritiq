/**
 * ScoreCard Component
 * The heart of Kritiq — the shareable score card.
 * Dark Cyber aesthetic (Option A).
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
          "#00CCFF",
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
        <Text style={styles.bigScore}>{scoreValue}</Text>
        <Text style={styles.scoreLabel}>/ 100</Text>
      </View>

      {/* Divider */}
      <LinearGradient
        colors={["transparent", "#1A1A1A", "#222222", "#1A1A1A", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.divider}
      />

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
              borderColor: tierColor + "25",
              backgroundColor: tierColor + "10",
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
    backgroundColor: "#0D0D0D",
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    ...shadows.card,
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
    fontFamily: "Orbitron",
    fontSize: 13,
    color: colors.accent.primary,
    letterSpacing: 3,
  },
  brandAccent: {
    color: colors.text.muted,
  },
  dateLabel: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    color: "#444",
    letterSpacing: 1,
  },

  // Exercise name
  exerciseName: {
    fontFamily: "Orbitron",
    fontSize: 11,
    letterSpacing: 4,
    color: "#555",
    textTransform: "uppercase",
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.xl,
  },

  // Score
  scoreSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing["2xl"],
    gap: spacing.lg,
  },
  bigScore: {
    fontFamily: "Orbitron",
    fontSize: 96,
    lineHeight: 96,
    color: colors.text.primary,
  },
  scoreLabel: {
    fontFamily: "Rajdhani",
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent.primary,
    letterSpacing: 4,
    textTransform: "uppercase",
    paddingBottom: 14,
  },

  // Divider
  divider: {
    height: 1,
    marginHorizontal: spacing.cardPadding,
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
    fontFamily: "Rajdhani",
    fontSize: 13,
    fontWeight: "500",
    color: "#555",
    letterSpacing: 2,
    width: 120,
  },
  metricBarWrap: {
    flex: 1,
    height: 4,
    backgroundColor: "#151515",
    borderRadius: 2,
    marginHorizontal: spacing.lg,
    overflow: "hidden",
  },
  metricBar: {
    height: "100%",
    borderRadius: 2,
  },
  metricValue: {
    fontFamily: "Orbitron",
    fontSize: 14,
    fontWeight: "700",
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
    borderTopColor: "#111",
  },
  verdict: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  verdictText: {
    fontFamily: "Rajdhani",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 3,
  },
  watermark: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    color: "#2A2A2A",
    letterSpacing: 1,
  },
})
