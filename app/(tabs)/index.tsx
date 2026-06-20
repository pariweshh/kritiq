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
import { canAnalyze } from "@/services/storage"
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
  const [analysisStatus, setAnalysisStatus] = useState({
    allowed: true,
    isPremium: false,
    trialStarted: false,
  })

  // Refresh limits every time screen focuses
  useFocusEffect(
    useCallback(() => {
      canAnalyze().then(setAnalysisStatus)
    }, []),
  )

  const handleExerciseSelect = (id: ExerciseId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedExercise(id)
  }

  const handleStartAnalysis = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    if (!analysisStatus.allowed) {
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

        {/* Free tier indicator */}
        {!analysisStatus.isPremium && (
          <TouchableOpacity
            style={styles.limitBadge}
            onPress={() => router.push("/paywall")}
            activeOpacity={0.7}
          >
            <View style={styles.limitDot} />
            <Text style={styles.limitText}>
              Free trial
            </Text>
          </TouchableOpacity>
        )}

        {analysisStatus.isPremium && (
          <View style={styles.proBadge}>
            <Ionicons name="diamond" size={12} color={colors.accent.primary} />
            <Text style={styles.proText}>PRO</Text>
          </View>
        )}
      </View>

      {/* TEMP: pose spike entry — remove after Phase 1 spike is verified */}
      <TouchableOpacity
        onPress={() => router.push("/spike")}
        activeOpacity={0.7}
        style={{
          backgroundColor: colors.bg.elevated,
          borderColor: colors.accent.border,
          borderWidth: 1,
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
          marginBottom: spacing.xl,
        }}
      >
        <Text
          style={{
            color: colors.accent.primary,
            fontFamily: "Rajdhani-Bold",
            letterSpacing: 2,
          }}
        >
          🧪 RUN POSE SPIKE
        </Text>
      </TouchableOpacity>

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
              const isSelected = selectedExercise === exercise.id
              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.exerciseCard,
                    isSelected && styles.exerciseCardSelected,
                  ]}
                  onPress={() =>
                    handleExerciseSelect(exercise.id as ExerciseId)
                  }
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
          colors={
            analysisStatus.allowed
              ? ["#00FF88", "#00DDAA"]
              : ["#333333", "#222222"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.analyzeGradient}
        >
          <Ionicons
            name={analysisStatus.allowed ? "camera" : "lock-closed"}
            size={20}
            color={analysisStatus.allowed ? "#000" : "#666"}
          />
          <Text
            style={[
              styles.analyzeText,
              !analysisStatus.allowed && styles.analyzeTextLocked,
            ]}
          >
            {analysisStatus.allowed ? "Analyze My Form" : "Upgrade to Continue"}
          </Text>
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
  limitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bg.elevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  limitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.primary,
  },
  limitText: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    color: colors.text.secondary,
    letterSpacing: 0.5,
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
  analyzeTextLocked: {
    color: "#666",
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
})
