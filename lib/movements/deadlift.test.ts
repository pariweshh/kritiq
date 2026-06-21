import { describe, expect, it } from "vitest"

import { deadlift } from "@/lib/movements/deadlift"
import { scoreMovement } from "@/lib/movements/engine"
import type { MovementScore } from "@/lib/movements/types"
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

const dim = (score: MovementScore, id: string) =>
  score.dimensions.find((d) => d.id === id)!

// Bottom of a deep hinge on the camera-near (left) side: torso folded forward to
// horizontal over a vertical thigh → hipAngle 90 (a strong hinge).
const bottomFrame = buildPose({
  left_shoulder: [0.2, 0.5],
  left_hip: [0.5, 0.5],
  left_knee: [0.5, 0.8],
  left_ankle: [0.5, 1.0],
})

// Top of the pull: shoulder→hip→knee stacked vertically → hipAngle 180 (locked).
const topFrame = buildPose({
  left_shoulder: [0.5, 0.2],
  left_hip: [0.5, 0.5],
  left_knee: [0.5, 0.8],
  left_ankle: [0.5, 1.0],
})

// A stiff bottom: torso barely folds (hipAngle ~162) — the hips never load.
const stiffBottomFrame = buildPose({
  left_shoulder: [0.42, 0.25],
  left_hip: [0.5, 0.5],
  left_knee: [0.5, 0.8],
  left_ankle: [0.5, 1.0],
})

// A partial top: hips never reach lockout (hipAngle ~117) — short of standing tall.
const midFrame = buildPose({
  left_shoulder: [0.3, 0.4],
  left_hip: [0.5, 0.5],
  left_knee: [0.5, 0.8],
  left_ankle: [0.5, 1.0],
})

describe("scoreMovement (deadlift spec)", () => {
  it("gives a deep hinge with a tall lockout full marks", () => {
    const result = scoreMovement(deadlift, [topFrame, bottomFrame, topFrame])
    expect(result.movementId).toBe("deadlift")
    expect(result.side).toBe("left")
    // Keys on the bottom for the hinge dimension.
    expect(dim(result, "hipHinge").value).toBeCloseTo(90, 5)
    expect(dim(result, "hipHinge").score).toBe(100)
    // Lockout scans the clip and finds the top frame (hipAngle 180 → shortfall 0).
    expect(dim(result, "lockout").value).toBeCloseTo(0, 5)
    expect(dim(result, "lockout").score).toBe(100)
    expect(result.total).toBe(100)
    expect(result.lowConfidence).toBe(false)
  })

  it("scores a stiff bottom low on hip hinge while lockout stays high", () => {
    const result = scoreMovement(deadlift, [stiffBottomFrame, topFrame])
    expect(dim(result, "hipHinge").score).toBe(0)
    // The clip still reaches a tall top frame, so lockout stays high.
    expect(dim(result, "lockout").score).toBe(100)
    expect(result.total).toBeLessThan(
      scoreMovement(deadlift, [topFrame, bottomFrame, topFrame]).total,
    )
  })

  it("scores a missed lockout low on lockout while the hinge stays high", () => {
    const result = scoreMovement(deadlift, [bottomFrame, midFrame])
    expect(dim(result, "hipHinge").score).toBe(100)
    expect(dim(result, "lockout").score).toBe(0)
  })

  it("flags low confidence when a scoring joint is weak", () => {
    const weak = buildPose({
      left_shoulder: [0.2, 0.5],
      left_hip: [0.5, 0.5],
      left_knee: [0.5, 0.8],
      left_ankle: [0.5, 1.0, 0.1], // below the 0.3 floor
    })
    expect(scoreMovement(deadlift, [weak]).lowConfidence).toBe(true)
  })

  it("keys on the deepest-hinge frame across a sequence", () => {
    const result = scoreMovement(deadlift, [midFrame, bottomFrame, midFrame])
    expect(dim(result, "hipHinge").value).toBeCloseTo(90, 5)
    expect(dim(result, "hipHinge").score).toBe(100)
  })

  it("throws on an empty sequence", () => {
    expect(() => scoreMovement(deadlift, [])).toThrow()
  })
})
