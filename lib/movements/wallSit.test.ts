import { describe, expect, it } from "vitest"

import { scoreMovement } from "@/lib/movements/engine"
import { wallSit } from "@/lib/movements/wallSit"
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

// A clean wall sit on the camera-near (left) side: thigh horizontal (hip→knee),
// shin vertical (knee→ankle) → knee bent to a square 90°.
const squareFrame = buildPose({
  left_hip: [0.3, 0.5],
  left_knee: [0.6, 0.5],
  left_ankle: [0.6, 0.8],
})

// Knee too open (~149°) — barely sitting, thighs well above parallel.
const shallowFrame = buildPose({
  left_hip: [0.3, 0.5],
  left_knee: [0.6, 0.5],
  left_ankle: [0.85, 0.65],
})

// Same square knee, but the whole body slides down 0.1 between two frames so the
// hip drifts 0.05 of the frame — an unsteady hold.
const driftA = buildPose({
  left_hip: [0.3, 0.5],
  left_knee: [0.6, 0.5],
  left_ankle: [0.6, 0.8],
})
const driftB = buildPose({
  left_hip: [0.3, 0.6],
  left_knee: [0.6, 0.6],
  left_ankle: [0.6, 0.9],
})

describe("scoreMovement (wall_sit spec)", () => {
  it("gives a square, steady wall sit full marks", () => {
    const result = scoreMovement(wallSit, [squareFrame])
    expect(result.movementId).toBe("wall_sit")
    expect(result.side).toBe("left")
    expect(dim(result, "kneeTarget").value).toBeCloseTo(0, 5)
    expect(dim(result, "kneeTarget").score).toBe(100)
    // A single frame has zero hip drift → perfectly steady.
    expect(dim(result, "stability").value).toBeCloseTo(0, 5)
    expect(dim(result, "stability").score).toBe(100)
    expect(result.total).toBe(100)
    expect(result.lowConfidence).toBe(false)
  })

  it("scores a shallow knee low on knee angle", () => {
    const result = scoreMovement(wallSit, [shallowFrame])
    expect(dim(result, "kneeTarget").score).toBe(0)
    // No drift in a single frame, so stability stays high.
    expect(dim(result, "stability").score).toBe(100)
    expect(result.total).toBeLessThan(scoreMovement(wallSit, [squareFrame]).total)
  })

  it("scores a sliding hold low on stability while knee angle stays high", () => {
    const result = scoreMovement(wallSit, [driftA, driftB])
    expect(dim(result, "kneeTarget").score).toBe(100)
    expect(dim(result, "stability").score).toBe(0)
  })

  it("flags low confidence when a scoring joint is weak", () => {
    const weak = buildPose({
      left_hip: [0.3, 0.5],
      left_knee: [0.6, 0.5],
      left_ankle: [0.6, 0.8, 0.1], // below the 0.3 floor
    })
    expect(scoreMovement(wallSit, [weak]).lowConfidence).toBe(true)
  })

  it("keys on the clearest (strongest leg signal) frame", () => {
    const blurry = buildPose({
      left_hip: [0.3, 0.5, 0.4],
      left_knee: [0.6, 0.5, 0.4],
      left_ankle: [0.85, 0.65, 0.4], // off-square knee, but lower confidence
    })
    const clear = buildPose({
      left_hip: [0.3, 0.5, 0.9],
      left_knee: [0.6, 0.5, 0.9],
      left_ankle: [0.6, 0.8, 0.9], // square knee, higher confidence
    })
    const result = scoreMovement(wallSit, [blurry, clear])
    expect(dim(result, "kneeTarget").value).toBeCloseTo(0, 5)
    expect(dim(result, "kneeTarget").score).toBe(100)
  })

  it("throws on an empty sequence", () => {
    expect(() => scoreMovement(wallSit, [])).toThrow()
  })
})
