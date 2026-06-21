/**
 * Deadlift movement spec.
 *
 * A hip-hinge pull: the athlete loads the hips at the bottom and drives them
 * through to a tall lockout at the top. A deadlift therefore has TWO scored
 * moments, but the engine keys on a single frame — so this keys on the BOTTOM
 * (deepest hinge, via `deepestBy(hipAngle)`) for the hinge dimension, and the
 * Lockout dimension scans `ctx.frames` itself to find the TOP (the same
 * cross-frame pattern `jointWobble` uses). No engine change is needed.
 *
 * Two sagittal-plane dimensions:
 *  - Hip Hinge: how much the hips load at the bottom via `hipAngle` (shoulder→
 *    hip→knee) at the deepest frame — a smaller angle = a deeper hinge (lower is
 *    better, graded like the squat's depth).
 *  - Lockout: how tall the finish is, measured as `180 − (max hipAngle over the
 *    clip)`, so a fully extended hip at the top reads 0 (same deviation pattern
 *    as the glute-bridge hip extension).
 *
 * LIMITATION (documented, not a bug): MoveNet's 17 COCO keypoints CANNOT see
 * spine curvature — there is no mid-back landmark — so a rounded lower/upper back
 * (the deadlift's most important safety cue) is NOT observable. This spec
 * approximates form with the hip hinge and the hip lockout only; it deliberately
 * does NOT claim to grade neutral spine. Calibrate and caveat accordingly.
 *
 * DRY: reuses the existing hipAngle primitive and the generic engine — NO new
 * primitives. Phrasing is authored fresh in squat's style.
 *
 * Thresholds below are first-pass PLACEHOLDERS — same tunable status as squat v1;
 * hinge "depth" in particular varies by lift variant (conventional vs RDL), so
 * calibrate against labelled footage.
 */

import { hipAngle } from "@/lib/geometry/angles"
import { pickFacingSide } from "@/lib/geometry/facingSide"
import { deepestBy } from "@/lib/movements/selectors"
import type { Dimension, Movement } from "@/lib/movements/types"
import type { KeypointName, Pose, Side } from "@/lib/pose/types"

// Scoring thresholds (degrees). PLACEHOLDER / tunable — same status as squat v1.
const HINGE_FULL_DEG = 95 // at/below → full hinge marks (hips deeply loaded)
const HINGE_NONE_DEG = 150 // ~standing → zero hinge (barely loaded the hips)
const LOCKOUT_IDEAL_MAX_DEG = 10 // ≤ this much short of straight → full lockout marks
const LOCKOUT_WORST_DEG = 50 // ≥ this much short of straight → zero lockout

// Phrasing thresholds — pick words only, distinct from the scoring thresholds.
const STRONG_HINGE_DEG = 100
const MODERATE_HINGE_DEG = 130
const LOCKED_OUT_DEG = 10
const PARTIAL_LOCKOUT_DEG = 30

/** Largest hip angle across the clip (the top of the pull). NaN if none measurable. */
function topHipAngle(frames: readonly Pose[], side: Side): number {
  let max = NaN
  for (const frame of frames) {
    const angle = hipAngle(frame, side)
    if (Number.isNaN(angle)) {
      continue
    }
    if (Number.isNaN(max) || angle > max) {
      max = angle
    }
  }
  return max
}

function describeHinge(hipAngleDeg: number): string {
  const deg = Math.round(hipAngleDeg)
  if (hipAngleDeg <= STRONG_HINGE_DEG) {
    return `Strong hip hinge — torso folded to a ${deg}° hip angle at the bottom.`
  }
  if (hipAngleDeg <= MODERATE_HINGE_DEG) {
    return `Moderate hip hinge — a ${deg}° hip angle at the bottom.`
  }
  return `Shallow hip hinge — only a ${deg}° hip angle; the hips barely loaded.`
}

function describeLockout(shortfallDeg: number): string {
  const deg = Math.round(shortfallDeg)
  if (shortfallDeg <= LOCKED_OUT_DEG) {
    return `Finished tall — hips locked out within ${deg}° of straight at the top.`
  }
  if (shortfallDeg <= PARTIAL_LOCKOUT_DEG) {
    return `Almost locked out — ${deg}° short of full hip extension at the top.`
  }
  return `Didn't finish — ${deg}° short of standing tall with the hips through.`
}

const hipHinge: Dimension = {
  id: "hipHinge",
  name: "Hip Hinge",
  weight: 0.4,
  measure: (ctx) => hipAngle(ctx.keyPose, ctx.side),
  best: HINGE_FULL_DEG,
  worst: HINGE_NONE_DEG,
  describe: describeHinge,
  strength: (value) =>
    `Strong hip hinge — you loaded the hips to a ${Math.round(value)}° hip angle at the bottom.`,
  improvement: (value) =>
    `Hinge more at the hips. Your hip angle only reached ${Math.round(value)}°; push your hips back to load your hamstrings before you pull.`,
}

const lockout: Dimension = {
  id: "lockout",
  name: "Lockout",
  weight: 0.6,
  // Shortfall from a straight hip at the TOP: the Lockout dim finds the top frame
  // itself (max hip angle over the clip), independent of the bottom keyPose.
  measure: (ctx) => 180 - topHipAngle(ctx.frames, ctx.side),
  best: LOCKOUT_IDEAL_MAX_DEG,
  worst: LOCKOUT_WORST_DEG,
  describe: describeLockout,
  strength: (value) =>
    `Strong lockout — you finished within ${Math.round(value)}° of a fully straight hip at the top.`,
  improvement: (value) =>
    `Finish the lift. Your hips stopped ${Math.round(value)}° short of lockout; drive them all the way through and stand tall with your glutes squeezed.`,
}

const scoringJoints = (side: Side): KeypointName[] => [
  `${side}_shoulder`,
  `${side}_hip`,
  `${side}_knee`,
  `${side}_ankle`,
]

export const deadlift: Movement = {
  id: "deadlift",
  exerciseIds: ["deadlift"],
  pickSide: pickFacingSide,
  // Bottom of the pull = deepest hinge = minimum hip angle (used by Hip Hinge);
  // the Lockout dim scans ctx.frames for the top.
  selectKeyFrame: deepestBy(hipAngle),
  dimensions: [hipHinge, lockout],
  scoringJoints,
  gateJoints: (side) => [`${side}_hip`, `${side}_knee`],
}
