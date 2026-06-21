import { describe, expect, it } from "vitest"

import { scoreMovement } from "@/lib/movements/engine"
import { bicepCurl } from "@/lib/movements/bicepCurl"
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

// Top of a clean curl on the camera-near (left) arm: elbow flexed to ~45°
// (forearm swung up toward the shoulder).
const fullCurlFrame = buildPose({
  left_shoulder: [0.5, 0.3],
  left_elbow: [0.5, 0.5],
  left_wrist: [0.64, 0.36],
})

// Barely curled: elbow nearly straight (~151°), forearm still hanging down.
const partialCurlFrame = buildPose({
  left_shoulder: [0.5, 0.3],
  left_elbow: [0.5, 0.5],
  left_wrist: [0.6, 0.68],
})

// Two frames with the SAME good elbow flexion but the whole arm shifted, so the
// shoulder drifts 0.05 of the frame between them — a swung, cheating curl.
const swayA = buildPose({
  left_shoulder: [0.5, 0.3],
  left_elbow: [0.5, 0.5],
  left_wrist: [0.64, 0.36],
})
const swayB = buildPose({
  left_shoulder: [0.4, 0.3],
  left_elbow: [0.4, 0.5],
  left_wrist: [0.54, 0.36],
})

describe("scoreMovement (bicep_curl spec)", () => {
  it("gives a full, strict curl full marks", () => {
    const result = scoreMovement(bicepCurl, [fullCurlFrame])
    expect(result.movementId).toBe("bicep_curl")
    expect(result.side).toBe("left")
    expect(dim(result, "rangeOfMotion").score).toBe(100)
    // A single frame has zero shoulder drift → perfectly strict.
    expect(dim(result, "torsoSway").value).toBeCloseTo(0, 5)
    expect(dim(result, "torsoSway").score).toBe(100)
    expect(result.total).toBe(100)
    expect(result.lowConfidence).toBe(false)
  })

  it("scores a partial curl low on range of motion", () => {
    const result = scoreMovement(bicepCurl, [partialCurlFrame])
    expect(dim(result, "rangeOfMotion").score).toBe(0)
    // No drift in a single frame, so sway stays high.
    expect(dim(result, "torsoSway").score).toBe(100)
    expect(result.total).toBeLessThan(
      scoreMovement(bicepCurl, [fullCurlFrame]).total,
    )
  })

  it("scores a swung curl low on torso sway while range stays high", () => {
    const result = scoreMovement(bicepCurl, [swayA, swayB])
    expect(dim(result, "rangeOfMotion").score).toBe(100)
    expect(dim(result, "torsoSway").score).toBe(0)
  })

  it("flags low confidence when a scoring joint is weak", () => {
    const weak = buildPose({
      left_shoulder: [0.5, 0.3],
      left_elbow: [0.5, 0.5],
      left_wrist: [0.64, 0.36, 0.1], // below the 0.3 floor
    })
    expect(scoreMovement(bicepCurl, [weak]).lowConfidence).toBe(true)
  })

  it("selects the most-flexed (top of curl) frame across a sequence", () => {
    const result = scoreMovement(bicepCurl, [
      partialCurlFrame,
      fullCurlFrame,
      partialCurlFrame,
    ])
    expect(dim(result, "rangeOfMotion").score).toBe(100)
  })

  it("throws on an empty sequence", () => {
    expect(() => scoreMovement(bicepCurl, [])).toThrow()
  })
})
