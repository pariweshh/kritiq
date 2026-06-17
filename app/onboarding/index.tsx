/**
 * Onboarding Flow
 * 3 slides: What it does → How it works → Get started
 * Dark cyber aesthetic consistent with the rest of the app.
 */

import { borderRadius, colors, spacing, typography } from "@/constants/theme"
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
      "Record or upload a video of your lift and get an instant AI-powered form score with detailed metric breakdowns.",
  },
  {
    id: "2",
    icon: "analytics-outline",
    title: "Detailed",
    highlight: "analysis",
    subtitle: "",
    description:
      "Get scored on 4 key metrics per exercise — depth, tracking, positioning, and stability. Each metric includes specific coaching feedback.",
  },
  {
    id: "3",
    icon: "share-outline",
    title: "Share your",
    highlight: "score",
    subtitle: "",
    description:
      "Get a beautiful score card you can share on Instagram, TikTok, or with friends. Track your progress over time.",
  },
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
            <Text style={styles.previewScore}>
              8<Text style={styles.previewDecimal}>.7</Text>
            </Text>
            <Text style={styles.previewOut}>/10</Text>
          </View>
        </View>
      )}

      {/* Metric preview on second slide */}
      {index === 1 && (
        <View style={styles.metricPreview}>
          {["Depth", "Knee Track", "Back Angle", "Stability"].map((name, i) => (
            <View key={name} style={styles.previewMetric}>
              <Text style={styles.previewMetricName}>{name}</Text>
              <View style={styles.previewBarWrap}>
                <View
                  style={[
                    styles.previewBar,
                    { width: `${70 + i * 7}%` as any },
                  ]}
                />
              </View>
              <Text style={styles.previewMetricScore}>
                {(7 + i * 0.7).toFixed(1)}
              </Text>
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
            colors={isLast ? ["#00FF88", "#00DDAA"] : ["#1A1A1A", "#151515"]}
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

        {/* Free badge */}
        <Text style={styles.freeBadge}>
          3 free analyses per week • No account required
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
    fontFamily: "Rajdhani",
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
    fontFamily: "Rajdhani-Bold",
    fontSize: 32,
    color: colors.text.secondary,
    textAlign: "center",
    letterSpacing: 1,
    lineHeight: 38,
    marginBottom: spacing.lg,
  },
  titleHighlight: {
    color: colors.accent.primary,
    fontFamily: "Orbitron",
    fontSize: 28,
    letterSpacing: 3,
  },

  // Description
  description: {
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
  },
  previewLabel: {
    fontFamily: "Rajdhani",
    fontSize: 10,
    color: colors.text.muted,
    letterSpacing: 4,
    marginBottom: spacing.sm,
  },
  previewScore: {
    fontFamily: "Orbitron",
    fontSize: 64,
    color: colors.text.primary,
    lineHeight: 64,
  },
  previewDecimal: {
    fontSize: 40,
    color: colors.accent.primary,
  },
  previewOut: {
    fontFamily: "Rajdhani",
    fontSize: 14,
    color: colors.text.muted,
    letterSpacing: 2,
    marginTop: 4,
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
    fontFamily: "Rajdhani",
    fontSize: 11,
    color: colors.text.tertiary,
    letterSpacing: 2,
    width: 90,
    textTransform: "uppercase",
  },
  previewBarWrap: {
    flex: 1,
    height: 3,
    backgroundColor: "#151515",
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
    fontFamily: "Orbitron",
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
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
    letterSpacing: 2,
  },
  getStartedText: {
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.lg,
    color: "#000",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Free badge
  freeBadge: {
    marginTop: spacing.lg,
    fontSize: 11,
    color: colors.text.muted,
    letterSpacing: 0.3,
  },
})
