/**
 * Root Layout
 * Loads fonts, handles splash screen, sets up navigation.
 * Includes onboarding as a separate route group.
 */

import { colors } from "@/constants/theme"
import { cleanupOrphanRecordings } from "@/services/privacy"
import {
  addProEntitlementListener,
  configurePurchases,
  syncEntitlementToStorage,
} from "@/services/purchases"
import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // "Refined Performance Dark" type system — Barlow (athletic condensed
    // display + clean grotesk body). Screens reference these via the
    // typography.fonts tokens, never the family name directly.
    "BarlowCondensed-Bold": require("@/assets/fonts/BarlowCondensed-Bold.ttf"),
    "BarlowCondensed-SemiBold": require("@/assets/fonts/BarlowCondensed-SemiBold.ttf"),
    "BarlowCondensed-Medium": require("@/assets/fonts/BarlowCondensed-Medium.ttf"),
    "Barlow-Regular": require("@/assets/fonts/Barlow-Regular.ttf"),
    "Barlow-Medium": require("@/assets/fonts/Barlow-Medium.ttf"),
    "Barlow-SemiBold": require("@/assets/fonts/Barlow-SemiBold.ttf"),
    SpaceMono: require("@/assets/fonts/SpaceMono-Regular.ttf"),
    // Legacy faces — still loaded for screens not yet migrated to tokens.
    // Remove once every screen uses typography.fonts.
    Orbitron: require("@/assets/fonts/Orbitron.ttf"),
    Rajdhani: require("@/assets/fonts/Rajdhani-SemiBold.ttf"),
    "Rajdhani-Bold": require("@/assets/fonts/Rajdhani-Bold.ttf"),
  })

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  // Privacy: sweep any orphaned sandbox recordings left by a prior session that
  // was killed mid-analysis before its inline delete ran. Best-effort, on mount.
  useEffect(() => {
    cleanupOrphanRecordings()
  }, [])

  // Purchases: configure RevenueCat once, then keep the cached Pro entitlement
  // (UserState.isPremium, which the movement gate reads) synced to the live
  // "pro" entitlement. The listener fires on configure, every purchase/restore,
  // and on foreground refresh; the launch sync covers a lapse or a purchase made
  // on another device. Entitlement is the source of truth; isPremium mirrors it.
  useEffect(() => {
    configurePurchases()
    const removeListener = addProEntitlementListener()
    syncEntitlementToStorage()
    return removeListener
  }, [])

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg.primary },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding/index" options={{ animation: "fade" }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="analyze"
          options={{
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen name="result/[id]" options={{ animation: "fade" }} />
        <Stack.Screen
          name="paywall"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen name="privacy" />
      </Stack>
    </GestureHandlerRootView>
  )
}
