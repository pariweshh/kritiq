/**
 * TEMPORARY Phase 1 pose spike screen.
 *
 * Purpose: prove the on-device pipeline end to end on a physical device before
 * any scoring code is written:
 *   pick video -> extract one frame -> MoveNet (react-native-fast-tflite) -> 17 keypoints
 *
 * Nothing is uploaded or persisted. The picked video and extracted frame stay on
 * device. Delete this file once the spike is verified green.
 */

import { colors } from "@/constants/theme"
import * as ImageManipulator from "expo-image-manipulator"
import * as ImagePicker from "expo-image-picker"
import * as VideoThumbnails from "expo-video-thumbnails"
import { loadTensorflowModel } from "react-native-fast-tflite"
import { useState } from "react"
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

// jpeg-js ships no types; describe the slice we use.
const jpeg = require("jpeg-js") as {
  decode: (
    data: Uint8Array,
    opts?: { useTArray?: boolean },
  ) => { width: number; height: number; data: Uint8Array }
}

const INPUT_SIZE = 256 // MoveNet SinglePose Thunder expects 256x256

// COCO-17 keypoint order MoveNet returns.
const KEYPOINT_NAMES = [
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
] as const

interface Keypoint {
  name: string
  x: number
  y: number
  score: number
}

interface SpikeResult {
  modelIO: string
  frameUri: string
  keypoints: Keypoint[]
  meanScore: number
  inferenceMs: number
}

let cachedModel: Awaited<ReturnType<typeof loadTensorflowModel>> | null = null

async function getModel() {
  if (!cachedModel) {
    // fast-tflite's require()-based loader fails in dev: it resolves the model to
    // a Metro http URL and the native AssetLoader returns undefined for it.
    // Resolve to a concrete local file:// URI and pass that explicitly instead.
    const { Asset } = require("expo-asset") as typeof import("expo-asset")
    const asset = Asset.fromModule(
      require("../assets/models/movenet_thunder.tflite"),
    )
    await asset.downloadAsync()
    cachedModel = await loadTensorflowModel({
      url: asset.localUri ?? asset.uri,
    })
  }
  return cachedModel
}

// Decode standard base64 (no atob dependency) to raw bytes.
function base64ToBytes(b64: string): Uint8Array {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  const lookup = new Uint8Array(256)
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i

  const clean = b64.replace(/=+$/, "")
  const byteLength = Math.floor((clean.length * 3) / 4)
  const bytes = new Uint8Array(byteLength)

  let p = 0
  for (let i = 0; i < clean.length; i += 4) {
    const e1 = lookup[clean.charCodeAt(i)]
    const e2 = lookup[clean.charCodeAt(i + 1)]
    const e3 = lookup[clean.charCodeAt(i + 2)]
    const e4 = lookup[clean.charCodeAt(i + 3)]
    if (p < byteLength) bytes[p++] = (e1 << 2) | (e2 >> 4)
    if (p < byteLength) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2)
    if (p < byteLength) bytes[p++] = ((e3 & 3) << 6) | e4
  }
  return bytes
}

