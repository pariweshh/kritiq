/**
 * Paywall Screen
 * Premium upgrade flow. The real IAP lives in `services/purchases` (RevenueCat);
 * this screen renders the live offerings and drives purchase/restore through it.
 * `UserState.isPremium` is kept synced to the "pro" entitlement by the wrapper,
 * so the movement gate just reads that mirror.
 */

import { LEGAL_URLS } from "@/constants/legal"
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from "@/constants/theme"
import {
  getProPackages,
  isUserCancelled,
  purchaseProPackageById,
  restorePro,
  type ProPackage,
} from "@/services/purchases"
import { getHistory } from "@/services/storage"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

const FEATURES = [
  { icon: "infinite-outline" as const, text: "Unlimited form analyses" },
  { icon: "analytics-outline" as const, text: "Detailed metric breakdowns" },
  { icon: "time-outline" as const, text: "Full progress history" },
  { icon: "barbell-outline" as const, text: "All exercises unlocked" },
  { icon: "share-outline" as const, text: "Premium score card designs" },
]

function getTrialSubtitle(count: number): string {
  if (count >= 10) {
    return `${count} analyses logged. That kind of consistency is what separates good from great.`
  }
  if (count >= 4) {
    return `You've put in ${count} analyses — you're building real momentum.`
  }
  return "You've started building better form. Keep going."
}

/** "Save X%" for a yearly plan vs paying monthly for a year. "" when N/A. */
function savingsLabel(packages: ProPackage[], pkg: ProPackage): string {
  if (pkg.period !== "/year") return ""
  const monthly = packages.find((p) => p.period === "/month")
  if (!monthly || monthly.price <= 0) return ""
  const pct = Math.round((1 - pkg.price / (monthly.price * 12)) * 100)
  return pct > 0 ? `Save ${pct}%` : ""
}

