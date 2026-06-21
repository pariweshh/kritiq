/**
 * Root Index
 * Branded splash + entry point — shows the Kritiq wordmark while it resolves
 * onboarding state, then redirects to the app or onboarding.
 */

import { colors, spacing, typography } from "@/constants/theme"
import { getUserState } from "@/services/storage"
import { useRouter } from "expo-router"
import { useEffect } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"

/**
 * Minimum time the branded splash stays up so the brand registers, even when
 * the onboarding-state read resolves almost instantly.
 */
const MIN_SPLASH_MS = 1000

export default function RootIndex() {
  const router = useRouter()

  useEffect(() => {
    let active = true

    async function resolveDestination() {
      const minHold = new Promise<void>((resolve) =>
        setTimeout(resolve, MIN_SPLASH_MS),
      )

      let onboarded = false
      try {
        const state = await getUserState()
        onboarded = state.onboardingComplete
      } catch {
        // Storage failed — fall through to onboarding.
      }

      await minHold
      if (active) router.replace(onboarded ? "/(tabs)" : "/onboarding")
    }

    resolveDestination()
    return () => {
      active = false
    }
  }, [router])

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.wordmark}>
          KRIT<Text style={styles.wordmarkAccent}>IQ</Text>
        </Text>
        <Text style={styles.tagline}>AI RATES YOUR FORM</Text>
      </View>
      <ActivityIndicator
        color={colors.accent.primary}
        size="small"
        style={styles.loader}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  brand: {
    alignItems: "center",
  },
  wordmark: {
    fontFamily: typography.fonts.display,
    fontSize: 34,
    color: colors.text.primary,
    letterSpacing: 6,
  },
  wordmarkAccent: {
    color: colors.accent.primary,
  },
  tagline: {
    fontFamily: typography.fonts.label,
    fontSize: 12,
    color: colors.text.muted,
    letterSpacing: 4,
    marginTop: spacing.sm,
  },
  loader: {
    position: "absolute",
    bottom: 64,
  },
})
