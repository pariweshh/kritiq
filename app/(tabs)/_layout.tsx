/**
 * Tab Layout
 * Two tabs: Home (analyze) and History (past results)
 * Custom styled tab bar to match dark cyber aesthetic.
 */

import { colors, typography } from "@/constants/theme"
import { Ionicons } from "@expo/vector-icons"
import { Tabs } from "expo-router"
import { Platform, StyleSheet, View } from "react-native"

const AnalyzeTabIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={styles.iconWrap}>
    <Ionicons name="fitness-outline" size={size} color={color} />
  </View>
)

const ProgressTabIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="stats-chart-outline" size={size} color={color} />
)

const HistoryTabIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="time-outline" size={size} color={color} />
)

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Analyze",
          tabBarIcon: AnalyzeTabIcon,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ProgressTabIcon,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: HistoryTabIcon,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg.secondary,
    borderTopColor: colors.border.default,
    borderTopWidth: 1,
    height: Platform.OS === "ios" ? 88 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 28 : 8,
  },
  tabLabel: {
    fontFamily: typography.fonts.label,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  tabItem: {
    paddingTop: 4,
  },
  iconWrap: {
    // Can add glow effect to active icon later
  },
})
