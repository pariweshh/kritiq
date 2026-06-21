/**
 * Home Screen
 * The main screen users see. Pick an exercise → Start analysis.
 * Shows remaining free analyses and premium upsell.
 */

import {
  CATEGORY_LABELS,
  exercises,
  getExercisesByCategory,
} from "@/constants/exercises"
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from "@/constants/theme"
import type { ExerciseId } from "@/constants/types"
import { exerciseAccess, isExerciseUnlocked } from "@/lib/movements/tiers"
import { getUserState } from "@/services/storage"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { LinearGradient } from "expo-linear-gradient"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export default function HomeScreen() {
  const router = useRouter()
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseId>("bodyweight_squat")
  const [isPremium, setIsPremium] = useState(false)

  // Refresh the Pro entitlement every time the screen focuses (e.g. after the
  // paywall unlocks it) so Pro-locked cards open up.
  useFocusEffect(
    useCallback(() => {
      getUserState().then((state) => setIsPremium(state.isPremium))
    }, []),
  )

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
          <Text style={styles.tagline}>AI rates your form</Text>
        </View>

        {/* Upgrade entry point for free users */}
        {!isPremium && (
          <TouchableOpacity
            style={styles.upgradeBadge}
            onPress={() => router.push("/paywall")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="diamond-outline"
              size={11}
              color={colors.accent.primary}
            />
            <Text style={styles.upgradeText}>Unlock Pro</Text>
          </TouchableOpacity>
        )}

        {isPremium && (
          <View style={styles.proBadge}>
            <Ionicons name="diamond" size={12} color={colors.accent.primary} />
            <Text style={styles.proText}>PRO</Text>
          </View>
        )}
      </View>

      {/* Exercise Selection */}
      <Text style={styles.sectionLabel}>SELECT EXERCISE</Text>

      {getExercisesByCategory().map((group) => (
        <View key={group.category} style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>
              {CATEGORY_LABELS[group.category].title}
            </Text>
            <Text style={styles.categorySubtitle}>
              {CATEGORY_LABELS[group.category].subtitle}
            </Text>
          </View>

          <View style={styles.exerciseGrid}>
            {group.exercises.map((exercise) => {
              const access = exerciseAccess(exercise.id)
              const comingSoon = access === "coming-soon"
              const proLocked = access === "pro" && !isPremium
              const isSelected =
                !comingSoon &&
                !proLocked &&
                selectedExercise === exercise.id
              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.exerciseCard,
                    isSelected && styles.exerciseCardSelected,
                    comingSoon && styles.exerciseCardDisabled,
                  ]}
                  onPress={() =>
                    handleExercisePress(exercise.id as ExerciseId)
                  }
                  disabled={comingSoon}
                  activeOpacity={0.7}
                >
                  {isSelected && <View style={styles.selectedGlow} />}
                  <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
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
            {group.exercises.length % 3 !== 0 &&
              Array.from({ length: 3 - (group.exercises.length % 3) }).map(
                (_, i) => (
                  <View key={`spacer-${i}`} style={styles.exerciseCardSpacer} />
                ),
              )}
          </View>
        </View>
      ))}

      {/* Camera Tips */}
      {selectedExerciseData && (
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>
            <Ionicons
              name="videocam-outline"
              size={14}
              color={colors.text.secondary}
            />
            {"  "}Camera Tips
          </Text>
          {selectedExerciseData.tips.map((tip, i) => (
            <Text key={i} style={styles.tipText}>
              • {tip}
            </Text>
          ))}
        </View>
      )}

      {/* Analyze Button */}
      <TouchableOpacity
        style={styles.analyzeButton}
        onPress={handleStartAnalysis}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#00FF88", "#00DDAA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.analyzeGradient}
        >
          <Ionicons name="camera" size={20} color="#000" />
          <Text style={styles.analyzeText}>Analyze My Form</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Metrics Preview */}
      {selectedExerciseData && (
        <View style={styles.metricsPreview}>
          <Text style={styles.metricsPreviewTitle}>What we analyze:</Text>
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
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={14}
          color={colors.accent.primary}
        />
        <Text style={styles.privacyText}>
          Your video never leaves your device — deleted right after analysis
        </Text>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={colors.text.tertiary}
        />
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
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: spacing["3xl"],
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing["5xl"],
  },
  brandText: {
    fontFamily: "Orbitron",
    fontSize: 22,
    color: colors.text.primary,
    letterSpacing: 3,
  },
  brandAccent: {
    color: colors.accent.primary,
  },
  tagline: {
    fontFamily: "Rajdhani",
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  upgradeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.accent.muted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accent.border,
  },
  upgradeText: {
    fontFamily: "Rajdhani-Bold",
    fontSize: 11,
    color: colors.accent.primary,
    letterSpacing: 1,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accent.muted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accent.border,
  },
  proText: {
    fontFamily: "Orbitron",
    fontSize: 10,
    color: colors.accent.primary,
    letterSpacing: 2,
  },

  // Exercise Selection
  sectionLabel: {
    fontFamily: "Rajdhani",
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    letterSpacing: 4,
    marginBottom: spacing.lg,
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryTitle: {
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  categorySubtitle: {
    fontFamily: "Rajdhani",
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  exerciseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  exerciseCard: {
    width: "30.5%",
    backgroundColor: colors.bg.tertiary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border.default,
    position: "relative",
    overflow: "hidden",
  },
  exerciseCardSpacer: {
    width: "30.5%",
  },
  exerciseCardSelected: {
    borderColor: colors.accent.border,
    backgroundColor: colors.accent.muted,
  },
  selectedGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent.primary,
  },
  exerciseIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  exerciseLabel: {
    fontFamily: "Rajdhani",
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    letterSpacing: 2,
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
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  soonText: {
    fontFamily: "SpaceMono",
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
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.accent.border,
  },
  lockText: {
    fontFamily: "SpaceMono",
    fontSize: 7,
    color: colors.accent.primary,
    letterSpacing: 1,
  },

  // Tips
  tipsCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  tipsTitle: {
    fontFamily: "Rajdhani",
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    lineHeight: 20,
    marginTop: 4,
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
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.lg,
    color: "#000",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Metrics Preview
  metricsPreview: {
    marginBottom: spacing.lg,
  },
  metricsPreviewTitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricChip: {
    backgroundColor: colors.bg.elevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  metricChipText: {
    fontFamily: "Rajdhani",
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
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  privacyText: {
    flex: 1,
    fontFamily: "Rajdhani",
    fontSize: 11,
    color: colors.text.secondary,
    letterSpacing: 0.3,
    lineHeight: 15,
  },
})
