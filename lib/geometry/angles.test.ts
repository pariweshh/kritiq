import { describe, expect, it } from "vitest"

import {
  angleAtJoint,
  bodyLineAngle,
  elbowAngle,
  hipAngle,
  kneeAngle,
  torsoLeanFromVertical,
} from "@/lib/geometry/angles"
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
    return { name, x: c?.[0] ?? 0, y: c?.[1] ?? 0, score: c ? (c[2] ?? 0.9) : 0 }
  })
  const meanScore =
    keypoints.reduce((s, kp) => s + kp.score, 0) / keypoints.length
  return { keypoints, meanScore, aspectRatio: 1 }
}

describe("angleAtJoint", () => {
  it("measures a right angle", () => {
    expect(
      angleAtJoint({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }),
    ).toBeCloseTo(90, 5)
  })

  it("measures a straight line as 180", () => {
    expect(
      angleAtJoint({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: -1 }),
    ).toBeCloseTo(180, 5)
  })

  it("returns NaN for a degenerate (zero-length) segment", () => {
    expect(angleAtJoint({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNaN()
  })
})

describe("knee and hip angles", () => {
  const pose = buildPose({
    left_shoulder: [0.5, 0.2],
    left_hip: [0.5, 0.4],
    left_knee: [0.5, 0.6],
    left_ankle: [0.7, 0.6],
  })

  it("computes a 90° knee angle", () => {
    expect(kneeAngle(pose, "left")).toBeCloseTo(90, 5)
  })

  it("computes a 180° hip angle when shoulder, hip, knee are colinear", () => {
    expect(hipAngle(pose, "left")).toBeCloseTo(180, 5)
  })
})

describe("elbowAngle", () => {
  it("computes a 90° elbow angle (shoulder→elbow→wrist)", () => {
    const pose = buildPose({
      left_shoulder: [0.5, 0.4],
      left_elbow: [0.5, 0.6],
      left_wrist: [0.7, 0.6],
    })
    expect(elbowAngle(pose, "left")).toBeCloseTo(90, 5)
  })

  it("computes 180° for a straight arm", () => {
    const pose = buildPose({
      left_shoulder: [0.5, 0.4],
      left_elbow: [0.5, 0.6],
      left_wrist: [0.5, 0.8],
    })
    expect(elbowAngle(pose, "left")).toBeCloseTo(180, 5)
  })
})

describe("bodyLineAngle", () => {
  it("is 180° for a straight body (shoulder→hip→ankle colinear)", () => {
    const pose = buildPose({
      left_shoulder: [0.7, 0.5],
      left_hip: [0.5, 0.5],
      left_ankle: [0.3, 0.5],
    })
    expect(bodyLineAngle(pose, "left")).toBeCloseTo(180, 5)
  })

  it("drops below 180° when the hips sag out of line", () => {
    const pose = buildPose({
      left_shoulder: [0.7, 0.5],
      left_hip: [0.5, 0.6],
      left_ankle: [0.3, 0.5],
    })
    expect(bodyLineAngle(pose, "left")).toBeLessThan(180)
  })
})

describe("torsoLeanFromVertical", () => {
  it("is ~0 when the torso is upright", () => {
    const pose = buildPose({ left_shoulder: [0.5, 0.2], left_hip: [0.5, 0.5] })
    expect(torsoLeanFromVertical(pose, "left")).toBeCloseTo(0, 5)
  })

  it("is ~45 when leaning forward at 45°", () => {
    const pose = buildPose({ left_shoulder: [0.3, 0.3], left_hip: [0.5, 0.5] })
    expect(torsoLeanFromVertical(pose, "left")).toBeCloseTo(45, 5)
  })
})
