/**
 * Glute bridge movement spec.
 *
 * A supine hip-extension exercise: lying on the back with knees bent and feet
 * flat, the athlete drives the hips up until the body forms a straight line from
 * shoulders through hips to knees. There is no rep "bottom" to key on — the
 * scored moment is the TOP (full lockout), so this keys on the frame of maximum
 * hip extension via `clearestBy(hipAngle)` (a generic argmax; here it finds the
 * top of the rep rather than the clearest frame of a static hold).
 *
 * Two robust sagittal-plane dimensions:
 *  - Hip Extension: how close the top reaches full lockout, measured as the
 *    deviation `180 − hipAngle` (shoulder→hip→knee), so a perfectly straight
 *    line reads 0. Same deviation pattern as the pushup/plank body line.
 *  - Shin Position: knee bend at the top relative to a square 90° via the
 *    `|kneeAngle − 90|` target band — shins vertical / feet under knees is the
 *    standard setup cue. The abs-deviation reuses the existing `gradeLinear`
 *    (best 0 → worst), so it needs NO engine change. It is rep-robust: it reads
 *    the top frame, not motion across the clip.
 *
 * DRY: reuses existing geometry primitives (hipAngle, kneeAngle) and the generic
 * engine — NO new primitives. Phrasing is authored fresh in squat's style.
 *
 * Thresholds below are first-pass PLACEHOLDERS — same tunable status as squat v1;
 * calibrate against labelled footage.
 */

import { hipAngle, kneeAngle } from "@/lib/geometry/angles"
import { pickFacingSide } from "@/lib/geometry/facingSide"
import { clearestBy } from "@/lib/movements/selectors"
import type { Dimension, Movement } from "@/lib/movements/types"
import type { KeypointName, Side } from "@/lib/pose/types"

// Scoring thresholds (degrees). PLACEHOLDER / tunable — same status as squat v1.
const HIP_EXT_IDEAL_MAX_DEG = 10 // ≤ this much short of straight → full lockout marks
const HIP_EXT_WORST_DEG = 50 // ≥ this much short of straight → zero lockout
const SHIN_IDEAL_MAX_DEG = 8 // ≤ this far from a square 90° → full shin marks
const SHIN_WORST_DEG = 35 // ≥ this far from square → zero shin marks

// Phrasing thresholds — pick words only, distinct from the scoring thresholds.
const LOCKED_OUT_DEG = 10
const PARTIAL_LOCKOUT_DEG = 25
const SQUARE_SHIN_DEG = 8
const SLIGHT_OFF_SHIN_DEG = 20

function describeHipExtension(shortfallDeg: number): string {
  const deg = Math.round(shortfallDeg)
  if (shortfallDeg <= LOCKED_OUT_DEG) {
    return `Hips locked out at the top — only ${deg}° short of a straight line.`
  }
  if (shortfallDeg <= PARTIAL_LOCKOUT_DEG) {
    return `Hips reached most of the way up — ${deg}° short of full lockout.`
  }
  return `Hips stayed low — ${deg}° short of full lockout.`
}

function describeShin(offSquareDeg: number): string {
  const deg = Math.round(offSquareDeg)
  if (offSquareDeg <= SQUARE_SHIN_DEG) {
    return `Shins stayed vertical — knees bent close to 90° at the top.`
  }
  if (offSquareDeg <= SLIGHT_OFF_SHIN_DEG) {
    return `Shins were slightly off vertical — knee bend ${deg}° from square.`
  }
  return `Shins were well off vertical — knee bend ${deg}° from square.`
}

const hipExtension: Dimension = {
  id: "hipExtension",
  name: "Hip Extension",
  weight: 0.6,
  // Shortfall from full lockout: a straight shoulder→hip→knee is hipAngle 180,
  // so 180 − hipAngle reads 0 at the top; an unfinished bridge pushes it up.
  measure: (ctx) => 180 - hipAngle(ctx.keyPose, ctx.side),
  best: HIP_EXT_IDEAL_MAX_DEG,
  worst: HIP_EXT_WORST_DEG,
  describe: describeHipExtension,
  strength: (value) =>
    `Powerful lockout — your hips finished only ${Math.round(value)}° short of a straight line at the top.`,
  improvement: (value) =>
    `Drive higher. Your hips were ${Math.round(value)}° short of lockout; squeeze your glutes and push through your heels until shoulders, hips and knees form one straight line.`,
}

const shinPosition: Dimension = {
  id: "shinPosition",
  name: "Shin Position",
  weight: 0.4,
  // Deviation of the knee bend from a square 90° (shins vertical / feet under
  // knees) at the top. abs() grades drift in either direction off a target band.
  measure: (ctx) => Math.abs(kneeAngle(ctx.keyPose, ctx.side) - 90),
  best: SHIN_IDEAL_MAX_DEG,
  worst: SHIN_WORST_DEG,
  describe: describeShin,
  strength: (value) =>
    `Great setup — your shins stayed vertical, within ${Math.round(value)}° of square at the top.`,
  improvement: (value) =>
    `Set your feet so your shins are vertical at the top. Your knee bend was ${Math.round(value)}° off square; move your heels until they sit directly under your knees.`,
}

const scoringJoints = (side: Side): KeypointName[] => [
  `${side}_shoulder`,
  `${side}_hip`,
  `${side}_knee`,
  `${side}_ankle`,
]

export const gluteBridge: Movement = {
  id: "glute_bridge",
  exerciseIds: ["glute_bridge"],
  pickSide: pickFacingSide,
  // The top of the bridge = maximum hip extension = maximum hipAngle.
  selectKeyFrame: clearestBy(hipAngle),
  dimensions: [hipExtension, shinPosition],
  scoringJoints,
  gateJoints: (side) => [`${side}_hip`, `${side}_knee`],
}
