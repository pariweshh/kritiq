import { describe, expect, it } from "vitest"

import { scoreMovement } from "@/lib/movements/engine"
import { gluteBridge } from "@/lib/movements/gluteBridge"
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

// Top of a clean bridge on the camera-near (left) side: shoulder→hip→knee form a
// straight horizontal line (hipAngle 180 → full lockout) and the shin is vertical
// (knee→ankle drops straight down → kneeAngle 90).
const lockedOutFrame = buildPose({
  left_shoulder: [0.2, 0.5],
  left_hip: [0.5, 0.5],
  left_knee: [0.8, 0.5],
  left_ankle: [0.8, 0.8],
})

// Hips never finished driving up: shoulder→hip→knee is bent (hipAngle ~113), but
// the shin is still vertical (kneeAngle 90), isolating the hip-extension miss.
const hipsLowFrame = buildPose({
  left_shoulder: [0.2, 0.5],
  left_hip: [0.5, 0.7],
  left_knee: [0.8, 0.5],
  left_ankle: [0.96, 0.74],
})

// Hips locked out (hipAngle 180), but the feet sit too close so the shin is far
// off vertical (kneeAngle ~45), isolating the shin-position miss.
const feetTooCloseFrame = buildPose({
  left_shoulder: [0.2, 0.5],
  left_hip: [0.5, 0.5],
  left_knee: [0.8, 0.5],
  left_ankle: [0.55, 0.75],
})

describe("scoreMovement (glute_bridge spec)", () => {
  it("gives a full lockout with vertical shins full marks", () => {
    const result = scoreMovement(gluteBridge, [lockedOutFrame])
    expect(result.movementId).toBe("glute_bridge")
    expect(result.side).toBe("left")
    expect(dim(result, "hipExtension").value).toBeCloseTo(0, 5)
    expect(dim(result, "hipExtension").score).toBe(100)
    expect(dim(result, "shinPosition").value).toBeCloseTo(0, 5)
    expect(dim(result, "shinPosition").score).toBe(100)
    expect(result.total).toBe(100)
    expect(result.lowConfidence).toBe(false)
  })

  it("scores an unfinished bridge low on hip extension", () => {
    const result = scoreMovement(gluteBridge, [hipsLowFrame])
    expect(dim(result, "hipExtension").score).toBe(0)
    // Shins are still vertical, so that dimension stays high.
    expect(dim(result, "shinPosition").score).toBe(100)
    expect(result.total).toBeLessThan(
      scoreMovement(gluteBridge, [lockedOutFrame]).total,
    )
  })

  it("scores off-vertical shins low while hip extension stays high", () => {
    const result = scoreMovement(gluteBridge, [feetTooCloseFrame])
    expect(dim(result, "hipExtension").score).toBe(100)
    expect(dim(result, "shinPosition").score).toBe(0)
  })

  it("flags low confidence when a scoring joint is weak", () => {
    const weak = buildPose({
      left_shoulder: [0.2, 0.5],
      left_hip: [0.5, 0.5],
      left_knee: [0.8, 0.5],
      left_ankle: [0.8, 0.8, 0.1], // below the 0.3 floor
    })
    expect(scoreMovement(gluteBridge, [weak]).lowConfidence).toBe(true)
  })

  it("selects the top (max hip extension) frame across a sequence", () => {
    const result = scoreMovement(gluteBridge, [
      hipsLowFrame,
      lockedOutFrame,
      hipsLowFrame,
    ])
    expect(dim(result, "hipExtension").value).toBeCloseTo(0, 5)
    expect(dim(result, "hipExtension").score).toBe(100)
  })

  it("throws on an empty sequence", () => {
    expect(() => scoreMovement(gluteBridge, [])).toThrow()
  })
})
