/**
 * Root Layout
 * Loads fonts, handles splash screen, sets up navigation.
 * Includes onboarding as a separate route group.
 */

import { colors } from "@/constants/theme"
import { cleanupOrphanRecordings } from "@/services/privacy"
import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Orbitron: require("@/assets/fonts/Orbitron.ttf"),
    Rajdhani: require("@/assets/fonts/Rajdhani-SemiBold.ttf"),
    "Rajdhani-Bold": require("@/assets/fonts/Rajdhani-Bold.ttf"),
    SpaceMono: require("@/assets/fonts/SpaceMono-Regular.ttf"),
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
      </Stack>
    </GestureHandlerRootView>
  )
}
