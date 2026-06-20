import { describe, expect, it } from "vitest"

import { plank } from "@/lib/movements/plank"
import { squat } from "@/lib/movements/squat"
import { hasScorablePose } from "@/lib/pose/quality"
import {
  KEYPOINT_NAMES,
  type Keypoint,
  type KeypointName,
  type Pose,
} from "@/lib/pose/types"

/** Build a pose from explicit [x, y, score] per keypoint. Unset → (0,0) score 0. */
function buildPose(
  coords: Partial<Record<KeypointName, [number, number, number]>>,
): Pose {
  const keypoints: Keypoint[] = KEYPOINT_NAMES.map((name) => {
    const c = coords[name]
    return { name, x: c?.[0] ?? 0, y: c?.[1] ?? 0, score: c?.[2] ?? 0 }
  })
  const meanScore =
    keypoints.reduce((s, kp) => s + kp.score, 0) / keypoints.length
  return { keypoints, meanScore, aspectRatio: 1 }
}

// ── Fixtures ────────────────────────────────────────────────────────────────

// EXACT device dump from an empty room (staircase + vertical wood paneling):
// all 17 keypoints collapse into a ~0.04-wide strip (x 0.17–0.21) spanning only
// y 0.27→0.47 (20% of frame height). Scores are the real MoveNet output — note
// mean 0.363 cleared the old 0.15 gate, yet every lower-leg joint is ≤0.27.
// This MUST be rejected.
const noBodyFrame = buildPose({
  nose: [0.18, 0.27, 0.44],
  left_eye: [0.19, 0.28, 0.43],
  right_eye: [0.17, 0.28, 0.4],
  left_ear: [0.2, 0.29, 0.49],
  right_ear: [0.17, 0.29, 0.42],
  left_shoulder: [0.2, 0.31, 0.53],
  right_shoulder: [0.18, 0.31, 0.32],
  left_elbow: [0.21, 0.34, 0.32],
  right_elbow: [0.18, 0.34, 0.27],
  left_wrist: [0.2, 0.37, 0.36],
  right_wrist: [0.19, 0.37, 0.37],
  left_hip: [0.2, 0.4, 0.49],
  right_hip: [0.18, 0.4, 0.41],
  left_knee: [0.19, 0.43, 0.22],
  right_knee: [0.18, 0.43, 0.27],
  left_ankle: [0.19, 0.47, 0.19],
  right_ankle: [0.18, 0.47, 0.25],
})

// A real side-on squat: full-frame body, strong facing-side (left) lower leg.
// Historical verified ranges — knees ~0.83, ankles ~0.45–0.75, hips ~0.76/0.79.
const realSquatFrame = buildPose({
  nose: [0.5, 0.1, 0.5],
  left_eye: [0.49, 0.09, 0.4],
  right_eye: [0.51, 0.09, 0.3],
  left_ear: [0.48, 0.1, 0.45],
  right_ear: [0.52, 0.1, 0.2],
  left_shoulder: [0.5, 0.25, 0.62],
  right_shoulder: [0.48, 0.25, 0.72],
  left_elbow: [0.52, 0.38, 0.5],
  right_elbow: [0.47, 0.38, 0.45],
  left_wrist: [0.53, 0.5, 0.6],
  right_wrist: [0.46, 0.5, 0.4],
  left_hip: [0.5, 0.5, 0.76],
  right_hip: [0.48, 0.5, 0.79],
  left_knee: [0.45, 0.7, 0.83],
  right_knee: [0.47, 0.7, 0.59],
  left_ankle: [0.45, 0.9, 0.75],
  right_ankle: [0.47, 0.9, 0.45],
})

const noBodyClip = Array.from({ length: 12 }, () => noBodyFrame)
const realSquatClip = Array.from({ length: 12 }, () => realSquatFrame)

// ── Tests ───────────────────────────────────────────────────────────────────

describe("hasScorablePose", () => {
  it("rejects the no-body device dump (empty room hallucinated skeleton)", () => {
    expect(hasScorablePose(noBodyClip, squat)).toBe(false)
  })

  it("accepts a real side-on squat clip", () => {
    expect(hasScorablePose(realSquatClip, squat)).toBe(true)
  })

  it("rejects the no-body dump for a plank too (ankle floor + extent)", () => {
    // Plank gates on [shoulder, ankle]: the dump's facing-side ankle (~0.19) is
    // below CONF_FLOOR, and its bounding box is degenerate — both reject it.
    expect(hasScorablePose(noBodyClip, plank)).toBe(false)
  })

  it("rejects an empty sequence", () => {
    expect(hasScorablePose([], squat)).toBe(false)
  })

  it("rejects strong lower-leg confidence when the body extent is degenerate", () => {
    // The real clustered no-body skeleton (diagonal ~0.20) but with the facing-
    // side knee/ankle forced above CONF_FLOOR: isolates the MIN_BODY_EXTENT
    // discriminator (gate joints pass, but the body is too small to be real).
    const collapsed: Pose = {
      ...noBodyFrame,
      keypoints: noBodyFrame.keypoints.map((kp) =>
        kp.name === "left_knee" || kp.name === "left_ankle"
          ? { ...kp, score: 0.9 }
          : kp,
      ),
    }
    expect(hasScorablePose([collapsed, collapsed, collapsed], squat)).toBe(false)
  })

  it("rejects a full-frame skeleton with weak facing-side knee and ankle", () => {
    // Big vertical span, but the scored joints are below CONF_FLOOR:
    // isolates the lower-leg confidence discriminator.
    const weakLegs = buildPose({
      nose: [0.5, 0.1, 0.6],
      left_shoulder: [0.5, 0.25, 0.6],
      left_hip: [0.5, 0.5, 0.6],
      left_knee: [0.5, 0.7, 0.27],
      left_ankle: [0.5, 0.9, 0.25],
    })
    expect(hasScorablePose([weakLegs, weakLegs, weakLegs], squat)).toBe(false)
  })

  it("requires at least a few scorable frames, not a single fluke", () => {
    const twoGood = [
      realSquatFrame,
      realSquatFrame,
      noBodyFrame,
      noBodyFrame,
      noBodyFrame,
    ]
    expect(hasScorablePose(twoGood, squat)).toBe(false)

    const threeGood = [
      realSquatFrame,
      realSquatFrame,
      realSquatFrame,
      noBodyFrame,
      noBodyFrame,
    ]
    expect(hasScorablePose(threeGood, squat)).toBe(true)
  })
})
