/**
 * Progress Screen
 * The "deep dive" dashboard: headline stats, a recent score-trend chart,
 * per-exercise personal bests, and a consistency heatmap — all folded from
 * stored history + durable progress records. History remains the raw list.
 */

import ConsistencyHeatmap from "@/components/ConsistencyHeatmap"
import ExerciseIcon from "@/components/ExerciseIcon"
import ScoreTrend from "@/components/ScoreTrend"
import { getExerciseById } from "@/constants/exercises"
import {
  borderRadius,
  colors,
  getMetricColor,
  spacing,
  typography,
} from "@/constants/theme"
import type { AnalysisResult } from "@/constants/types"
import { dailyCounts } from "@/lib/progress/dailyCounts"
import type { ProgressRecords } from "@/lib/progress/types"
import { getHistory, getRecords } from "@/services/storage"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

const TREND_COUNT = 14
const HEATMAP_WEEKS = 10

interface StatProps {
  icon: keyof typeof Ionicons.glyphMap
  value: string
  label: string
  color?: string
}

function Stat({ icon, value, label, color }: StatProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={14} color={colors.accent.primary} />
        <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function ProgressScreen() {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [records, setRecords] = useState<ProgressRecords | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      Promise.all([getHistory(), getRecords()]).then(([history, recs]) => {
        setAnalyses(history)
        setRecords(recs)
        setLoading(false)
      })
    }, []),
  )

  const Header = (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Progress</Text>
    </View>
  )

  if (loading) {
    return <View style={styles.container}>{Header}</View>
  }

  if (analyses.length === 0) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.emptyState}>
          <Ionicons
            name="stats-chart-outline"
            size={48}
            color={colors.text.muted}
          />
          <Text style={styles.emptyTitle}>No progress yet</Text>
          <Text style={styles.emptySubtitle}>
            Analyze a few lifts to see your{"\n"}scores, streaks and bests here.
          </Text>
        </View>
      </View>
    )
  }

  const sessions = analyses.length
  // History is most-recent-first; take the latest N and flip to chronological.
  const trendScores = analyses
    .slice(0, TREND_COUNT)
    .reverse()
    .map((a) => a.overallScore)
  const bestScore = Math.round(
    Math.max(...analyses.map((a) => a.overallScore)),
  )
  const counts = dailyCounts(
    analyses.map((a) => a.timestamp),
    HEATMAP_WEEKS * 7,
  )
  const pbs = records
    ? Object.values(records.personalBests).sort(
        (a, b) => b.bestOverall - a.bestOverall,
      )
    : []

  return (
    <View style={styles.container}>
      {Header}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Headline stats */}
        <View style={styles.statsGrid}>
          <Stat
            icon="flame"
            value={`${records?.streak.current ?? 0}`}
            label="CURRENT STREAK"
          />
          <Stat
            icon="trending-up"
            value={`${records?.streak.longest ?? 0}`}
            label="BEST STREAK"
          />
          <Stat icon="barbell" value={`${sessions}`} label="SESSIONS" />
          <Stat
            icon="ribbon"
            value={`${bestScore}`}
            label="BEST SCORE"
            color={getMetricColor(bestScore)}
          />
        </View>

        {/* Score trend */}
        {trendScores.length >= 2 && (
          <>
            <Text style={styles.sectionLabel}>SCORE TREND</Text>
            <ScoreTrend scores={trendScores} />
          </>
        )}

        {/* Personal bests */}
        {pbs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>PERSONAL BESTS</Text>
            <View style={styles.card}>
              {pbs.map((pb, i) => {
                const exercise = getExerciseById(pb.exerciseId)
                return (
                  <View
                    key={pb.exerciseId}
                    style={[
                      styles.pbRow,
                      i < pbs.length - 1 && styles.pbRowBorder,
                    ]}
                  >
                    <View style={styles.pbIcon}>
                      {exercise && (
                        <ExerciseIcon
                          name={exercise.icon}
                          size={20}
                          color={colors.accent.primary}
                        />
                      )}
                    </View>
                    <Text style={styles.pbName}>
                      {exercise?.shortName ?? pb.exerciseId}
                    </Text>
                    <Text
                      style={[
                        styles.pbScore,
                        { color: getMetricColor(pb.bestOverall) },
                      ]}
                    >
                      {Math.round(pb.bestOverall)}
                    </Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* Consistency */}
        <Text style={styles.sectionLabel}>CONSISTENCY</Text>
        <ConsistencyHeatmap counts={counts} />
        <Text style={styles.heatCaption}>Last {HEATMAP_WEEKS} weeks</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: spacing["3xl"],
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    color: colors.text.primary,
    letterSpacing: 2,
  },
  content: {
    paddingHorizontal: spacing["3xl"],
    paddingBottom: spacing["5xl"],
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  statCard: {
    width: "47.5%",
    flexGrow: 1,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    color: colors.text.primary,
  },
  statLabel: {
    fontFamily: typography.fonts.label,
    fontSize: 9,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    marginTop: 4,
  },

  // Section
  sectionLabel: {
    fontFamily: typography.fonts.label,
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    letterSpacing: 3,
    marginTop: spacing["2xl"],
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
  },

  // Personal-best rows
  pbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pbRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  pbIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  pbName: {
    flex: 1,
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  pbScore: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
  },

  heatCaption: {
    fontFamily: typography.fonts.label,
    fontSize: 10,
    color: colors.text.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: spacing.sm,
    textAlign: "center",
  },

  // Empty
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
  },
  emptyTitle: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.xl,
    color: colors.text.secondary,
    marginTop: spacing.lg,
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
})
