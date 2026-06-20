import { describe, expect, it } from "vitest"

import { scoreMovement } from "@/lib/movements/engine"
import { plank } from "@/lib/movements/plank"
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

// A clean, level plank on the left side: shoulder→hip→ankle in a straight
// horizontal line (body-line deviation 0).
const straightFrame = buildPose({
  left_shoulder: [0.7, 0.5],
  left_hip: [0.5, 0.5],
  left_ankle: [0.3, 0.5],
})

// Same level body, shifted bodily down the frame — used to build a wobbly clip
// where each frame is internally straight but the hip drifts across frames.
const straightFrameLow = buildPose({
  left_shoulder: [0.7, 0.62],
  left_hip: [0.5, 0.62],
  left_ankle: [0.3, 0.62],
})

// Hips sagging well below the shoulder→ankle line.
const saggingFrame = buildPose({
  left_shoulder: [0.7, 0.5],
  left_hip: [0.5, 0.58],
  left_ankle: [0.3, 0.5],
})

const steadyClip = Array.from({ length: 12 }, () => straightFrame)

describe("scoreMovement (plank spec)", () => {
  it("gives a level, steady plank full marks", () => {
    const result = scoreMovement(plank, steadyClip)
    expect(result.side).toBe("left")
    expect(dim(result, "bodyLine").score).toBe(100)
    expect(dim(result, "stability").score).toBe(100)
    expect(result.total).toBe(100)
    expect(result.lowConfidence).toBe(false)
  })

  it("scores sagging hips low on body line while the hold stays steady", () => {
    const result = scoreMovement(
      plank,
      Array.from({ length: 12 }, () => saggingFrame),
    )
    expect(dim(result, "bodyLine").score).toBe(0)
    expect(dim(result, "stability").score).toBe(100)
  })

  it("scores a drifting hold low on stability while body line stays high", () => {
    // Each frame is internally straight, but the body shifts between two
    // positions across the clip → hip wobble, so stability tanks.
    const wobblyClip = [
      straightFrame,
      straightFrameLow,
      straightFrame,
      straightFrameLow,
      straightFrame,
      straightFrameLow,
    ]
    const result = scoreMovement(plank, wobblyClip)
    expect(dim(result, "bodyLine").score).toBe(100)
    expect(dim(result, "stability").score).toBe(0)
  })

  it("flags low confidence when a scoring joint is weak", () => {
    const weakFrame = buildPose({
      left_shoulder: [0.7, 0.5],
      left_hip: [0.5, 0.5, 0.1], // below the 0.3 floor
      left_ankle: [0.3, 0.5],
    })
    expect(
      scoreMovement(plank, [weakFrame, weakFrame, weakFrame]).lowConfidence,
    ).toBe(true)
  })

  it("keys the body-line read on the clearest frame", () => {
    // A blurry, sagging frame (low confidence) plus a clear, straight frame
    // (high confidence): the clearest frame should drive the body-line score.
    const blurrySag = buildPose({
      left_shoulder: [0.7, 0.5, 0.4],
      left_hip: [0.5, 0.58, 0.4],
      left_ankle: [0.3, 0.5, 0.4],
    })
    const result = scoreMovement(plank, [blurrySag, straightFrame, blurrySag])
    expect(dim(result, "bodyLine").value).toBeCloseTo(0, 5)
    expect(dim(result, "bodyLine").score).toBe(100)
  })

  it("throws on an empty sequence", () => {
    expect(() => scoreMovement(plank, [])).toThrow()
  })
})
