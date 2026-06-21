/**
 * Privacy Screen
 * Privacy-as-a-visible-feature: surfaces the record-then-delete / on-device
 * model as a real destination, not just a comment. Reached from the Home footer
 * trust line. Wording is App-Privacy-label accurate: the VIDEO never leaves the
 * device, but anonymous joint-angle NUMBERS do (for the coaching headline) —
 * we never claim "nothing leaves your device".
 */

import { LEGAL_URLS } from "@/constants/legal"
import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "@/constants/theme"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

interface Pillar {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body: string
}

/** The three pillars of the privacy model, stated accurately. */
const PILLARS: Pillar[] = [
  {
    icon: "hardware-chip-outline",
    title: "Analyzed on your device",
    body: "Pose detection and your 0–100 form score are computed entirely on your phone.",
  },
  {
    icon: "trash-outline",
    title: "Recorded, then deleted",
    body: "Your video never leaves your device — it's deleted right after analysis.",
  },
  {
    icon: "stats-chart-outline",
    title: "Only numbers, never footage",
    body: "Just anonymous joint-angle measurements power your coaching tip. No video, images, or personal details ever leave your phone.",
  },
]

export default function PrivacyScreen() {
  const router = useRouter()

  const openPolicy = async () => {
    try {
      await WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)
    } catch {
      Alert.alert("Couldn't Open Page", "Please try again later.")
    }
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
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <View style={styles.iconGlow} />
            <View style={styles.iconWrap}>
              <Ionicons
                name="shield-checkmark"
                size={32}
                color={colors.accent.primary}
              />
            </View>
          </View>
          <Text style={styles.title}>Private by design</Text>
          <Text style={styles.subtitle}>
            Get scored on your form without giving up your footage.
          </Text>
        </View>

        {/* Pillars */}
        <View style={styles.pillars}>
          {PILLARS.map((pillar) => (
            <View key={pillar.title} style={styles.pillarCard}>
              <View style={styles.pillarIcon}>
                <Ionicons
                  name={pillar.icon}
                  size={20}
                  color={colors.accent.primary}
                />
              </View>
              <View style={styles.pillarText}>
                <Text style={styles.pillarTitle}>{pillar.title}</Text>
                <Text style={styles.pillarBody}>{pillar.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Policy link */}
        <TouchableOpacity
          style={styles.policyLink}
          onPress={openPolicy}
          activeOpacity={0.7}
        >
          <Text style={styles.policyLinkText}>Read our full Privacy Policy</Text>
          <Ionicons
            name="open-outline"
            size={14}
            color={colors.accent.primary}
          />
        </TouchableOpacity>
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
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "ios" ? 56 : 32,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    padding: spacing.sm,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing["3xl"],
    paddingBottom: spacing["5xl"],
  },

  // Header
  header: {
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing["5xl"],
  },
  iconContainer: {
    position: "relative",
    marginBottom: spacing.xl,
  },
  iconGlow: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accent.primary,
    opacity: 0.06,
    top: -6,
    left: -6,
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
  title: {
    fontFamily: typography.fonts.heading,
    fontSize: 28,
    color: colors.text.primary,
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.md,
    color: colors.text.tertiary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },

  // Pillars
  pillars: {
    gap: spacing.md,
  },
  pillarCard: {
    flexDirection: "row",
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.lg,
  },
  pillarIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent.muted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accent.border,
  },
  pillarText: {
    flex: 1,
  },
  pillarTitle: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pillarBody: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  // Policy link
  policyLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing["3xl"],
    paddingVertical: spacing.md,
  },
  policyLinkText: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.sm,
    color: colors.accent.primary,
    letterSpacing: 1,
  },
})
