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

  it("uses the supplied arm joints (pushup) over the default legs", () => {
    // Arms favour the left, legs favour the right — proving the joints argument
    // drives the choice, not the hard-coded lower-body default.
    const pose = buildPose({
      left_shoulder: 0.9,
      left_elbow: 0.8,
      left_wrist: 0.7,
      right_shoulder: 0.2,
      right_elbow: 0.2,
      right_wrist: 0.2,
      left_hip: 0.1,
      left_knee: 0.1,
      left_ankle: 0.1,
      right_hip: 0.9,
      right_knee: 0.9,
      right_ankle: 0.9,
    })
    expect(pickFacingSide(pose, ["shoulder", "elbow", "wrist"])).toBe("left")
    // Default (legs) would pick the other side on the same pose.
    expect(pickFacingSide(pose)).toBe("right")
  })
})
