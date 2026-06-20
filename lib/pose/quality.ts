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
 * Two clean, non-overlapping discriminators separate the no-body case from a
 * real movement (calibrated against the device dump in kritiq-rebuild-plan):
 *   1. The movement's distal scoring joints (`gateJoints` — e.g. the camera-
 *      facing knee AND ankle for a squat) are weak on a no-body frame (≤0.27)
 *      but strong on real reps (knees ~0.83, ankles ~0.45–0.75). CONF_FLOOR
 *      sits in that gap.
 *   2. The hallucinated skeleton is degenerately small: the no-body dump's
 *      bounding box spanned only ~0.20 (diagonal), vs a full-frame real body.
 *      MIN_BODY_EXTENT sits in that gap.
 *
 * The body-size check uses the bounding-box DIAGONAL, not a vertical-only span,
 * so it works for horizontal movements too (a plank/pushup spans little
 * vertically but a lot horizontally). A frame is "scorable" only when it clears
 * BOTH on the facing side; the clip passes when at least MIN_SCORABLE_FRAMES do.
 * This is the HARD gate (throws + alerts upstream), distinct from the SOFT
 * per-joint lowConfidence flag in the engine, which still produces a score plus
 * a refilm note.
 */

import type { Movement } from "@/lib/movements/types"
import { keypoint, type Pose } from "@/lib/pose/types"

/** A movement's distal scoring joints must clear this to count as a real body. */
const CONF_FLOOR = 0.35
/** A real body's bounding-box diagonal; the no-body dump's was ~0.20. */
const MIN_BODY_EXTENT = 0.45
/** Need at least this many scorable frames across the clip to grade it. */
const MIN_SCORABLE_FRAMES = 3

/** Bounding-box diagonal of the skeleton across all 17 keypoints (0–√2). */
function bodyExtent(pose: Pose): number {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const kp of pose.keypoints) {
    if (kp.x < minX) minX = kp.x
    if (kp.x > maxX) maxX = kp.x
    if (kp.y < minY) minY = kp.y
    if (kp.y > maxY) maxY = kp.y
  }
  return Math.hypot(maxX - minX, maxY - minY)
}

/** A single frame is scorable when both discriminators pass on the facing side. */
function isScorableFrame(pose: Pose, movement: Movement): boolean {
  const side = movement.pickSide(pose)
  const gateOk = movement
    .gateJoints(side)
    .every((joint) => keypoint(pose, joint).score >= CONF_FLOOR)
  return gateOk && bodyExtent(pose) >= MIN_BODY_EXTENT
}

/**
 * True when enough sampled frames show a real, scorable body for this movement.
 * Short clips need every frame to qualify; an empty sequence is never scorable.
 */
export function hasScorablePose(
  poses: readonly Pose[],
  movement: Movement,
): boolean {
  if (poses.length === 0) {
    return false
  }
  const scorable = poses.filter((p) => isScorableFrame(p, movement)).length
  const required = Math.min(MIN_SCORABLE_FRAMES, poses.length)
  return scorable >= required
}
