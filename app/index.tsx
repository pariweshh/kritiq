/**
 * Root Index
 * Entry point — checks if onboarding is complete and redirects accordingly.
 */

import { colors } from "@/constants/theme"
import { getUserState } from "@/services/storage"
import { useRouter } from "expo-router"
import { useEffect } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"

export default function RootIndex() {
  const router = useRouter()

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const state = await getUserState()
        if (state.onboardingComplete) {
          router.replace("/(tabs)")
        } else {
          router.replace("/onboarding")
        }
      } catch {
        // If storage fails, show onboarding
        router.replace("/onboarding")
      }
    }

    checkOnboarding()
  }, [router])

  // Brief loading while we check state
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent.primary} size="small" />
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
})