async function runSpike(): Promise<SpikeResult> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    quality: 1,
  })
  if (picked.canceled || !picked.assets?.[0]) {
    throw new Error("No video selected")
  }
  const videoUri = picked.assets[0].uri

  // One frame ~0.5s in is enough to validate the pipeline.
  const { uri: frameUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
    time: 500,
    quality: 1,
  })

  // Resize to the model input and read it back as base64 JPEG.
  const resized = await ImageManipulator.manipulateAsync(
    frameUri,
    [{ resize: { width: INPUT_SIZE, height: INPUT_SIZE } }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  )
  const rgba = jpeg.decode(base64ToBytes(resized.base64 ?? ""), {
    useTArray: true,
  }).data

  const model = await getModel()

  // Build the input tensor matching whatever dtype this model variant wants.
  const dt = model.inputs[0]?.dataType ?? "uint8"
  const n = INPUT_SIZE * INPUT_SIZE * 3
  const input =
    dt === "float32" || dt === "float16"
      ? new Float32Array(n)
      : dt === "int32"
        ? new Int32Array(n)
        : new Uint8Array(n)
  for (let i = 0, j = 0; j < n; i += 4, j += 3) {
    input[j] = rgba[i]
    input[j + 1] = rgba[i + 1]
    input[j + 2] = rgba[i + 2]
  }

  const t0 = Date.now()
  const outputs = model.runSync([input])
  const inferenceMs = Date.now() - t0
  const out = outputs[0] as Float32Array // [1,1,17,3] flattened = 51

  const keypoints: Keypoint[] = KEYPOINT_NAMES.map((name, k) => ({
    name,
    y: out[k * 3],
    x: out[k * 3 + 1],
    score: out[k * 3 + 2],
  }))
  const meanScore =
    keypoints.reduce((s, kp) => s + kp.score, 0) / keypoints.length

  const modelIO = `in ${dt} [${model.inputs[0]?.shape}] · out ${model.outputs[0]?.dataType} [${model.outputs[0]?.shape}]`

  return { modelIO, frameUri, keypoints, meanScore, inferenceMs }
}

export default function SpikeScreen() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SpikeResult | null>(null)

  const onRun = async () => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      setResult(await runSpike())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>POSE SPIKE</Text>
      <Text style={styles.subtitle}>
        Pick a video of a person. It runs MoveNet on one frame, fully on device.
      </Text>

      <TouchableOpacity
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={onRun}
        disabled={busy}
        activeOpacity={0.8}
      >
        {busy ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.buttonText}>PICK VIDEO + RUN</Text>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.error}>Error: {error}</Text>}

      {result && (
        <View style={styles.results}>
          <Text style={styles.io}>{result.modelIO}</Text>
          <Text style={styles.stat}>
            inference {result.inferenceMs} ms · mean score{" "}
            {result.meanScore.toFixed(3)}
          </Text>

          <Image source={{ uri: result.frameUri }} style={styles.frame} />

          {result.keypoints.map((kp) => (
            <View key={kp.name} style={styles.kpRow}>
              <Text style={styles.kpName}>{kp.name}</Text>
              <Text
                style={[
                  styles.kpScore,
                  {
                    color:
                      kp.score > 0.3 ? colors.accent.primary : colors.text.tertiary,
                  },
                ]}
              >
                {kp.score.toFixed(2)}
              </Text>
              <Text style={styles.kpXY}>
                x {kp.x.toFixed(2)} · y {kp.y.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: 24, paddingTop: 64, paddingBottom: 48 },
  title: {
    fontFamily: "Orbitron",
    fontSize: 22,
    color: colors.text.primary,
    letterSpacing: 3,
  },
  subtitle: {
    fontFamily: "Rajdhani",
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.accent.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontFamily: "Rajdhani-Bold",
    fontSize: 16,
    color: "#000",
    letterSpacing: 2,
  },
  error: {
    color: "#FF4444",
    fontFamily: "SpaceMono",
    fontSize: 13,
    marginTop: 20,
  },
  results: { marginTop: 24 },
  io: {
    fontFamily: "SpaceMono",
    fontSize: 11,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  stat: {
    fontFamily: "SpaceMono",
    fontSize: 12,
    color: colors.accent.primary,
    marginBottom: 16,
  },
  frame: {
    width: INPUT_SIZE,
    height: INPUT_SIZE,
    alignSelf: "center",
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: colors.bg.tertiary,
  },
  kpRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  kpName: {
    flex: 1,
    fontFamily: "Rajdhani",
    fontSize: 13,
    color: colors.text.secondary,
  },
  kpScore: {
    width: 52,
    fontFamily: "SpaceMono",
    fontSize: 13,
    textAlign: "right",
  },
  kpXY: {
    width: 130,
    fontFamily: "SpaceMono",
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: "right",
  },
})
