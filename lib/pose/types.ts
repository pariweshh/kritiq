/**
 * Pose data model shared by the on-device pose service and the pure
 * geometry/scoring layer.
 *
 * No React Native / Expo imports here on purpose — this is the bottom,
 * framework-agnostic layer, so it (and everything that depends only on it)
 * stays trivially unit-testable under Vitest.
 */

export const KEYPOINT_NAMES = [
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
] as const

export type KeypointName = (typeof KEYPOINT_NAMES)[number]

export type Side = "left" | "right"

export interface Keypoint {
  readonly name: KeypointName
  /** Normalized 0–1 in original-image space (aspect-correct). 0 = left edge. */
  readonly x: number
  /** Normalized 0–1 in original-image space (aspect-correct). 0 = top edge. */
  readonly y: number
  /** Model confidence, 0–1. */
  readonly score: number
}

export interface Pose {
  /** Always 17 keypoints, in KEYPOINT_NAMES order. */
  readonly keypoints: readonly Keypoint[]
  /** Mean confidence across all keypoints. */
  readonly meanScore: number
  /**
   * Source frame width / height. x and y are normalized to width and height
   * separately, so the geometry layer needs this to isotropize before measuring
   * angles on a non-square frame.
   */
  readonly aspectRatio: number
}

/** Look up a keypoint by name; throws if absent (a malformed pose is a bug). */
export function keypoint(pose: Pose, name: KeypointName): Keypoint {
  const found = pose.keypoints.find((kp) => kp.name === name)
  if (!found) {
    throw new Error(`Pose is missing keypoint "${name}"`)
  }
  return found
}
