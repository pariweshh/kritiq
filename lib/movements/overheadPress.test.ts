import { describe, expect, it } from "vitest"

import { scoreMovement } from "@/lib/movements/engine"
import { overheadPress } from "@/lib/movements/overheadPress"
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

// Top of a clean press on the camera-near (left) arm: shoulder→elbow→wrist in a
// straight vertical line overhead (elbowAngle 180 → full lockout) and the torso
// stacked vertically over the hip (lean 0).
const lockedOutFrame = buildPose({
  left_shoulder: [0.5, 0.5],
  left_elbow: [0.5, 0.3],
  left_wrist: [0.5, 0.1],
  left_hip: [0.5, 0.7],
})

// Arm bent — pressed only part of the way up (elbowAngle ~53), torso still
// vertical, isolating the lockout miss.
const partialPressFrame = buildPose({
  left_shoulder: [0.5, 0.5],
  left_elbow: [0.3, 0.4],
  left_wrist: [0.5, 0.3],
  left_hip: [0.5, 0.7],
})

// Arm locked out, but the torso leans well back over the hip (large lean).
const leanBackFrame = buildPose({
  left_shoulder: [0.3, 0.5],
  left_elbow: [0.3, 0.3],
  left_wrist: [0.3, 0.1],
  left_hip: [0.5, 0.7],
})

describe("scoreMovement (overhead_press spec)", () => {
  it("gives a full lockout with a vertical torso full marks", () => {
    const result = scoreMovement(overheadPress, [lockedOutFrame])
    expect(result.movementId).toBe("overhead_press")
    expect(result.side).toBe("left")
    expect(dim(result, "lockout").value).toBeCloseTo(0, 5)
    expect(dim(result, "lockout").score).toBe(100)
    expect(dim(result, "torso").score).toBe(100)
    expect(result.total).toBe(100)
    expect(result.lowConfidence).toBe(false)
  })

  it("scores a partial press low on lockout", () => {
    const result = scoreMovement(overheadPress, [partialPressFrame])
    expect(dim(result, "lockout").score).toBe(0)
    // Torso stays upright, so that dimension keeps the total off the floor.
    expect(dim(result, "torso").score).toBe(100)
    expect(result.total).toBeLessThan(
      scoreMovement(overheadPress, [lockedOutFrame]).total,
    )
  })

  it("scores a big back-lean low on torso while lockout stays high", () => {
    const result = scoreMovement(overheadPress, [leanBackFrame])
    expect(dim(result, "lockout").score).toBe(100)
    expect(dim(result, "torso").score).toBe(0)
  })

  it("flags low confidence when a scoring joint is weak", () => {
    const weak = buildPose({
      left_shoulder: [0.5, 0.5],
      left_elbow: [0.5, 0.3],
      left_wrist: [0.5, 0.1, 0.1], // below the 0.3 floor
      left_hip: [0.5, 0.7],
    })
    expect(scoreMovement(overheadPress, [weak]).lowConfidence).toBe(true)
  })

  it("selects the locked-out (straightest arm) frame across a sequence", () => {
    const result = scoreMovement(overheadPress, [
      partialPressFrame,
      lockedOutFrame,
      partialPressFrame,
    ])
    expect(dim(result, "lockout").value).toBeCloseTo(0, 5)
    expect(dim(result, "lockout").score).toBe(100)
  })

  it("throws on an empty sequence", () => {
    expect(() => scoreMovement(overheadPress, [])).toThrow()
  })
})