export default function PaywallScreen() {
  const router = useRouter()
  const [packages, setPackages] = useState<ProPackage[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [loadingOffers, setLoadingOffers] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [analysisCount, setAnalysisCount] = useState(0)

  useEffect(() => {
    getHistory()
      .then((history) => setAnalysisCount(history.length))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    getProPackages()
      .then((pkgs) => {
        if (!active) return
        setPackages(pkgs)
        // Default to the yearly plan (best value) when present.
        const annual = pkgs.find((p) => p.period === "/year")
        setSelectedPackageId((annual ?? pkgs[0])?.id ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingOffers(false)
      })
    return () => {
      active = false
    }
  }, [])

  const selected = packages.find((p) => p.id === selectedPackageId) ?? null
  const canPurchase = selected !== null && !purchasing

  const handlePurchase = async () => {
    if (!selectedPackageId) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setPurchasing(true)

    try {
      const isPro = await purchaseProPackageById(selectedPackageId)
      if (isPro) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert(
          "Welcome to Pro! 🎉",
          "You now have unlimited form analyses.",
          [{ text: "Let's Go", onPress: () => router.back() }],
        )
      } else {
        // Purchase completed but no active "pro" entitlement — unusual.
        Alert.alert(
          "Almost there",
          "Your purchase didn't unlock Pro. Try Restore Purchases, or contact support if it persists.",
        )
      }
    } catch (error) {
      if (isUserCancelled(error)) {
        // User backed out of the native sheet — no error UI.
        return
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert(
        "Purchase Failed",
        "Please try again. If the problem persists, contact support.",
      )
    } finally {
      setPurchasing(false)
    }
  }

  const handleRestore = async () => {
    try {
      const isPro = await restorePro()
      if (isPro) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert("Purchases Restored", "Welcome back to Pro!", [
          { text: "Let's Go", onPress: () => router.back() },
        ])
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

  const openLegal = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url)
    } catch {
      Alert.alert("Couldn't Open Page", "Please try again later.")
    }
  }

  return (
    <View style={styles.container}>
      {/* Close */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={22} color={colors.text.secondary} />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="diamond" size={28} color={colors.accent.primary} />
        </View>
        <Text style={styles.title}>
          KRIT<Text style={styles.titleAccent}>IQ</Text> PRO
        </Text>
        <Text style={styles.subtitle}>{getTrialSubtitle(analysisCount)}</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {FEATURES.map((feature) => (
          <View key={feature.text} style={styles.featureRow}>
            <Ionicons
              name={feature.icon}
              size={18}
              color={colors.accent.primary}
            />
            <Text style={styles.featureText}>{feature.text}</Text>
          </View>
        ))}
      </View>

      {/* Plan Selection */}
      <View style={styles.plans}>
        {loadingOffers ? (
          <ActivityIndicator
            color={colors.accent.primary}
            style={styles.plansLoader}
          />
        ) : packages.length === 0 ? (
          <Text style={styles.unavailable}>
            Subscriptions are temporarily unavailable. Please try again later.
          </Text>
        ) : (
          packages.map((plan) => {
            const isSelected = selectedPackageId === plan.id
            const saving = savingsLabel(packages, plan)

            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setSelectedPackageId(plan.id)
                }}
                activeOpacity={0.7}
              >
                {isSelected && <View style={styles.planGlow} />}

                <View style={styles.planLeft}>
                  <View
                    style={[styles.radio, isSelected && styles.radioSelected]}
                  >
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.planLabel,
                        isSelected && styles.planLabelSelected,
                      ]}
                    >
                      {plan.label}
                    </Text>
                    {saving ? (
                      <Text style={styles.savings}>{saving}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.planRight}>
                  <Text
                    style={[
                      styles.planPrice,
                      isSelected && styles.planPriceSelected,
                    ]}
                  >
                    {plan.priceString}
                  </Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </View>

      {/* Purchase Button */}
      <TouchableOpacity
        style={styles.purchaseBtn}
        onPress={handlePurchase}
        disabled={!canPurchase}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={canPurchase ? ["#00FF88", "#00DDAA"] : ["#333", "#222"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.purchaseGradient}
        >
          <Text style={[styles.purchaseText, !canPurchase && { color: "#666" }]}>
            {purchasing
              ? "Processing..."
              : selected
                ? `Start Pro — ${selected.priceString}${selected.period}`
                : "Currently Unavailable"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Auto-renew disclosure (App Store Guideline 3.1.2) */}
      <Text style={styles.disclosure}>
        Kritiq Pro auto-renews at the price shown above until canceled. Cancel
        anytime in your App Store settings at least 24 hours before renewal.
        Payment is charged to your Apple ID at confirmation of purchase.
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleRestore}>
          <Text style={styles.footerLink}>Restore Purchases</Text>
        </TouchableOpacity>
        <Text style={styles.footerDivider}>•</Text>
        <TouchableOpacity onPress={() => openLegal(LEGAL_URLS.terms)}>
          <Text style={styles.footerLink}>Terms</Text>
        </TouchableOpacity>
        <Text style={styles.footerDivider}>•</Text>
        <TouchableOpacity onPress={() => openLegal(LEGAL_URLS.privacy)}>
          <Text style={styles.footerLink}>Privacy</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: spacing["3xl"],
    paddingTop: Platform.OS === "ios" ? 56 : 32,
  },

  closeBtn: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.elevated,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing["4xl"],
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accent.muted,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent.border,
  },
  title: {
    fontFamily: "Orbitron",
    fontSize: 22,
    color: colors.text.primary,
    letterSpacing: 3,
  },
  titleAccent: {
    color: colors.accent.primary,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  // Features
  features: {
    marginBottom: spacing["4xl"],
    gap: spacing.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  featureText: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },

  // Plans
  plans: {
    gap: spacing.md,
    marginBottom: spacing["2xl"],
  },
  plansLoader: {
    paddingVertical: spacing["2xl"],
  },
  unavailable: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: "center",
    paddingVertical: spacing.xl,
    lineHeight: 20,
  },
  planCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
  },
  planCardSelected: {
    borderColor: colors.accent.border,
    backgroundColor: colors.accent.muted,
  },
  planGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent.primary,
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: colors.accent.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent.primary,
  },
  planLabel: {
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
    letterSpacing: 1,
  },
  planLabelSelected: {
    color: colors.text.primary,
  },
  savings: {
    fontFamily: "Rajdhani",
    fontSize: 11,
    color: colors.accent.primary,
    letterSpacing: 1,
    marginTop: 2,
  },
  planRight: {
    alignItems: "flex-end",
  },
  planPrice: {
    fontFamily: "Orbitron",
    fontSize: typography.sizes.xl,
    color: colors.text.secondary,
  },
  planPriceSelected: {
    color: colors.text.primary,
  },
  planPeriod: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    color: colors.text.muted,
    letterSpacing: 0.5,
  },

  // Purchase
  purchaseBtn: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    ...shadows.button,
  },
  purchaseGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  purchaseText: {
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.lg,
    color: "#000",
    letterSpacing: 1,
  },

  // Disclosure
  disclosure: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: spacing.lg,
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  footerLink: {
    fontSize: 11,
    color: colors.text.muted,
  },
  footerDivider: {
    color: colors.text.muted,
    fontSize: 11,
  },
})
