import { describe, expect, it } from "vitest"

import { clearestBy, deepestBy } from "@/lib/movements/selectors"
import type { Pose, Side } from "@/lib/pose/types"

// Minimal pose stub: tag the test value on meanScore so the stub fn reads it.
function poseTagged(angle: number): Pose {
  return { keypoints: [], meanScore: angle, aspectRatio: 1 }
}
const angleAt = (pose: Pose, _side: Side): number => pose.meanScore
const signalAt = angleAt

describe("deepestBy", () => {
  it("returns the frame with the smallest angle (bottom of the rep)", () => {
    const frames = [poseTagged(140), poseTagged(95), poseTagged(120)]
    expect(deepestBy(angleAt)(frames, "left")).toBe(frames[1])
  })

  it("skips NaN angles, including a leading one", () => {
    const good = poseTagged(100)
    const nan = poseTagged(NaN)
    expect(deepestBy(angleAt)([nan, good, nan], "left")).toBe(good)
  })

  it("falls back to the first frame when none are measurable", () => {
    const frames = [poseTagged(NaN), poseTagged(NaN)]
    expect(deepestBy(angleAt)(frames, "left")).toBe(frames[0])
  })
})

describe("clearestBy", () => {
  it("returns the frame with the largest signal (clearest pose)", () => {
    const frames = [poseTagged(0.4), poseTagged(0.9), poseTagged(0.6)]
    expect(clearestBy(signalAt)(frames, "left")).toBe(frames[1])
  })

  it("skips NaN signals, including a leading one", () => {
    const good = poseTagged(0.8)
    const nan = poseTagged(NaN)
    expect(clearestBy(signalAt)([nan, good, nan], "left")).toBe(good)
  })

  it("falls back to the first frame when none are measurable", () => {
    const frames = [poseTagged(NaN), poseTagged(NaN)]
    expect(clearestBy(signalAt)(frames, "left")).toBe(frames[0])
  })
})
