/**
 * Hard "is there actually a person to score?" gate.
 *
 * MoveNet SinglePose has no person / no-person head — it ALWAYS emits 17
 * keypoints. On a body-less frame it hallucinates a degenerate skeleton draped
 * down whatever high-contrast vertical edge (a banister, a wall seam) fired its
 * heatmaps hardest. So mean-over-17 confidence is the wrong signal: it folds in
 * face/arm joints we never score and clears any naive threshold — the old
 * `meanScore >= 0.15` gate let an empty room grade as a deep upright squat.
 *
 * Two clean, non-overlapping discriminators separate the no-body case from real
 * squats (calibrated against the device dump in kritiq-rebuild-plan):
 *   1. The SCORED lower-body joints — the camera-facing knee AND ankle — are
 *      weak on a no-body frame (≤0.27) but strong on real squats (knees ~0.83,
 *      ankles ~0.45–0.75). CONF_FLOOR sits in that gap.
 *   2. The hallucinated skeleton is degenerately small: the no-body dump spanned
 *      only ~0.20 of frame height, vs a full-frame real body. MIN_BODY_SPAN
 *      sits in that gap.
 *
 * A frame is "scorable" only when it clears BOTH on the facing side; the clip
 * passes when at least MIN_SCORABLE_FRAMES do. This is the HARD gate (throws +
 * alerts upstream), distinct from the SOFT per-joint lowConfidence flag in
 * scoreSquat, which still produces a score plus a refilm note.
 */

import { pickFacingSide } from "@/lib/geometry/facingSide"
import { keypoint, type Pose } from "@/lib/pose/types"

/** Facing-side knee AND ankle must clear this to count as a real lower body. */
const CONF_FLOOR = 0.35
/** A real body spans most of the frame; the no-body skeleton spanned ~0.20. */
const MIN_BODY_SPAN = 0.45
/** Need at least this many scorable frames across the clip to grade it. */
const MIN_SCORABLE_FRAMES = 3

/** Vertical reach of the skeleton, 0–1, across all 17 keypoints. */
function verticalExtent(pose: Pose): number {
  let min = Infinity
  let max = -Infinity
  for (const kp of pose.keypoints) {
    if (kp.y < min) min = kp.y
    if (kp.y > max) max = kp.y
  }
  return max - min
}

/** A single frame is scorable when both discriminators pass on the facing side. */
function isScorableFrame(pose: Pose): boolean {
  const side = pickFacingSide(pose)
  const knee = keypoint(pose, `${side}_knee`).score
  const ankle = keypoint(pose, `${side}_ankle`).score
  return (
    knee >= CONF_FLOOR &&
    ankle >= CONF_FLOOR &&
    verticalExtent(pose) >= MIN_BODY_SPAN
  )
}

/**
 * True when enough sampled frames show a real, scorable body. Short clips need
 * every frame to qualify; an empty sequence is never scorable.
 */
export function hasScorablePose(poses: readonly Pose[]): boolean {
  if (poses.length === 0) {
    return false
  }
  const scorable = poses.filter(isScorableFrame).length
  const required = Math.min(MIN_SCORABLE_FRAMES, poses.length)
  return scorable >= required
}
