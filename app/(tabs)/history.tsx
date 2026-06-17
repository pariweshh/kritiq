/**
 * History Screen
 * Shows past form analyses with scores and exercise type.
 */

import {
  borderRadius,
  colors,
  getMetricColor,
  spacing,
  typography,
} from "@/constants/theme"
import type { AnalysisResult } from "@/constants/types"
import { getHistory } from "@/services/storage"
import { Ionicons } from "@expo/vector-icons"
import { format } from "date-fns"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

const Separator = () => <View style={styles.separator} />

export default function HistoryScreen() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      getHistory().then((data) => {
        setAnalyses(data)
        setLoading(false)
      })
    }, []),
  )

  const handlePress = (analysis: AnalysisResult) => {
    router.push({
      pathname: "/result/[id]",
      params: { id: analysis.id, data: JSON.stringify(analysis) },
    })
  }

  const renderItem = ({ item }: { item: AnalysisResult }) => {
    const scoreColor = getMetricColor(item.overallScore)

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.exerciseName}>{item.exerciseName}</Text>
          <Text style={styles.dateText}>
            {format(new Date(item.timestamp), "MMM d, yyyy • h:mm a")}
          </Text>
          <View style={[styles.tierBadge, { borderColor: scoreColor + "30" }]}>
            <Text style={[styles.tierText, { color: scoreColor }]}>
              {item.tier}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {item.overallScore.toFixed(1)}
          </Text>
          <Text style={styles.outOf}>/10</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.text.muted}
          style={styles.chevron}
        />
      </TouchableOpacity>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="barbell-outline" size={48} color={colors.text.muted} />
      <Text style={styles.emptyTitle}>No analyses yet</Text>
      <Text style={styles.emptySubtitle}>
        Record or upload a video of your lift{"\n"}to get your first form score.
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        <Text style={styles.headerCount}>
          {analyses.length} {analyses.length === 1 ? "analysis" : "analyses"}
        </Text>
      </View>

      <FlatList
        data={analyses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={loading ? null : renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={Separator}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: spacing["3xl"],
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontFamily: "Orbitron",
    fontSize: 20,
    color: colors.text.primary,
    letterSpacing: 2,
  },
  headerCount: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: spacing["3xl"],
    paddingBottom: 40,
    flexGrow: 1,
  },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cardLeft: {
    flex: 1,
  },
  exerciseName: {
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  dateText: {
    fontFamily: "SpaceMono",
    fontSize: 9,
    color: colors.text.muted,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  tierBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  tierText: {
    fontFamily: "Rajdhani",
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  cardRight: {
    alignItems: "flex-end",
    marginRight: spacing.sm,
  },
  scoreText: {
    fontFamily: "Orbitron",
    fontSize: 28,
    fontWeight: "700",
  },
  outOf: {
    fontFamily: "Rajdhani",
    fontSize: 11,
    color: colors.text.muted,
    letterSpacing: 1,
  },
  chevron: {
    marginLeft: 4,
  },
  separator: {
    height: spacing.md,
  },

  // Empty
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
  },
  emptyTitle: {
    fontFamily: "Rajdhani-Bold",
    fontSize: typography.sizes.xl,
    color: colors.text.secondary,
    marginTop: spacing.lg,
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
})
