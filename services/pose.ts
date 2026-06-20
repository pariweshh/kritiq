/**
 * On-device pose estimation service (MoveNet SinglePose Thunder via
 * react-native-fast-tflite).
 *
 * fast-tflite's normal loader (`loadTensorflowModel`) routes through its Swift
 * `AssetLoader` HybridObject, which returns `undefined` on this build (Expo SDK
 * 55 / RN 0.83 New Arch — Swift Nitro HybridObjects are broken here while C++
 * ones work). So we bypass it: read the model bytes in JS and hand them straight
 * to the C++ `TfliteModule.createModel`. Verified on device 2026-06-20.
 *
 * The model wants a 256×256 float32 tensor with pixel values in [0,255] (NOT
 * normalized). We letterbox (preserve aspect) so joint angles stay undistorted,
 * then map keypoints back into original-image normalized space.
 */

import { File } from "expo-file-system"
import * as ImageManipulator from "expo-image-manipulator"
import type { TensorflowModel } from "react-native-fast-tflite"
import { NitroModules } from "react-native-nitro-modules"

import {
  computeLetterbox,
  mapToOriginal,
  type Letterbox,
} from "@/lib/pose/transform"
import { KEYPOINT_NAMES, type Keypoint, type Pose } from "@/lib/pose/types"

const INPUT_SIZE = 256 // MoveNet SinglePose Thunder expects 256×256

// jpeg-js ships no types; describe only the slice we use.
const jpeg = require("jpeg-js") as {
  decode: (
    data: Uint8Array,
    opts?: { useTArray?: boolean },
  ) => { width: number; height: number; data: Uint8Array }
}

// The C++ TfliteModule HybridObject (createModel works; the Swift AssetLoader does not).
interface TfliteModuleLike {
  createModel(modelData: ArrayBuffer, delegates: string[]): TensorflowModel
}

export interface PoseFrame {
  readonly uri: string
  readonly width: number
  readonly height: number
}

let cachedModel: TensorflowModel | null = null

export async function loadPoseModel(): Promise<TensorflowModel> {
  if (cachedModel) {
    return cachedModel
  }
  const { Asset } = require("expo-asset") as typeof import("expo-asset")
  const asset = Asset.fromModule(
    require("../assets/models/movenet_thunder.tflite"),
  )
  await asset.downloadAsync()
  const localUri = asset.localUri ?? asset.uri

  const bytes = await new File(localUri).bytes()
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer

  const tfliteModule = NitroModules.createHybridObject(
    "TfliteModule",
  ) as unknown as TfliteModuleLike
  cachedModel = tfliteModule.createModel(buffer, []) // [] = default CPU delegate
  return cachedModel
}

// Decode standard base64 (no atob dependency) to raw bytes.
function base64ToBytes(b64: string): Uint8Array {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  const lookup = new Uint8Array(256)
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i
  }
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

type InputArray = Float32Array | Int32Array | Uint8Array

function makeInputArray(dataType: string, length: number): InputArray {
  if (dataType === "float32" || dataType === "float16") {
    return new Float32Array(length)
  }
  if (dataType === "int32") {
    return new Int32Array(length)
  }
  return new Uint8Array(length)
}

interface InputTensor {
  readonly data: InputArray
  readonly letterbox: Letterbox
}

async function frameToInputTensor(
  frame: PoseFrame,
  dataType: string,
): Promise<InputTensor> {
  const letterbox = computeLetterbox(frame.width, frame.height, INPUT_SIZE)

  const resized = await ImageManipulator.manipulateAsync(
    frame.uri,
    [{ resize: { width: letterbox.drawW, height: letterbox.drawH } }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  )
  const rgba = jpeg.decode(base64ToBytes(resized.base64 ?? ""), {
    useTArray: true,
  }).data

  // Pad the aspect-preserved content into a zero-filled INPUT_SIZE² RGB tensor.
  const data = makeInputArray(dataType, INPUT_SIZE * INPUT_SIZE * 3)
  for (let row = 0; row < letterbox.drawH; row++) {
    for (let col = 0; col < letterbox.drawW; col++) {
      const src = (row * letterbox.drawW + col) * 4
      const dst = ((row + letterbox.padY) * INPUT_SIZE + (col + letterbox.padX)) * 3
      data[dst] = rgba[src]
      data[dst + 1] = rgba[src + 1]
      data[dst + 2] = rgba[src + 2]
    }
  }
  return { data, letterbox }
}

export async function estimatePose(frame: PoseFrame): Promise<Pose> {
  const model = await loadPoseModel()
  const dataType = model.inputs[0]?.dataType ?? "float32"
  const { data, letterbox } = await frameToInputTensor(frame, dataType)

  // Nitro runSync takes/returns raw ArrayBuffers.
  const outputs = model.runSync([data.buffer as ArrayBuffer])
  const raw = outputs[0] as ArrayBuffer | ArrayBufferView
  const out = ArrayBuffer.isView(raw)
    ? new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4)
    : new Float32Array(raw)

  const keypoints: Keypoint[] = KEYPOINT_NAMES.map((name, k) => {
    const yNorm = out[k * 3]
    const xNorm = out[k * 3 + 1]
    const score = out[k * 3 + 2]
    const { x, y } = mapToOriginal(xNorm, yNorm, letterbox)
    return { name, x, y, score }
  })
  const meanScore =
    keypoints.reduce((sum, kp) => sum + kp.score, 0) / keypoints.length

  return { keypoints, meanScore, aspectRatio: frame.width / frame.height }
}
