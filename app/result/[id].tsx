/**
 * Result Screen
 * Displays the full analysis result with:
 * - Animated score card reveal (the "wow" moment)
 * - AI feedback (summary, strength, improvement)
 * - Share button (the viral mechanism)
 * - Per-metric detailed breakdown
 */

import ScoreCard from "@/components/ScoreCard"
import {
  borderRadius,
  colors,
  getMetricColor,
  shadows,
  spacing,
  typography,
} from "@/constants/theme"
import type { AnalysisResult } from "@/constants/types"
import { shareScoreCard } from "@/utils/share"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useEffect, useRef } from "react"
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import ViewShot from "react-native-view-shot"

export default function ResultScreen() {
  const router = useRouter()
  const { data } = useLocalSearchParams<{ id: string; data: string }>()
  const cardRef = useRef<ViewShot>(null)

  // Reveal animations
  const cardScale = useRef(new Animated.Value(0.85)).current
  const cardOpacity = useRef(new Animated.Value(0)).current
  const feedbackTranslate = useRef(new Animated.Value(30)).current
  const feedbackOpacity = useRef(new Animated.Value(0)).current
  const shareOpacity = useRef(new Animated.Value(0)).current

  let result: AnalysisResult | null = null
  try {
    result = JSON.parse(data || "{}")
  } catch {
    // handled by conditional render below
  }

  // Play reveal animation on mount
  useEffect(() => {
    if (!result) return

    // Card scale + fade in
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
        delay: 200,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start()

    // Share button fade in
    Animated.timing(shareOpacity, {
      toValue: 1,
      duration: 400,
      delay: 700,
      useNativeDriver: true,
    }).start()

    // Feedback slide up
    Animated.parallel([
      Animated.timing(feedbackTranslate, {
        toValue: 0,
        duration: 500,
        delay: 900,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 500,
        delay: 900,
        useNativeDriver: true,
      }),
    ]).start()

    // Haptic on reveal
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }, 300)
  }, [
    cardOpacity,
    cardScale,
    feedbackOpacity,
    feedbackTranslate,
    result,
    shareOpacity,
  ])

  const handleShare = useCallback(async () => {
    if (!result) {
      Alert.alert("Error", "Could not load result.")
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      if (!cardRef.current?.capture) {
        Alert.alert("Error", "Could not capture score card.")
        return
      }

      const uri = await cardRef.current.capture()
      const shared = await shareScoreCard(uri, result)

      if (!shared) {
        Alert.alert(
          "Sharing not available",
          "Sharing is not supported on this device.",
        )
      }
    } catch (error) {
      console.error("Share error:", error)
    }
  }, [result])

  const handleDone = () => {
    router.replace("/(tabs)")
  }

  // Low-confidence fallback: send the user back to refilm the same exercise.
  const handleRefilm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.replace({
      pathname: "/analyze",
      params: { exerciseId: result?.exerciseId ?? "squat" },
    })
  }, [result, router])

  if (!result) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Could not load result.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDone} style={styles.doneBtn}>
          <Ionicons name="close" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Complete</Text>
        <View style={styles.doneBtn} />
      </View>

      {/* Low-confidence banner + refilm fallback */}
      {result.lowConfidence && (
        <View style={styles.lowConfBanner}>
          <Ionicons
            name="alert-circle"
            size={20}
            color={colors.warning}
            style={styles.lowConfIcon}
          />
          <View style={styles.lowConfBody}>
            <Text style={styles.lowConfTitle}>Low-confidence read</Text>
            <Text style={styles.lowConfText}>
              Some joints were hard to track, so this score may be off. For a
              reliable result, refilm side-on with your full body in frame.
            </Text>
            <TouchableOpacity
              style={styles.refilmBtn}
              onPress={handleRefilm}
              activeOpacity={0.85}
            >
              <Ionicons name="videocam" size={16} color="#000" />
              <Text style={styles.refilmBtnText}>Refilm</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Score Card — animated reveal */}
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            opacity: cardOpacity,
            transform: [{ scale: cardScale }],
          },
        ]}
      >
        <ViewShot
          ref={cardRef}
          options={{ format: "png", quality: 1 }}
          style={styles.viewShot}
        >
          <ScoreCard result={result} />
        </ViewShot>
      </Animated.View>

      {/* Share Button — animated */}
      <Animated.View style={[styles.shareWrap, { opacity: shareOpacity }]}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#00FF88", "#00DDAA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareGradient}
          >
            <Ionicons name="share-outline" size={18} color="#000" />
            <Text style={styles.shareText}>Share Score Card</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* AI Feedback Section — animated slide up */}
      <Animated.View
        style={[
          styles.feedbackSection,
          {
            opacity: feedbackOpacity,
            transform: [{ translateY: feedbackTranslate }],
          },
        ]}
      >
        <Text style={styles.feedbackSectionTitle}>AI ANALYSIS</Text>

        {/* Summary */}
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackText}>{result.summary}</Text>
        </View>

        {/* Strength */}
        <View style={styles.feedbackRow}>
          <View
            style={[
              styles.feedbackIcon,
              { backgroundColor: colors.score.excellent + "15" },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.score.excellent}
            />
          </View>
          <View style={styles.feedbackContent}>
            <Text style={styles.feedbackLabel}>TOP STRENGTH</Text>
            <Text style={styles.feedbackDetail}>{result.topStrength}</Text>
          </View>
        </View>

        {/* Improvement */}
        <View style={styles.feedbackRow}>
          <View
            style={[
              styles.feedbackIcon,
              { backgroundColor: colors.score.fair + "15" },
            ]}
          >
            <Ionicons
              name="arrow-up-circle"
              size={16}
              color={colors.score.fair}
            />
          </View>
          <View style={styles.feedbackContent}>
            <Text style={styles.feedbackLabel}>FOCUS AREA</Text>
            <Text style={styles.feedbackDetail}>{result.topImprovement}</Text>
          </View>
        </View>

        {/* Per-metric feedback */}
        <Text
          style={[styles.feedbackSectionTitle, { marginTop: spacing["2xl"] }]}
        >
          METRIC BREAKDOWN
        </Text>
        {result.metrics.map((metric) => {
          const mColor = getMetricColor(metric.score)
          return (
            <View key={metric.metricId} style={styles.metricFeedback}>
              <View style={styles.metricFeedbackHeader}>
                <View style={styles.metricNameRow}>
                  <View
                    style={[
                      styles.metricIndicator,
                      { backgroundColor: mColor },
                    ]}
                  />
                  <Text style={styles.metricFeedbackName}>{metric.name}</Text>
                </View>
                <Text style={[styles.metricFeedbackScore, { color: mColor }]}>
                  {Math.round(metric.score)}
                </Text>
              </View>
              <Text style={styles.metricFeedbackText}>{metric.feedback}</Text>
            </View>
          )
        })}
      </Animated.View>

      {/* Done Button */}
      <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
        <Text style={styles.doneButtonText}>Done</Text>
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
    paddingTop: Platform.OS === "ios" ? 56 : 32,
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing["2xl"],
  },
  doneBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.elevated,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Rajdhani",
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  // Low-confidence banner
  lowConfBanner: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.warning + "12",
    borderWidth: 1,
    borderColor: colors.warning + "55",
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  lowConfIcon: { marginTop: 1 },
  lowConfBody: { flex: 1 },
  lowConfTitle: {
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.md,
    color: colors.warning,
    letterSpacing: 1,
    marginBottom: 4,
  },
  lowConfText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  refilmBtn: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
  },
  refilmBtnText: {
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.sm,
    color: "#000",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Card
  cardWrapper: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
  },
  viewShot: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
  },

  // Share Button
  shareWrap: {
    marginTop: spacing.xl,
  },
  shareButton: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    ...shadows.button,
  },
  shareGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  shareText: {
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.md,
    color: "#000",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Feedback
  feedbackSection: {
    marginTop: spacing["4xl"],
  },
  feedbackSectionTitle: {
    fontFamily: "Rajdhani",
    fontSize: 10,
    color: colors.text.tertiary,
    letterSpacing: 4,
    marginBottom: spacing.lg,
  },
  feedbackCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.xl,
  },
  feedbackText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  feedbackRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  feedbackIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  feedbackContent: { flex: 1 },
  feedbackLabel: {
    fontFamily: "Rajdhani",
    fontSize: 9,
    color: colors.text.muted,
    letterSpacing: 3,
    marginBottom: 4,
  },
  feedbackDetail: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  // Metric Feedback
  metricFeedback: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.md,
  },
  metricFeedbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  metricNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricIndicator: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  metricFeedbackName: {
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  metricFeedbackScore: {
    fontFamily: "Orbitron",
    fontSize: typography.sizes.md,
  },
  metricFeedbackText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    lineHeight: 20,
    marginLeft: 11,
  },

  // Done
  doneButton: {
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  doneButtonText: {
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    letterSpacing: 2,
  },

  // Error
  errorContainer: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: colors.text.tertiary,
    fontSize: typography.sizes.md,
  },
  errorLink: {
    color: colors.accent.primary,
    fontSize: typography.sizes.md,
    marginTop: spacing.lg,
  },
})
