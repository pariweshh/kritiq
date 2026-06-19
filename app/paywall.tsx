/**
 * Paywall Screen
 * Premium upgrade flow.
 * RevenueCat handles the actual IAP — this is the UI.
 *
 * TODO: Wire up RevenueCat SDK once accounts are set up.
 * For now, includes placeholder purchase logic.
 */

import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from "@/constants/theme"
import { getHistory, setPremiumStatus } from "@/services/storage"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

type PlanType = "monthly" | "yearly"

const PLANS = {
  monthly: { price: "$4.99", period: "/month", savings: "" },
  yearly: { price: "$29.99", period: "/year", savings: "Save 50%" },
} as const

const FEATURES = [
  { icon: "infinite-outline" as const, text: "Unlimited form analyses" },
  { icon: "analytics-outline" as const, text: "Detailed metric breakdowns" },
  { icon: "time-outline" as const, text: "Full progress history" },
  { icon: "barbell-outline" as const, text: "All exercises unlocked" },
  { icon: "share-outline" as const, text: "Premium score card designs" },
]

function getTrialSubtitle(count: number): string {
  if (count >= 10) {
    return `${count} analyses in 3 days. That kind of consistency is what separates good from great.`
  }
  if (count >= 4) {
    return `You've put in ${count} analyses — you're building real momentum.`
  }
  return "You've started building better form. Keep going."
}

export default function PaywallScreen() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly")
  const [purchasing, setPurchasing] = useState(false)
  const [analysisCount, setAnalysisCount] = useState(0)

  useEffect(() => {
    getHistory()
      .then((history) => setAnalysisCount(history.length))
      .catch(() => {})
  }, [])

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setPurchasing(true)

    try {
      // TODO: Replace with RevenueCat purchase flow:
      // import Purchases from 'react-native-purchases';
      // const { customerInfo } = await Purchases.purchasePackage(package);
      // const isPremium = customerInfo.entitlements.active['pro'] !== undefined;

      // Placeholder — simulate purchase
      // Remove this and wire RevenueCat before launch
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await setPremiumStatus(true)

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert(
        "Welcome to Pro! 🎉",
        "You now have unlimited form analyses.",
        [{ text: "Let's Go", onPress: () => router.back() }],
      )
    } catch (error) {
      console.error("Purchase error:", error)
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
    // TODO: Purchases.restorePurchases()
    Alert.alert("Restore", "No previous purchases found.")
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
        {(Object.keys(PLANS) as PlanType[]).map((plan) => {
          const isSelected = selectedPlan === plan
          const planData = PLANS[plan]

          return (
            <TouchableOpacity
              key={plan}
              style={[styles.planCard, isSelected && styles.planCardSelected]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setSelectedPlan(plan)
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
                    {plan === "yearly" ? "Yearly" : "Monthly"}
                  </Text>
                  {planData.savings ? (
                    <Text style={styles.savings}>{planData.savings}</Text>
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
                  {planData.price}
                </Text>
                <Text style={styles.planPeriod}>{planData.period}</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Purchase Button */}
      <TouchableOpacity
        style={styles.purchaseBtn}
        onPress={handlePurchase}
        disabled={purchasing}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={purchasing ? ["#333", "#222"] : ["#00FF88", "#00DDAA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.purchaseGradient}
        >
          <Text style={[styles.purchaseText, purchasing && { color: "#666" }]}>
            {purchasing
              ? "Processing..."
              : `Start Pro — ${PLANS[selectedPlan].price}${PLANS[selectedPlan].period}`}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleRestore}>
          <Text style={styles.footerLink}>Restore Purchases</Text>
        </TouchableOpacity>
        <Text style={styles.footerDivider}>•</Text>
        <TouchableOpacity>
          <Text style={styles.footerLink}>Terms</Text>
        </TouchableOpacity>
        <Text style={styles.footerDivider}>•</Text>
        <TouchableOpacity>
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
