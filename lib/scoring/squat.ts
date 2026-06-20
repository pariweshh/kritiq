/**
 * Squat scoring (0–100) from a sequence of poses sampled across one rep.
 *
 * Pure + deterministic. The owned scoring layer is the product's moat, so it
 * lives here with no model or framework coupling and is fully unit-tested.
 *
 * v1 scores two robust sagittal-plane dimensions: depth (knee flexion at the
 * bottom of the rep) and torso lean. Thresholds below are first-pass and will
 * be tuned against labelled footage; the weights/dimensions extend cleanly when
 * the Movement contract lands in Phase 2.
 */

import { kneeAngle, torsoLeanFromVertical } from "@/lib/geometry/angles"
import { pickFacingSide } from "@/lib/geometry/facingSide"
import { keypoint, type KeypointName, type Pose, type Side } from "@/lib/pose/types"

const MIN_SCORING_CONFIDENCE = 0.3
const DEPTH_WEIGHT = 0.6
const TORSO_WEIGHT = 0.4
const KNEE_FULL_DEPTH_DEG = 90 // at/below parallel → full depth marks
const KNEE_NO_DEPTH_DEG = 160 // ~standing → zero depth
const TORSO_IDEAL_MAX_DEG = 30 // at/below → full torso marks
const TORSO_WORST_DEG = 75 // at/above → zero torso

export interface SquatScore {
  /** Weighted overall score, 0–100. */
  readonly total: number
  /** Depth sub-score, 0–100. */
  readonly depth: number
  /** Torso-control sub-score, 0–100. */
  readonly torso: number
  /** Knee angle (deg) at the deepest frame. */
  readonly bottomKneeAngle: number
  /** Torso lean from vertical (deg) at the deepest frame. */
  readonly bottomTorsoLean: number
  /** Camera-facing side the score was computed from. */
  readonly side: Side
  /** True when a scoring joint fell below the confidence floor → suggest refilm. */
  readonly lowConfidence: boolean
}

/** Map a measured value to 0–100: ≤best → 100, ≥worst → 0, linear between. */
function gradeLinear(value: number, best: number, worst: number): number {
  if (best === worst) {
    return value <= best ? 100 : 0
  }
  const graded = ((worst - value) / (worst - best)) * 100
  return graded < 0 ? 0 : graded > 100 ? 100 : graded
}

export function scoreSquat(frames: readonly Pose[]): SquatScore {
  if (frames.length === 0) {
    throw new Error("scoreSquat: needs at least one pose frame")
  }

  // Use the side that's clearest mid-clip (subject is usually best framed there).
  const side = pickFacingSide(frames[Math.floor(frames.length / 2)])

  // Bottom of the squat = most knee flexion = smallest knee angle.
  let bottom = frames[0]
  let bottomKneeAngle = kneeAngle(frames[0], side)
  for (const frame of frames) {
    const angle = kneeAngle(frame, side)
    if (Number.isNaN(angle)) {
      continue
    }
    if (Number.isNaN(bottomKneeAngle) || angle < bottomKneeAngle) {
      bottom = frame
      bottomKneeAngle = angle
    }
  }

  const bottomTorsoLean = torsoLeanFromVertical(bottom, side)

  const usedJoints: KeypointName[] = [
    `${side}_shoulder`,
    `${side}_hip`,
    `${side}_knee`,
    `${side}_ankle`,
  ]
  const lowConfidence = usedJoints.some(
    (joint) => keypoint(bottom, joint).score < MIN_SCORING_CONFIDENCE,
  )

  const depth = gradeLinear(bottomKneeAngle, KNEE_FULL_DEPTH_DEG, KNEE_NO_DEPTH_DEG)
  const torso = gradeLinear(bottomTorsoLean, TORSO_IDEAL_MAX_DEG, TORSO_WORST_DEG)
  const total = Math.round(depth * DEPTH_WEIGHT + torso * TORSO_WEIGHT)

  return {
    total,
    depth: Math.round(depth),
    torso: Math.round(torso),
    bottomKneeAngle,
    bottomTorsoLean,
    side,
    lowConfidence,
  }
}
