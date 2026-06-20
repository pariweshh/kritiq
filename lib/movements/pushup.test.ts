import { describe, expect, it } from "vitest"

import { scoreMovement } from "@/lib/movements/engine"
import { pushup } from "@/lib/movements/pushup"
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

// Bottom of a clean pushup on the left side: elbow at 90°, shoulder→hip→knee
// straight (body line deviation 0).
const deepStraightFrame = buildPose({
  left_shoulder: [0.6, 0.6],
  left_elbow: [0.5, 0.7],
  left_wrist: [0.4, 0.6],
  left_hip: [0.4, 0.6],
  left_knee: [0.2, 0.6],
})

// Barely bent arm (elbow ~180°), body still straight.
const shallowElbowFrame = buildPose({
  left_shoulder: [0.7, 0.6],
  left_elbow: [0.5, 0.6],
  left_wrist: [0.3, 0.6],
  left_hip: [0.4, 0.6],
  left_knee: [0.2, 0.6],
})

// Good elbow depth, but the hips sag well out of the straight body line.
const saggingHipsFrame = buildPose({
  left_shoulder: [0.6, 0.6],
  left_elbow: [0.5, 0.7],
  left_wrist: [0.4, 0.6],
  left_hip: [0.4, 0.7],
  left_knee: [0.2, 0.6],
})

describe("scoreMovement (pushup spec)", () => {
  it("gives a deep, straight-bodied pushup full marks", () => {
    const result = scoreMovement(pushup, [deepStraightFrame])
    expect(result.side).toBe("left")
    expect(dim(result, "depth").value).toBeCloseTo(90, 5)
    expect(dim(result, "depth").score).toBe(100)
    expect(dim(result, "bodyLine").score).toBe(100)
    expect(result.total).toBe(100)
    expect(result.lowConfidence).toBe(false)
  })

  it("scores a shallow elbow low on depth", () => {
    const result = scoreMovement(pushup, [shallowElbowFrame])
    expect(dim(result, "depth").score).toBe(0)
    // Body is still straight, so body line keeps the total up off the floor.
    expect(dim(result, "bodyLine").score).toBe(100)
    expect(result.total).toBeLessThan(
      scoreMovement(pushup, [deepStraightFrame]).total,
    )
  })

  it("scores sagging hips low on body line while depth stays high", () => {
    const result = scoreMovement(pushup, [saggingHipsFrame])
    expect(dim(result, "depth").score).toBe(100)
    expect(dim(result, "bodyLine").score).toBe(0)
  })

  it("flags low confidence when a scoring joint is weak", () => {
    const weak = buildPose({
      left_shoulder: [0.6, 0.6],
      left_elbow: [0.5, 0.7],
      left_wrist: [0.4, 0.6],
      left_hip: [0.4, 0.6, 0.1], // below the 0.3 floor
      left_knee: [0.2, 0.6],
    })
    expect(scoreMovement(pushup, [weak]).lowConfidence).toBe(true)
  })

  it("selects the deepest-elbow frame across a sequence", () => {
    const result = scoreMovement(pushup, [
      shallowElbowFrame,
      deepStraightFrame,
      shallowElbowFrame,
    ])
    expect(dim(result, "depth").value).toBeCloseTo(90, 5)
    expect(dim(result, "depth").score).toBe(100)
  })

  it("throws on an empty sequence", () => {
    expect(() => scoreMovement(pushup, [])).toThrow()
  })
})
