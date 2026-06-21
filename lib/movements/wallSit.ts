/**
 * Wall sit movement spec — a STATIC hold (plank-family).
 *
 * The athlete sits with their back against a wall, thighs parallel to the floor
 * and knees bent to a square 90°, and holds. Like the plank there is no rep
 * bottom, so it keys on the *clearest* frame (strongest facing-side leg signal)
 * and adds a cross-frame steadiness dimension.
 *
 * Two robust sagittal-plane dimensions:
 *  - Knee Angle: how close the knee bend is to a square 90° via the
 *    `|kneeAngle − 90|` target band — too shallow (standing tall) or too deep
 *    both miss. The abs-deviation reuses the existing `gradeLinear` (best 0 →
 *    worst), so it needs NO engine change.
 *  - Stability: how steady the hold is via `jointWobble` of the facing-side hip
 *    across the clip — a wall sit is graded on holding the position still.
 *
 * DRY: reuses existing primitives (kneeAngle, jointWobble) and the generic
 * engine — NO new primitives. Phrasing is authored fresh in squat's style.
 *
 * Thresholds below are first-pass PLACEHOLDERS — same tunable status as squat v1;
 * the stability thresholds (frame-fraction) especially want real held-vs-shaky
 * clips to set them.
 */

import { kneeAngle } from "@/lib/geometry/angles"
import { pickFacingSide } from "@/lib/geometry/facingSide"
import { jointWobble } from "@/lib/geometry/stability"
import { clearestBy } from "@/lib/movements/selectors"
import type { Dimension, Movement } from "@/lib/movements/types"
import { keypoint, type KeypointName, type Pose, type Side } from "@/lib/pose/types"

// Scoring thresholds. PLACEHOLDER / tunable — same status as squat v1.
const KNEE_IDEAL_MAX_DEG = 8 // ≤ this far from a square 90° → full knee marks
const KNEE_WORST_DEG = 40 // ≥ this far from square → zero knee marks
const WOBBLE_STEADY = 0.01 // ≤ this hip drift (frame fraction) → full stability marks
const WOBBLE_WORST = 0.05 // ≥ this much drift → zero stability

// Phrasing thresholds — pick words only, distinct from the scoring thresholds.
const SQUARE_KNEE_DEG = 8
const SLIGHT_OFF_KNEE_DEG = 22
const STEADY_WOBBLE = 0.015
const MODERATE_WOBBLE = 0.035

function describeKnee(offSquareDeg: number): string {
  const deg = Math.round(offSquareDeg)
  if (offSquareDeg <= SQUARE_KNEE_DEG) {
    return `Knees held at a square 90° — thighs parallel to the floor (${deg}° off).`
  }
  if (offSquareDeg <= SLIGHT_OFF_KNEE_DEG) {
    return `Knees were ${deg}° off square — thighs a little above or below parallel.`
  }
  return `Knees were ${deg}° off square — well away from a parallel-thigh sit.`
}

function wobblePct(wobble: number): string {
  return `${(wobble * 100).toFixed(1)}%`
}

function describeStability(wobble: number): string {
  if (wobble <= STEADY_WOBBLE) {
    return `Held rock-steady — hips drifted only ${wobblePct(wobble)} of the frame.`
  }
  if (wobble <= MODERATE_WOBBLE) {
    return `Mostly steady — hips drifted ${wobblePct(wobble)} of the frame during the hold.`
  }
  return `Unsteady hold — hips drifted ${wobblePct(wobble)} of the frame.`
}

const kneeTarget: Dimension = {
  id: "kneeTarget",
  name: "Knee Angle",
  weight: 0.6,
  // Deviation of the knee bend from a square 90° (thighs parallel to the floor).
  // abs() grades drift in either direction off the target band.
  measure: (ctx) => Math.abs(kneeAngle(ctx.keyPose, ctx.side) - 90),
  best: KNEE_IDEAL_MAX_DEG,
  worst: KNEE_WORST_DEG,
  describe: describeKnee,
  strength: (value) =>
    `Perfect depth — your knees stayed within ${Math.round(value)}° of a square 90°.`,
  improvement: (value) =>
    `Set your knees to 90°. Your knee bend was ${Math.round(value)}° off square; slide down (or up) until your thighs are parallel to the floor.`,
}

const stability: Dimension = {
  id: "stability",
  name: "Stability",
  weight: 0.4,
  // Cross-frame: how far the facing-side hip drifts from its mean over the hold.
  measure: (ctx) => jointWobble(ctx.frames, `${ctx.side}_hip`),
  best: WOBBLE_STEADY,
  worst: WOBBLE_WORST,
  describe: describeStability,
  strength: (value) =>
    `Rock-solid hold — your hips barely moved (${wobblePct(value)} drift).`,
  improvement: (value) =>
    `Steady the hold. Your hips drifted ${wobblePct(value)} of the frame; press your back into the wall and breathe slowly to stop sliding.`,
}

// Sum of the facing-side leg joints' confidence — picks the clearest frame.
const legConfidence = (pose: Pose, side: Side): number =>
  keypoint(pose, `${side}_hip`).score +
  keypoint(pose, `${side}_knee`).score +
  keypoint(pose, `${side}_ankle`).score

const scoringJoints = (side: Side): KeypointName[] => [
  `${side}_hip`,
  `${side}_knee`,
  `${side}_ankle`,
]

export const wallSit: Movement = {
  id: "wall_sit",
  exerciseIds: ["wall_sit"],
  pickSide: pickFacingSide,
  selectKeyFrame: clearestBy(legConfidence),
  dimensions: [kneeTarget, stability],
  scoringJoints,
  gateJoints: (side) => [`${side}_hip`, `${side}_knee`],
}
