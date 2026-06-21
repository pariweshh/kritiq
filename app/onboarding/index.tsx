/**
 * Onboarding Flow
 * 3 slides: What it does → How it works → Get started
 * Dark cyber aesthetic consistent with the rest of the app.
 */

import { borderRadius, colors, shadows, spacing, typography } from "@/constants/theme"
import { setOnboardingComplete } from "@/services/storage"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useRef, useState } from "react"
import {
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

interface Slide {
  id: string
  icon: keyof typeof Ionicons.glyphMap
  title: string
  highlight: string
  subtitle: string
  description: string
}

const slides: Slide[] = [
  {
    id: "1",
    icon: "fitness-outline",
    title: "AI rates your",
    highlight: "form",
    subtitle: "",
    description:
      "Record or upload a lift and get an instant form score from 0 to 100 — with a clear read on what's working and what's not.",
  },
  {
    id: "2",
    icon: "analytics-outline",
    title: "Detailed",
    highlight: "analysis",
    subtitle: "",
    description:
      "Every rep is scored on the metrics that matter — depth, tracking, positioning, and stability — each with specific coaching.",
  },
  {
    id: "3",
    icon: "trophy-outline",
    title: "Track your",
    highlight: "progress",
    subtitle: "",
    description:
      "Personal bests and streaks keep you honest, and a clean score card makes your wins easy to share.",
  },
]

/** Illustrative metric scores for the slide-2 preview (0–100 scale). */
const PREVIEW_METRICS = [
  { name: "Depth", value: 91 },
  { name: "Knee Track", value: 85 },
  { name: "Back Angle", value: 78 },
  { name: "Stability", value: 72 },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      })
    } else {
      handleGetStarted()
    }
  }

  const handleGetStarted = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await setOnboardingComplete()
    router.replace("/(tabs)")
  }

  const handleSkip = async () => {
    await setOnboardingComplete()
    router.replace("/(tabs)")
  }

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <View style={styles.slide}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <View style={styles.iconGlow} />
        <View style={styles.iconWrap}>
          <Ionicons name={item.icon} size={36} color={colors.accent.primary} />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>
        {item.title}
        {"\n"}
        <Text style={styles.titleHighlight}>{item.highlight}</Text>
      </Text>

      {/* Description */}
      <Text style={styles.description}>{item.description}</Text>

      {/* Decorative score preview on first slide */}
      {index === 0 && (
        <View style={styles.scorePreview}>
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>SQUAT FORM</Text>
            <Text style={styles.previewScore}>87</Text>
            <View style={styles.previewTier}>
              <Text style={styles.previewTierText}>ADVANCED</Text>
            </View>
          </View>
        </View>
      )}

      {/* Metric preview on second slide */}
      {index === 1 && (
        <View style={styles.metricPreview}>
          {PREVIEW_METRICS.map((metric) => (
            <View key={metric.name} style={styles.previewMetric}>
              <Text style={styles.previewMetricName}>{metric.name}</Text>
              <View style={styles.previewBarWrap}>
                <View
                  style={[styles.previewBar, { width: `${metric.value}%` }]}
                />
              </View>
              <Text style={styles.previewMetricScore}>{metric.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )

  const isLast = currentIndex === slides.length - 1

  return (
    <View style={styles.container}>
      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
          setCurrentIndex(index)
        }}
        bounces={false}
      />

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((slide, i) => (
            <View
              key={slide.id}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              isLast
                ? colors.accent.gradient
                : [colors.bg.elevated, colors.bg.secondary]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextGradient}
          >
            {isLast ? (
              <>
                <Text style={styles.getStartedText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
              </>
            ) : (
              <>
                <Text style={styles.nextText}>Next</Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.text.secondary}
                />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Free + privacy reassurance */}
        <Text style={styles.freeBadge}>
          Core exercises free · No account needed
        </Text>
        <Text style={styles.privacyBadge}>
          Your video never leaves your device — deleted right after analysis
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },

  // Skip
  skipBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 32,
    right: spacing.xl,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipText: {
    fontFamily: typography.fonts.label,
    fontSize: typography.sizes.md,
    color: colors.text.muted,
    letterSpacing: 1,
  },

  // Slide
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: spacing["3xl"],
    paddingTop: Platform.OS === "ios" ? 120 : 100,
    alignItems: "center",
  },

  // Icon
  iconContainer: {
    position: "relative",
    marginBottom: spacing["4xl"],
  },
  iconGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent.primary,
    opacity: 0.06,
    top: -8,
    left: -8,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.accent.muted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accent.border,
  },

  // Title
  title: {
    fontFamily: typography.fonts.heading,
    fontSize: 32,
    color: colors.text.secondary,
    textAlign: "center",
    letterSpacing: 1,
    lineHeight: 38,
    marginBottom: spacing.lg,
  },
  titleHighlight: {
    color: colors.accent.primary,
    fontFamily: typography.fonts.display,
    fontSize: 28,
    letterSpacing: 3,
  },

  // Description
  description: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.md,
    color: colors.text.tertiary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },

  // Score Preview (slide 1)
  scorePreview: {
    marginTop: spacing["5xl"],
  },
  previewCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing["4xl"],
    paddingVertical: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
    ...shadows.card,
  },
  previewLabel: {
    fontFamily: typography.fonts.label,
    fontSize: 10,
    color: colors.text.muted,
    letterSpacing: 4,
    marginBottom: spacing.sm,
  },
  previewScore: {
    fontFamily: typography.fonts.display,
    fontSize: 64,
    color: colors.text.primary,
    lineHeight: 64,
  },
  previewTier: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.accent.muted,
    borderWidth: 1,
    borderColor: colors.accent.border,
  },
  previewTierText: {
    fontFamily: typography.fonts.heading,
    fontSize: 10,
    color: colors.accent.primary,
    letterSpacing: 3,
  },

  // Metric Preview (slide 2)
  metricPreview: {
    marginTop: spacing["4xl"],
    width: "100%",
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 12,
  },
  previewMetric: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewMetricName: {
    fontFamily: typography.fonts.label,
    fontSize: 11,
    color: colors.text.tertiary,
    letterSpacing: 2,
    width: 90,
    textTransform: "uppercase",
  },
  previewBarWrap: {
    flex: 1,
    height: 3,
    backgroundColor: colors.bg.primary,
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: "hidden",
  },
  previewBar: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: colors.accent.primary,
    opacity: 0.6,
  },
  previewMetricScore: {
    fontFamily: typography.fonts.display,
    fontSize: 12,
    color: colors.accent.primary,
    width: 30,
    textAlign: "right",
  },

  // Bottom
  bottomSection: {
    paddingHorizontal: spacing["3xl"],
    paddingBottom: Platform.OS === "ios" ? 48 : 32,
    alignItems: "center",
  },

  // Dots
  dots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing["2xl"],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.muted,
  },
  dotActive: {
    backgroundColor: colors.accent.primary,
    width: 24,
  },

  // Button
  nextButton: {
    width: "100%",
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  nextGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  nextText: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
    letterSpacing: 2,
  },
  getStartedText: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.lg,
    color: "#000",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Free + privacy badges
  freeBadge: {
    fontFamily: typography.fonts.body,
    marginTop: spacing.lg,
    fontSize: 11,
    color: colors.text.muted,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  privacyBadge: {
    fontFamily: typography.fonts.body,
    marginTop: 6,
    fontSize: 10,
    color: colors.text.muted,
    letterSpacing: 0.3,
    textAlign: "center",
    lineHeight: 14,
    paddingHorizontal: spacing.xl,
  },
})
