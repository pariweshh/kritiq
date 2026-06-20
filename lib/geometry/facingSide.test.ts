import { describe, expect, it } from "vitest"

import { pickFacingSide } from "@/lib/geometry/facingSide"
import {
  KEYPOINT_NAMES,
  type Keypoint,
  type KeypointName,
  type Pose,
} from "@/lib/pose/types"

function buildPose(scores: Partial<Record<KeypointName, number>>): Pose {
  const keypoints: Keypoint[] = KEYPOINT_NAMES.map((name) => ({
    name,
    x: 0.5,
    y: 0.5,
    score: scores[name] ?? 0,
  }))
  return { keypoints, meanScore: 0, aspectRatio: 1 }
}

describe("pickFacingSide", () => {
  it("picks the side with stronger leg confidence", () => {
    const pose = buildPose({
      left_hip: 0.9,
      left_knee: 0.9,
      left_ankle: 0.9,
      right_hip: 0.2,
      right_knee: 0.2,
      right_ankle: 0.2,
    })
    expect(pickFacingSide(pose)).toBe("left")
  })

  it("picks right when the right leg is clearer", () => {
    const pose = buildPose({
      left_hip: 0.1,
      left_knee: 0.1,
      left_ankle: 0.1,
      right_hip: 0.8,
      right_knee: 0.7,
      right_ankle: 0.6,
    })
    expect(pickFacingSide(pose)).toBe("right")
  })
})
