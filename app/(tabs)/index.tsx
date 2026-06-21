/**
 * Home Screen
 * The main screen: filter exercises by equipment, pick one, start analysis.
 * Pro-locked and coming-soon exercises are badged; privacy + upgrade entries
 * live in the header / footer.
 */

import ExerciseIcon from "@/components/ExerciseIcon"
import StreakHero from "@/components/StreakHero"
import { CATEGORY_LABELS, exercises } from "@/constants/exercises"
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from "@/constants/theme"
import type { AnalysisResult, ExerciseId } from "@/constants/types"
import type { ExerciseCategory } from "@/constants/exercises"
import { exerciseAccess, isExerciseUnlocked } from "@/lib/movements/tiers"
import type { ProgressRecords } from "@/lib/progress/types"
import { weeklyActivity } from "@/lib/progress/weeklyActivity"
import { getHistory, getRecords, getUserState } from "@/services/storage"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { LinearGradient } from "expo-linear-gradient"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native"

// Enable smooth grid reflow on filter change (Android opt-in; iOS is built-in).
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type Filter = "all" | ExerciseCategory

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "anywhere", label: CATEGORY_LABELS.anywhere.title },
  { key: "gym", label: CATEGORY_LABELS.gym.title },
]

function greetingFor(now: number): string {
  const hour = new Date(now).getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default function HomeScreen() {
  const router = useRouter()
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseId>("bodyweight_squat")
  const [filter, setFilter] = useState<Filter>("all")
  const [isPremium, setIsPremium] = useState(false)
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [records, setRecords] = useState<ProgressRecords | null>(null)

  // Refresh Pro entitlement + progress (streak / stats) on focus — so the hero
  // reflects a new analysis, and Pro-locked cards open after a paywall unlock.
  useFocusEffect(
    useCallback(() => {
      getUserState().then((state) => setIsPremium(state.isPremium))
      Promise.all([getHistory(), getRecords()]).then(([history, recs]) => {
        setAnalyses(history)
        setRecords(recs)
      })
    }, []),
  )

  const handleFilter = (next: Filter) => {
    if (next === filter) return
    Haptics.selectionAsync()
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setFilter(next)
  }

  // Tapping a Pro-locked card routes to the paywall instead of selecting it;
  // coming-soon cards are disabled; free/unlocked cards select normally.
  const handleExercisePress = (id: ExerciseId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (exerciseAccess(id) === "pro" && !isPremium) {
      router.push("/paywall")
      return
    }
    setSelectedExercise(id)
  }

  const handleStartAnalysis = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // The selected card is always unlocked (locked cards route to the paywall on
    // tap), but gate here too so the Pro entitlement stays the source of truth.
    if (!isExerciseUnlocked(selectedExercise, isPremium)) {
      router.push("/paywall")
      return
    }

    router.push({
      pathname: "/analyze",
      params: { exerciseId: selectedExercise },
    })
  }

  const selectedExerciseData = exercises.find((e) => e.id === selectedExercise)
  const visibleExercises =
    filter === "all"
      ? exercises
      : exercises.filter((e) => e.category === filter)
  const fillerCount =
    visibleExercises.length % 3 === 0
      ? 0
      : 3 - (visibleExercises.length % 3)

  // Hero stats — folded from stored history + durable streak records.
  const sessions = analyses.length
  const avgScore = sessions
    ? Math.round(analyses.reduce((sum, a) => sum + a.overallScore, 0) / sessions)
    : null
  const bestScore = sessions
    ? Math.round(Math.max(...analyses.map((a) => a.overallScore)))
    : null
  const week = weeklyActivity(analyses.map((a) => a.timestamp))

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandText}>
            KRIT<Text style={styles.brandAccent}>IQ</Text>
          </Text>
          <Text style={styles.tagline}>AI form coach</Text>
        </View>

        {!isPremium ? (
          <TouchableOpacity
            style={styles.upgradeBadge}
            onPress={() => router.push("/paywall")}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Unlock Pro"
          >
            <Ionicons
              name="diamond-outline"
              size={11}
              color={colors.accent.primary}
            />
            <Text style={styles.upgradeText}>Unlock Pro</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.proBadge}>
            <Ionicons name="diamond" size={12} color={colors.accent.primary} />
            <Text style={styles.proText}>PRO</Text>
          </View>
        )}
      </View>

      {/* Dashboard hero — greeting, streak + week dots, quick stats */}
      <StreakHero
        greeting={greetingFor(Date.now())}
        streakCurrent={records?.streak.current ?? 0}
        week={week}
        sessions={sessions}
        avgScore={avgScore}
        bestScore={bestScore}
      />

      {/* Section heading + equipment filter */}
      <Text style={styles.sectionLabel}>SELECT EXERCISE</Text>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => handleFilter(f.key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Exercise grid */}
      <View style={styles.exerciseGrid}>
        {visibleExercises.map((exercise) => {
          const access = exerciseAccess(exercise.id)
          const comingSoon = access === "coming-soon"
          const proLocked = access === "pro" && !isPremium
          const isSelected =
            !comingSoon && !proLocked && selectedExercise === exercise.id
          return (
            <TouchableOpacity
              key={exercise.id}
              style={[
                styles.exerciseCard,
                isSelected && styles.exerciseCardSelected,
                comingSoon && styles.exerciseCardDisabled,
              ]}
              onPress={() => handleExercisePress(exercise.id as ExerciseId)}
              disabled={comingSoon}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{
                selected: isSelected,
                disabled: comingSoon,
              }}
            >
              {isSelected && <View style={styles.selectedGlow} />}
              <View
                style={[
                  styles.exerciseIconTile,
                  isSelected && styles.exerciseIconTileSelected,
                ]}
              >
                <ExerciseIcon
                  name={exercise.icon}
                  size={26}
                  color={
                    isSelected ? colors.accent.primary : colors.text.secondary
                  }
                />
              </View>
              <Text
                style={[
                  styles.exerciseLabel,
                  isSelected && styles.exerciseLabelSelected,
                ]}
                numberOfLines={1}
              >
                {exercise.shortName}
              </Text>
              {isSelected && (
                <View style={styles.checkmark}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.accent.primary}
                  />
                </View>
              )}
              {proLocked && (
                <View style={styles.lockBadge}>
                  <Ionicons
                    name="lock-closed"
                    size={9}
                    color={colors.accent.primary}
                  />
                  <Text style={styles.lockText}>PRO</Text>
                </View>
              )}
              {comingSoon && (
                <View style={styles.soonBadge}>
                  <Text style={styles.soonText}>SOON</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
        {/* Fill empty slots to keep 3-per-row alignment */}
        {Array.from({ length: fillerCount }).map((_, i) => (
          <View key={`spacer-${i}`} style={styles.exerciseCardSpacer} />
        ))}
      </View>

      {/* Camera Tips */}
      {selectedExerciseData && (
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons
              name="videocam-outline"
              size={15}
              color={colors.accent.primary}
            />
            <Text style={styles.tipsTitle}>Camera tips</Text>
          </View>
          {selectedExerciseData.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Analyze Button */}
      <TouchableOpacity
        style={styles.analyzeButton}
        onPress={handleStartAnalysis}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Analyze my form"
      >
        <LinearGradient
          colors={colors.accent.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.analyzeGradient}
        >
          <Ionicons name="scan-outline" size={20} color="#000" />
          <Text style={styles.analyzeText}>Analyze My Form</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Metrics Preview */}
      {selectedExerciseData && (
        <View style={styles.metricsPreview}>
          <Text style={styles.metricsPreviewTitle}>What we score</Text>
          <View style={styles.metricsRow}>
            {selectedExerciseData.metrics.map((metric) => (
              <View key={metric.id} style={styles.metricChip}>
                <Text style={styles.metricChipText}>{metric.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Privacy trust line — opens the privacy feature screen */}
      <TouchableOpacity
        style={styles.privacyRow}
        onPress={() => router.push("/privacy")}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="How your privacy is protected"
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={14}
          color={colors.accent.primary}
        />
        <Text style={styles.privacyText}>
          Your video never leaves your device — deleted right after analysis
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.text.muted} />
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    paddingTop: Platform.OS === "ios" ? 64 : 40,
    paddingHorizontal: spacing["3xl"],
    paddingBottom: spacing["6xl"],
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing["4xl"],
  },
  brandText: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    color: colors.text.primary,
    letterSpacing: 3,
  },
  brandAccent: {
    color: colors.accent.primary,
  },
  tagline: {
    fontFamily: typography.fonts.label,
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 6,
  },
  upgradeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.accent.muted,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accent.border,
  },
  upgradeText: {
    fontFamily: typography.fonts.heading,
    fontSize: 11,
    color: colors.accent.primary,
    letterSpacing: 1,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accent.muted,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accent.border,
  },
  proText: {
    fontFamily: typography.fonts.display,
    fontSize: 10,
    color: colors.accent.primary,
    letterSpacing: 2,
  },

  // Section label
  sectionLabel: {
    fontFamily: typography.fonts.label,
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    letterSpacing: 4,
    marginBottom: spacing.lg,
  },

  // Equipment filter
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing["2xl"],
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  filterChipActive: {
    backgroundColor: colors.accent.muted,
    borderColor: colors.accent.border,
  },
  filterChipText: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  filterChipTextActive: {
    color: colors.accent.primary,
  },

  // Exercise grid
  exerciseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing["2xl"],
  },
  exerciseCard: {
    width: "30.5%",
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border.default,
    position: "relative",
    overflow: "hidden",
    ...shadows.card,
  },
  exerciseCardSpacer: {
    width: "30.5%",
  },
  exerciseCardSelected: {
    borderColor: colors.accent.border,
    backgroundColor: colors.accent.muted,
    ...shadows.glow,
  },
  selectedGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent.primary,
  },
  exerciseIconTile: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  exerciseIconTileSelected: {
    backgroundColor: colors.accent.muted,
  },
  exerciseLabel: {
    fontFamily: typography.fonts.label,
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  exerciseLabelSelected: {
    color: colors.accent.primary,
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  exerciseCardDisabled: {
    opacity: 0.4,
  },
  soonBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.bg.elevated,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  soonText: {
    fontFamily: typography.fonts.mono,
    fontSize: 7,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  lockBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.accent.muted,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.accent.border,
  },
  lockText: {
    fontFamily: typography.fonts.mono,
    fontSize: 7,
    color: colors.accent.primary,
    letterSpacing: 1,
  },

  // Tips
  tipsCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tipsTitle: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent.primary,
    opacity: 0.7,
  },
  tipText: {
    flex: 1,
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    lineHeight: 20,
  },

  // Analyze Button
  analyzeButton: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    marginBottom: spacing["2xl"],
    ...shadows.button,
  },
  analyzeGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  analyzeText: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.lg,
    color: "#000",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Metrics Preview
  metricsPreview: {
    marginBottom: spacing.xl,
  },
  metricsPreviewTitle: {
    fontFamily: typography.fonts.label,
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricChip: {
    backgroundColor: colors.bg.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  metricChipText: {
    fontFamily: typography.fonts.label,
    fontSize: 11,
    color: colors.text.secondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Privacy trust line
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  privacyText: {
    flex: 1,
    fontFamily: typography.fonts.body,
    fontSize: 11,
    color: colors.text.tertiary,
    letterSpacing: 0.3,
    lineHeight: 15,
  },
})
