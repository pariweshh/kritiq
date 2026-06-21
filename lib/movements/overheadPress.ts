/**
 * Overhead press movement spec.
 *
 * A standing vertical press: the athlete drives the weight from the shoulders to
 * a fully locked-out arm overhead. There is no rep "bottom" to key on — the
 * scored moment is the TOP (full lockout), found via `clearestBy(elbowAngle)` (a
 * generic argmax; here the straightest-arm frame).
 *
 * Two robust sagittal-plane dimensions:
 *  - Lockout: how close the top reaches a straight arm, measured as the deviation
 *    `180 − elbowAngle`, so a fully extended arm reads 0. Same deviation pattern
 *    as the glute-bridge hip extension.
 *  - Torso Control: how upright the torso stays via `torsoLeanFromVertical` —
 *    leaning back to heave the weight up is the classic press fault, and the
 *    abs-magnitude lean catches a back-lean regardless of direction.
 *
 * DRY: reuses existing geometry primitives (elbowAngle, torsoLeanFromVertical)
 * and the generic engine — NO new primitives. Phrasing is authored fresh in
 * squat's style.
 *
 * Thresholds below are first-pass PLACEHOLDERS — same tunable status as squat v1;
 * calibrate against labelled footage.
 */

import { elbowAngle, torsoLeanFromVertical } from "@/lib/geometry/angles"
import { pickFacingSide } from "@/lib/geometry/facingSide"
import { clearestBy } from "@/lib/movements/selectors"
import type { Dimension, Movement } from "@/lib/movements/types"
import type { KeypointName, Side } from "@/lib/pose/types"

// Scoring thresholds (degrees). PLACEHOLDER / tunable — same status as squat v1.
const LOCKOUT_IDEAL_MAX_DEG = 10 // ≤ this much short of straight → full lockout marks
const LOCKOUT_WORST_DEG = 60 // ≥ this much short of straight → zero lockout
const TORSO_IDEAL_MAX_DEG = 10 // ≤ this lean → full torso marks (press stays tall)
const TORSO_WORST_DEG = 30 // ≥ this much lean/back-lean → zero torso

// Phrasing thresholds — pick words only, distinct from the scoring thresholds.
const LOCKED_OUT_DEG = 10
const PARTIAL_LOCKOUT_DEG = 35
const TALL_TORSO_DEG = 10
const MODERATE_TORSO_DEG = 20

function describeLockout(shortfallDeg: number): string {
  const deg = Math.round(shortfallDeg)
  if (shortfallDeg <= LOCKED_OUT_DEG) {
    return `Arm locked out overhead — only ${deg}° short of straight.`
  }
  if (shortfallDeg <= PARTIAL_LOCKOUT_DEG) {
    return `Pressed most of the way up — ${deg}° short of a full lockout.`
  }
  return `Only a partial press — ${deg}° short of locking out overhead.`
}

function describeTorso(torsoLean: number): string {
  const deg = Math.round(torsoLean)
  if (torsoLean <= TALL_TORSO_DEG) {
    return `Torso stayed vertical — only ${deg}° of lean at the top.`
  }
  if (torsoLean <= MODERATE_TORSO_DEG) {
    return `Torso leaned ${deg}° from vertical — a slight lean to drive the press.`
  }
  return `Torso leaned ${deg}° from vertical — a large lean to heave the weight up.`
}

const lockout: Dimension = {
  id: "lockout",
  name: "Lockout",
  weight: 0.6,
  // Shortfall from a straight arm: a fully extended arm is elbowAngle 180, so
  // 180 − elbowAngle reads 0 at the top; an unfinished press pushes it up.
  measure: (ctx) => 180 - elbowAngle(ctx.keyPose, ctx.side),
  best: LOCKOUT_IDEAL_MAX_DEG,
  worst: LOCKOUT_WORST_DEG,
  describe: describeLockout,
  strength: (value) =>
    `Strong lockout — your arm finished only ${Math.round(value)}° short of straight overhead.`,
  improvement: (value) =>
    `Press all the way up. Your arm stopped ${Math.round(value)}° short of straight; punch the weight to a full lockout with your biceps by your ears.`,
}

const torso: Dimension = {
  id: "torso",
  name: "Torso Control",
  weight: 0.4,
  measure: (ctx) => torsoLeanFromVertical(ctx.keyPose, ctx.side),
  best: TORSO_IDEAL_MAX_DEG,
  worst: TORSO_WORST_DEG,
  describe: describeTorso,
  strength: (value) =>
    `Good torso control — only ${Math.round(value)}° of lean at lockout.`,
  improvement: (value) =>
    `Stay tall. Your torso leaned ${Math.round(value)}°; brace your core and squeeze your glutes so you press straight up instead of leaning back.`,
}

const scoringJoints = (side: Side): KeypointName[] => [
  `${side}_shoulder`,
  `${side}_elbow`,
  `${side}_wrist`,
  `${side}_hip`,
]

export const overheadPress: Movement = {
  id: "overhead_press",
  exerciseIds: ["overhead_press"],
  pickSide: (pose) => pickFacingSide(pose, ["shoulder", "elbow", "wrist"]),
  // The top of the press = straightest arm = maximum elbow angle.
  selectKeyFrame: clearestBy(elbowAngle),
  dimensions: [lockout, torso],
  scoringJoints,
  gateJoints: (side) => [`${side}_shoulder`, `${side}_elbow`],
}
