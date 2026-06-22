/**
 * Settings Screen
 * The app's account/admin surface: subscription (upgrade / manage / restore),
 * privacy & data controls (incl. a full local wipe), and About/legal links.
 * Reached from the gear in the Home header. No login exists — these are the
 * only account-level actions, and they're all on-device or via the App Store.
 */

import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "@/constants/theme"
import { LEGAL_URLS } from "@/constants/legal"
import { restorePro } from "@/services/purchases"
import { clearHistory, getUserState } from "@/services/storage"
import { Ionicons } from "@expo/vector-icons"
import Constants from "expo-constants"
import * as Haptics from "expo-haptics"
import { useFocusEffect, useRouter } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import { useCallback, useState } from "react"
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions"
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0"

type Trailing = "chevron" | "external" | "none"

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  subtitle?: string
  onPress?: () => void
  trailing?: Trailing
  destructive?: boolean
  isLast?: boolean
}

function SettingsRow({
  icon,
  label,
  subtitle,
  onPress,
  trailing = "chevron",
  destructive = false,
  isLast = false,
}: SettingsRowProps) {
  const tint = destructive ? colors.error : colors.accent.primary
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, destructive && { color: colors.error }]}>
          {label}
        </Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing === "chevron" && (
        <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
      )}
      {trailing === "external" && (
        <Ionicons name="open-outline" size={15} color={colors.text.muted} />
      )}
    </TouchableOpacity>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const [isPremium, setIsPremium] = useState(false)

  useFocusEffect(
    useCallback(() => {
      getUserState().then((state) => setIsPremium(state.isPremium))
    }, []),
  )

  const openUrl = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url)
    } catch {
      Alert.alert("Couldn't Open Page", "Please try again later.")
    }
  }

  const handleRestore = async () => {
    try {
      const isPro = await restorePro()
      if (isPro) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setIsPremium(true)
        Alert.alert("Purchases Restored", "Welcome back to Pro!")
      } else {
        Alert.alert("Restore", "No previous purchases found.")
      }
    } catch {
      Alert.alert(
        "Restore Failed",
        "Couldn't restore purchases. Please try again.",
      )
    }
  }

  const handleDeleteData = () => {
    Alert.alert(
      "Delete all data?",
      "This permanently clears your analysis history, scores and streaks on this device. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await clearHistory()
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            Alert.alert(
              "Data deleted",
              "Your history and progress have been cleared.",
            )
          },
        },
      ],
    )
  }

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.text.secondary}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Subscription */}
        <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
        <View style={styles.card}>
          {isPremium ? (
            <SettingsRow
              icon="diamond"
              label="Kritiq Pro active"
              subtitle="Manage or cancel in the App Store"
              trailing="external"
              onPress={() => openUrl(APPLE_SUBSCRIPTIONS_URL)}
            />
          ) : (
            <SettingsRow
              icon="diamond-outline"
              label="Unlock Kritiq Pro"
              subtitle="Unlimited analyses + all exercises"
              onPress={() => router.push("/paywall")}
            />
          )}
          <SettingsRow
            icon="refresh-outline"
            label="Restore purchases"
            trailing="none"
            onPress={handleRestore}
            isLast
          />
        </View>

        {/* Privacy & data */}
        <Text style={styles.sectionLabel}>PRIVACY & DATA</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy & data"
            subtitle="How your video and data are handled"
            onPress={() => router.push("/privacy")}
          />
          <SettingsRow
            icon="trash-outline"
            label="Delete all data"
            subtitle="Clears history, scores & streaks"
            trailing="none"
            destructive
            onPress={handleDeleteData}
            isLast
          />
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="document-text-outline"
            label="Terms of Service"
            trailing="external"
            onPress={() => openUrl(LEGAL_URLS.terms)}
          />
          <SettingsRow
            icon="lock-closed-outline"
            label="Privacy Policy"
            trailing="external"
            onPress={() => openUrl(LEGAL_URLS.privacy)}
            isLast
          />
        </View>

        <Text style={styles.version}>Kritiq v{APP_VERSION}</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "ios" ? 56 : 32,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    padding: spacing.sm,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    color: colors.text.primary,
    letterSpacing: 2,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing["3xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing["5xl"],
  },

  // Sections
  sectionLabel: {
    fontFamily: typography.fonts.label,
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    letterSpacing: 3,
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  rowSubtitle: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  // Version
  version: {
    fontFamily: typography.fonts.mono,
    fontSize: 11,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: spacing["3xl"],
    letterSpacing: 0.5,
  },
})
