/**
 * AnalyzingOverlay
 * Premium loading experience while AI processes the video.
 * Animated scan line + rotating messages + progress dots.
 */

import { colors, spacing, typography } from "@/constants/theme"
import { useCallback, useEffect, useRef, useState } from "react"
import { Animated, StyleSheet, Text, View } from "react-native"

const MESSAGES = [
  { text: "Uploading video...", icon: "📤" },
  { text: "Analyzing your form...", icon: "🔍" },
  { text: "Checking depth and alignment...", icon: "📐" },
  { text: "Evaluating technique...", icon: "🎯" },
  { text: "Scoring your metrics...", icon: "📊" },
  { text: "Generating feedback...", icon: "💬" },
  { text: "Almost there...", icon: "✨" },
]

interface Props {
  readonly exerciseName: string
}

export default function AnalyzingOverlay({ exerciseName }: Props) {
  const [messageIndex, setMessageIndex] = useState(0)
  const scanAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(0.4)).current
  const fadeAnim = useRef(new Animated.Value(1)).current

  const runFadeCycle = useCallback(() => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length)
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    })
  }, [fadeAnim])

  // Cycle messages
  useEffect(() => {
    const interval = setInterval(() => {
      runFadeCycle()
    }, 2500)
    return () => clearInterval(interval)
  }, [runFadeCycle])

  // Scan line animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [scanAnim])

  // Pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [pulseAnim])

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  })

  return (
    <View style={styles.container}>
      {/* Scan effect */}
      <View style={styles.scanArea}>
        <Animated.View
          style={[
            styles.scanLine,
            { transform: [{ translateY: scanTranslate }] },
          ]}
        />

        {/* Center pulse */}
        <Animated.View style={[styles.pulseCircle, { opacity: pulseAnim }]} />

        {/* Inner icon */}
        <View style={styles.centerIcon}>
          <Animated.Text style={[styles.iconEmoji, { opacity: pulseAnim }]}>
            {MESSAGES[messageIndex].icon}
          </Animated.Text>
        </View>
      </View>

      {/* Message */}
      <Animated.Text style={[styles.message, { opacity: fadeAnim }]}>
        {MESSAGES[messageIndex].text}
      </Animated.Text>

      {/* Exercise name */}
      <Text style={styles.exerciseName}>{exerciseName}</Text>

      {/* Progress dots */}
      <View style={styles.dots}>
        {MESSAGES.map((msg, i) => (
          <View
            key={msg.text}
            style={[
              styles.dot,
              i === messageIndex && styles.dotActive,
              i < messageIndex && styles.dotCompleted,
            ]}
          />
        ))}
      </View>

      {/* Tip */}
      <Text style={styles.tip}>This usually takes 5-15 seconds</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing["4xl"],
  },

  // Scan area
  scanArea: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.bg.tertiary,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: spacing["4xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  scanLine: {
    position: "absolute",
    width: "100%",
    height: 2,
    backgroundColor: colors.accent.primary,
    opacity: 0.6,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  pulseCircle: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent.primary,
    opacity: 0.05,
  },
  centerIcon: {
    zIndex: 1,
  },
  iconEmoji: {
    fontSize: 32,
  },

  // Text
  message: {
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
    textAlign: "center",
    letterSpacing: 1,
  },
  exerciseName: {
    fontFamily: "Rajdhani",
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },

  // Dots
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: spacing["4xl"],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text.muted,
  },
  dotActive: {
    backgroundColor: colors.accent.primary,
    width: 18,
  },
  dotCompleted: {
    backgroundColor: colors.accent.primary,
    opacity: 0.3,
  },

  // Tip
  tip: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: spacing["2xl"],
    letterSpacing: 0.3,
  },
})
