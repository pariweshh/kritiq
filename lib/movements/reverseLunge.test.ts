import { describe, expect, it } from "vitest"

import { scoreMovement } from "@/lib/movements/engine"
import { reverseLunge } from "@/lib/movements/reverseLunge"
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

// Bottom of a clean reverse lunge on the left (camera-near = front) leg: front
// knee at 90° (hip above the knee, ankle out to the side) and the torso upright
// over the hip (lean 0).
const deepUprightFrame = buildPose({
  left_shoulder: [0.5, 0.3],
  left_hip: [0.5, 0.5],
  left_knee: [0.5, 0.7],
  left_ankle: [0.7, 0.7],
})

// Barely bent front leg (knee ~180°, hip→knee→ankle in a straight vertical
// line), torso still upright.
const shallowFrame = buildPose({
  left_shoulder: [0.5, 0.1],
  left_hip: [0.5, 0.3],
  left_knee: [0.5, 0.5],
  left_ankle: [0.5, 0.7],
})

// Deep front knee, but the torso pitches well forward over the hip (large lean).
const bigLeanFrame = buildPose({
  left_shoulder: [0.9, 0.45],
  left_hip: [0.5, 0.5],
  left_knee: [0.5, 0.7],
  left_ankle: [0.7, 0.7],
})

describe("scoreMovement (reverse_lunge spec)", () => {
  it("gives a deep, upright reverse lunge full marks", () => {
    const result = scoreMovement(reverseLunge, [deepUprightFrame])
    expect(result.movementId).toBe("reverse_lunge")
    expect(result.side).toBe("left")
    expect(dim(result, "depth").value).toBeCloseTo(90, 5)
    expect(dim(result, "depth").score).toBe(100)
    expect(dim(result, "torso").score).toBe(100)
    expect(result.total).toBe(100)
    expect(result.lowConfidence).toBe(false)
  })

  it("scores a shallow front knee low on depth", () => {
    const result = scoreMovement(reverseLunge, [shallowFrame])
    expect(dim(result, "depth").score).toBe(0)
    // Torso stays upright, so it keeps the total up off the floor.
    expect(dim(result, "torso").score).toBe(100)
    expect(result.total).toBeLessThan(
      scoreMovement(reverseLunge, [deepUprightFrame]).total,
    )
  })

  it("scores a big forward lean low on torso while depth stays high", () => {
    const result = scoreMovement(reverseLunge, [bigLeanFrame])
    expect(dim(result, "depth").score).toBe(100)
    expect(dim(result, "torso").score).toBe(0)
  })

  it("flags low confidence when a scoring joint is weak", () => {
    const weak = buildPose({
      left_shoulder: [0.5, 0.3],
      left_hip: [0.5, 0.5],
      left_knee: [0.5, 0.7],
      left_ankle: [0.7, 0.7, 0.1], // below the 0.3 floor
    })
    expect(scoreMovement(reverseLunge, [weak]).lowConfidence).toBe(true)
  })

  it("selects the deepest front-knee frame across a sequence", () => {
    const result = scoreMovement(reverseLunge, [
      shallowFrame,
      deepUprightFrame,
      shallowFrame,
    ])
    expect(dim(result, "depth").value).toBeCloseTo(90, 5)
    expect(dim(result, "depth").score).toBe(100)
  })

  it("throws on an empty sequence", () => {
    expect(() => scoreMovement(reverseLunge, [])).toThrow()
  })
})
