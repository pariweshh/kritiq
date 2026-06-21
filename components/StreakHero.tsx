/**
 * StreakHero
 * Home dashboard hero: greeting + activity streak (flame + last-7-days dots) +
 * quick stats (sessions / avg / best), folded from stored progress. Falls back
 * to an encouraging first-run state before any analysis exists. Presentational —
 * all values are computed by the caller.
 */

import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from "@/constants/theme"
import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

interface StreakHeroProps {
  greeting: string
  streakCurrent: number
  /** Last 7 local days, oldest → today; true = had an analysis. */
  week: boolean[]
  sessions: number
  avgScore: number | null
  bestScore: number | null
}

export default function StreakHero({
  greeting,
  streakCurrent,
  week,
  sessions,
  avgScore,
  bestScore,
}: StreakHeroProps) {
  if (sessions === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.emptyTitle}>Record your first lift</Text>
        <Text style={styles.emptyText}>
          Get an instant form score and start your streak.
        </Text>
      </View>
    )
  }

  const hasStreak = streakCurrent > 0
  const lastIndex = week.length - 1

  return (
    <View style={styles.card}>
      <Text style={styles.greeting}>{greeting}</Text>

      <View style={styles.topRow}>
        <View style={styles.streakLeft}>
          <Ionicons
            name="flame"
            size={26}
            color={hasStreak ? colors.accent.primary : colors.text.muted}
          />
          <View>
            <Text style={styles.streakNum}>{streakCurrent}</Text>
            <Text style={styles.streakLabel}>DAY STREAK</Text>
          </View>
        </View>

        <View style={styles.week}>
          {week.map((active, i) => (
            <View
              key={i}
              style={[
                styles.weekDot,
                active && styles.weekDotActive,
                !active && i === lastIndex && styles.weekDotToday,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <Stat
          value={`${sessions}`}
          label="SESSIONS"
          color={colors.text.primary}
        />
        <Stat
          value={avgScore === null ? "—" : `${avgScore}`}
          label="AVG SCORE"
          color={colors.score.good}
        />
        <Stat
          value={bestScore === null ? "—" : `${bestScore}`}
          label="BEST"
          color={colors.accent.primary}
        />
      </View>
    </View>
  )
}

function Stat({
  value,
  label,
  color,
}: {
  value: string
  label: string
  color: string
}) {
  return (
    <View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accent.muted,
    borderWidth: 1,
    borderColor: colors.accent.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing["2xl"],
    ...shadows.glow,
  },
  greeting: {
    fontFamily: typography.fonts.label,
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },

  // First-run (no analyses yet)
  emptyTitle: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  emptyText: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginTop: 2,
  },

  // Streak row
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  streakNum: {
    fontFamily: typography.fonts.display,
    fontSize: 26,
    color: colors.text.primary,
    lineHeight: 28,
  },
  streakLabel: {
    fontFamily: typography.fonts.label,
    fontSize: 10,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
  },
  week: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  weekDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.bg.elevated,
  },
  weekDotActive: {
    backgroundColor: colors.accent.primary,
  },
  weekDotToday: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.accent.primary,
  },

  // Divider + stats
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statValue: {
    fontFamily: typography.fonts.display,
    fontSize: 18,
  },
  statLabel: {
    fontFamily: typography.fonts.label,
    fontSize: 9,
    color: colors.text.tertiary,
    letterSpacing: 1,
    marginTop: 2,
  },
})
