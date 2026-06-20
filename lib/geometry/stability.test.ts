import { describe, expect, it } from "vitest"

import { jointWobble } from "@/lib/geometry/stability"
import {
  KEYPOINT_NAMES,
  type Keypoint,
  type Pose,
} from "@/lib/pose/types"

/** Pose with only the left hip placed; aspectRatio configurable for isotropy. */
function poseWithHip(x: number, y: number, aspectRatio = 1): Pose {
  const keypoints: Keypoint[] = KEYPOINT_NAMES.map((name) => ({
    name,
    x: name === "left_hip" ? x : 0,
    y: name === "left_hip" ? y : 0,
    score: 0.9,
  }))
  return { keypoints, meanScore: 0.9, aspectRatio }
}

describe("jointWobble", () => {
  it("is 0 when the joint never moves", () => {
    const frame = poseWithHip(0.5, 0.5)
    expect(jointWobble([frame, frame, frame], "left_hip")).toBe(0)
  })

  it("grows with positional drift across frames", () => {
    const a = poseWithHip(0.5, 0.5)
    const b = poseWithHip(0.5, 0.6)
    // Two frames 0.1 apart in y → each 0.05 from the mean → wobble 0.05.
    expect(jointWobble([a, b], "left_hip")).toBeCloseTo(0.05, 5)
  })

  it("scales x by aspect ratio so horizontal drift is metric-correct", () => {
    const a = poseWithHip(0.5, 0.5, 2) // aspectRatio 2 → x doubled
    const b = poseWithHip(0.6, 0.5, 2)
    // x drift 0.1 → isotropic 0.2 → each 0.1 from the mean → wobble 0.1.
    expect(jointWobble([a, b], "left_hip")).toBeCloseTo(0.1, 5)
  })

  it("returns NaN for an empty clip", () => {
    expect(jointWobble([], "left_hip")).toBeNaN()
  })
})
