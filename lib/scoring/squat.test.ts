import { describe, expect, it } from "vitest"

import { scoreSquat } from "@/lib/scoring/squat"
import {
  KEYPOINT_NAMES,
  type Keypoint,
  type KeypointName,
  type Pose,
} from "@/lib/pose/types"

function buildPose(
  coords: Partial<Record<KeypointName, [number, number, number?]>>,
): Pose {
  const keypoints: Keypoint[] = KEYPOINT_NAMES.map((name) => {
    const c = coords[name]
    // Unset keypoints get score 0 so the populated side wins facing detection.
    return { name, x: c?.[0] ?? 0, y: c?.[1] ?? 0, score: c ? (c[2] ?? 0.9) : 0 }
  })
  const meanScore =
    keypoints.reduce((s, kp) => s + kp.score, 0) / keypoints.length
  return { keypoints, meanScore, aspectRatio: 1 }
}

// Deep, upright squat on the left side: knee at 90°, torso vertical.
const deepFrame = buildPose({
  left_shoulder: [0.5, 0.2],
  left_hip: [0.5, 0.4],
  left_knee: [0.5, 0.6],
  left_ankle: [0.7, 0.6],
})

// Nearly standing: knee almost straight.
const shallowFrame = buildPose({
  left_shoulder: [0.5, 0.1],
  left_hip: [0.5, 0.3],
  left_knee: [0.5, 0.6],
  left_ankle: [0.52, 0.9],
})

describe("scoreSquat", () => {
  it("gives a deep, upright squat full marks", () => {
    const result = scoreSquat([deepFrame])
    expect(result.side).toBe("left")
    expect(result.depth).toBe(100)
    expect(result.torso).toBe(100)
    expect(result.total).toBe(100)
    expect(result.lowConfidence).toBe(false)
  })

  it("scores a shallow squat low on depth", () => {
    const result = scoreSquat([shallowFrame])
    expect(result.depth).toBe(0)
    expect(result.total).toBeLessThan(scoreSquat([deepFrame]).total)
  })

  it("selects the deepest frame across a sequence", () => {
    const result = scoreSquat([shallowFrame, deepFrame, shallowFrame])
    expect(result.bottomKneeAngle).toBeCloseTo(90, 5)
    expect(result.depth).toBe(100)
  })

  it("flags low confidence when a scoring joint is weak", () => {
    const weak = buildPose({
      left_shoulder: [0.5, 0.2],
      left_hip: [0.5, 0.4],
      left_knee: [0.5, 0.6, 0.1], // below the 0.3 floor
      left_ankle: [0.7, 0.6],
    })
    expect(scoreSquat([weak]).lowConfidence).toBe(true)
  })

  it("throws on an empty sequence", () => {
    expect(() => scoreSquat([])).toThrow()
  })
})
