/**
 * Analyze Screen
 * 1. Record a video or pick from camera roll
 * 2. Send to Gemini AI via useAnalysis hook
 * 3. Show AnalyzingOverlay while processing
 * 4. Navigate to result screen with the score
 */

import AnalyzingOverlay from "@/components/AnalyzingOverlay"
import config from "@/constants/config"
import { getExerciseById } from "@/constants/exercises"
import { borderRadius, colors, spacing, typography } from "@/constants/theme"
import { useAnalysis } from "@/hooks/useAnalysis"
import { deleteQuietly } from "@/services/privacy"
import { Ionicons } from "@expo/vector-icons"
import { CameraView, useCameraPermissions } from "expo-camera"
import * as Haptics from "expo-haptics"
import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useRef, useState } from "react"
import {
  Alert,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export default function AnalyzeScreen() {
  const router = useRouter()
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>()
  const exercise = getExerciseById(exerciseId || "squat")

  const [permission, requestPermission] = useCameraPermissions()
  const [isRecording, setIsRecording] = useState(false)
  const cameraRef = useRef<CameraView>(null)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const recordStartRef = useRef(0)

  const { analyze, isAnalyzing, reset } = useAnalysis()

  const fallbackDurationMs = config.analysis.maxVideoDurationSeconds * 1000

  // ---- Core: Run analysis (on-device for every supported movement) ----
  // `isCameraRecording` distinguishes the two call sites: a camera clip lives in
  // our sandbox and is deleted right after analysis (privacy lock), while a
  // picked clip is the user's own library file and must NEVER be deleted.
  const runAnalysis = async (
    videoUri: string,
    durationMs: number,
    isCameraRecording: boolean,
  ) => {
    try {
      const { result, newBest, error: analysisError } = await analyze(
        videoUri,
        exerciseId || "squat",
        durationMs > 0 ? durationMs : fallbackDurationMs,
      )

      if (result) {
        router.replace({
          pathname: "/result/[id]",
          params: {
            id: result.id,
            data: JSON.stringify(result),
            // Fresh-analysis-only: drives the "New Personal Best" reveal. History
            // navigation omits these, so the badge only ever shows on a new score.
            pb: newBest.overall ? "1" : "0",
            pbMetrics: newBest.metrics.join(","),
          },
        })
      } else if (analysisError) {
        Alert.alert("Analysis Failed", analysisError, [
          { text: "Try Again", onPress: reset },
          { text: "Go Back", onPress: () => router.back() },
        ])
      }
    } finally {
      // Record-then-delete: remove the sandbox recording once it's been read,
      // on success OR failure. Camera path only.
      if (isCameraRecording) {
        deleteQuietly(videoUri)
      }
    }
  }

  // ---- Record Video ----
  const handleRecord = async () => {
    if (!cameraRef.current) return

    if (isRecording) {
      cameraRef.current.stopRecording()
      setIsRecording(false)
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setIsRecording(true)

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start()

    try {
      recordStartRef.current = Date.now()
      const video = await cameraRef.current.recordAsync({
        maxDuration: config.analysis.maxVideoDurationSeconds,
      })

      pulseAnim.stopAnimation()
      setIsRecording(false)

      if (video?.uri) {
        await runAnalysis(video.uri, Date.now() - recordStartRef.current, true)
      }
    } catch {
      pulseAnim.stopAnimation()
      setIsRecording(false)
    }
  }

  // ---- Pick from Gallery ----
  const handlePickVideo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: config.analysis.videoQuality,
      videoMaxDuration: config.analysis.maxVideoDurationSeconds,
    })

    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0]
      await runAnalysis(asset.uri, asset.duration ?? fallbackDurationMs, false)
    }
  }

  // ---- Analyzing State → Premium Overlay ----
  if (isAnalyzing) {
    return <AnalyzingOverlay exerciseName={exercise?.name || "Exercise"} />
  }

  // ---- Permission Not Granted ----
  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons
          name="videocam-off-outline"
          size={48}
          color={colors.text.muted}
        />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>
          Kritiq needs camera access to record your exercise form for analysis.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
        >
          <Text style={styles.permissionBtnText}>Grant Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadOnly} onPress={handlePickVideo}>
          <Text style={styles.uploadOnlyText}>
            Or upload from gallery instead
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={16} color={colors.text.muted} />
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ---- Camera View ----
  return (
    <View style={styles.container}>
      {/* Camera — no children allowed */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        mode="video"
      />

      {/* UI Overlay — positioned on top of camera */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.exerciseBadge}>
            <Text style={styles.exerciseBadgeText}>
              {exercise?.icon} {exercise?.shortName || "Exercise"}
            </Text>
          </View>

          <View style={styles.placeholder} />
        </View>

        {/* Spacer to push content apart */}
        <View style={styles.middleSection}>
          {/* Tips overlay */}
          {!isRecording && exercise && (
            <View style={styles.tipsOverlay}>
              <Text style={styles.tipsHeader}>📐 Camera Tips</Text>
              {exercise.tips.map((tip, i) => (
                <Text key={tip} style={styles.tipOverlayText}>
                  • {tip}
                </Text>
              ))}
            </View>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>REC</Text>
            </View>
          )}
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={handlePickVideo}
            disabled={isRecording}
          >
            <Ionicons
              name="images-outline"
              size={24}
              color={isRecording ? "#333" : "#fff"}
            />
            <Text
              style={[styles.sideBtnText, isRecording && { color: "#333" }]}
            >
              Upload
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRecord} activeOpacity={0.7}>
            <Animated.View
              style={[
                styles.recordBtn,
                isRecording && styles.recordBtnActive,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              {isRecording ? (
                <View style={styles.stopSquare} />
              ) : (
                <View style={styles.recordInner} />
              )}
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.sideBtn}>
            <Text style={styles.maxDuration}>
              {config.analysis.maxVideoDurationSeconds}s max
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  middleSection: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 20,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 32,
    paddingHorizontal: spacing.xl,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  exerciseBadgeText: {
    fontFamily: typography.fonts.label,
    fontSize: 13,
    color: "#fff",
    letterSpacing: 1,
  },
  placeholder: { width: 40 },

  tipsOverlay: {
    marginHorizontal: spacing.xl,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tipsHeader: {
    fontFamily: typography.fonts.label,
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1,
    marginBottom: 6,
  },
  tipOverlayText: {
    fontFamily: typography.fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 20,
  },

  recordingIndicator: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,0,0,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: "auto" as any,
    marginTop: spacing.lg,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF0000",
  },
  recordingText: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    color: "#FF4444",
    letterSpacing: 2,
  },

  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingHorizontal: spacing.xl,
  },
  sideBtn: { width: 60, alignItems: "center", gap: 4 },
  sideBtnText: {
    fontFamily: typography.fonts.label,
    fontSize: 10,
    color: "#fff",
    textAlign: "center",
  },
  maxDuration: { fontFamily: typography.fonts.mono, fontSize: 9, color: "#555" },

  recordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  recordBtnActive: { borderColor: "#FF4444" },
  recordInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent.primary,
  },
  stopSquare: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: "#FF4444",
  },

  permissionContainer: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing["4xl"],
  },
  permissionTitle: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
    marginTop: spacing.xl,
    letterSpacing: 1,
  },
  permissionText: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  permissionBtn: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    marginTop: spacing["2xl"],
  },
  permissionBtnText: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.md,
    color: "#000",
    letterSpacing: 1,
  },
  uploadOnly: { marginTop: spacing.lg },
  uploadOnlyText: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.accent.primary,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing["2xl"],
  },
  backBtnText: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
  },
})
