/**
 * Which joints to emphasize on the form-snapshot overlay for a given scored
 * metric. Keyed by the shared metric ids used across movement specs; both the
 * left and right of a joint are returned (the view is side-on, so the pair
 * overlaps). Non-spatial metrics (e.g. tempo) and unknown ids return [] → no
 * highlight. Pure + framework-agnostic.
 */

import type { KeypointName } from "@/lib/pose/types"

const METRIC_JOINTS: Record<string, readonly KeypointName[]> = {
  depth: ["left_hip", "right_hip", "left_knee", "right_knee"],
  knee_tracking: ["left_knee", "right_knee"],
  knee_angle: ["left_knee", "right_knee"],
  shin_position: ["left_knee", "right_knee", "left_ankle", "right_ankle"],
  torso_position: ["left_shoulder", "right_shoulder", "left_hip", "right_hip"],
  back_angle: ["left_shoulder", "right_shoulder", "left_hip", "right_hip"],
  back_position: ["left_shoulder", "right_shoulder", "left_hip", "right_hip"],
  torso_sway: ["left_shoulder", "right_shoulder", "left_hip", "right_hip"],
  arch_stability: ["left_shoulder", "right_shoulder", "left_hip", "right_hip"],
  body_line: [
    "left_shoulder",
    "right_shoulder",
    "left_hip",
    "right_hip",
    "left_ankle",
    "right_ankle",
  ],
  balance: ["left_hip", "right_hip", "left_ankle", "right_ankle"],
  stability: ["left_hip", "right_hip", "left_ankle", "right_ankle"],
  core: ["left_hip", "right_hip"],
  hip_extension: ["left_hip", "right_hip"],
  hip_hinge: ["left_hip", "right_hip"],
  range_of_motion: ["left_elbow", "right_elbow", "left_wrist", "right_wrist"],
  elbow_angle: ["left_elbow", "right_elbow"],
  shoulder_position: ["left_shoulder", "right_shoulder"],
  lockout: ["left_elbow", "right_elbow", "left_shoulder", "right_shoulder"],
  bar_path: ["left_wrist", "right_wrist"],
}

export function metricHighlightJoints(
  metricId: string,
): readonly KeypointName[] {
  return METRIC_JOINTS[metricId] ?? []
}
