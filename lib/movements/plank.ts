/**
 * Plank movement spec — the reference STATIC hold.
 *
 * Unlike squat/pushup, a plank has no rep bottom, so it keys on the *clearest*
 * frame (strongest facing-side signal) and adds a cross-frame dimension: how
 * steady the hold is over the whole clip (via MeasureContext.frames). Two
 * dimensions — body line (a straight shoulder→hip→ankle) and stability (low hip
 * drift across the hold).
 *
 * Thresholds below are first-pass PLACEHOLDERS — same tunable status as squat v1;
 * calibrate against labelled footage. (The stability thresholds in particular are
 * a frame-fraction guess and want real held-vs-shaky clips to set them.)
 */

import { bodyLineAngle } from "@/lib/geometry/angles"
import { pickFacingSide } from "@/lib/geometry/facingSide"
import { jointWobble } from "@/lib/geometry/stability"
import { clearestBy } from "@/lib/movements/selectors"
import type { Dimension, Movement } from "@/lib/movements/types"
import { keypoint, type KeypointName, type Pose, type Side } from "@/lib/pose/types"

// Scoring thresholds. PLACEHOLDER / tunable — same status as squat v1.
const BODYLINE_IDEAL_MAX_DEG = 8 // ≤ this much off straight → full body-line marks
const BODYLINE_WORST_DEG = 35 // large sag/pike → zero body-line
const WOBBLE_STEADY = 0.01 // ≤ this hip drift (frame fraction) → full stability marks
const WOBBLE_WORST = 0.05 // ≥ this much drift → zero stability

// Phrasing thresholds — pick words only, distinct from the scoring thresholds.
const STRAIGHT_BODY_DEG = 8
const MODERATE_SAG_DEG = 20
const STEADY_WOBBLE = 0.015
const MODERATE_WOBBLE = 0.035

function describeBodyLine(deviationDeg: number): string {
  const deg = Math.round(deviationDeg)
  if (deviationDeg <= STRAIGHT_BODY_DEG) {
    return `Body held in a straight line — only ${deg}° off level.`
  }
  if (deviationDeg <= MODERATE_SAG_DEG) {
    return `Body drifted ${deg}° off a straight line — a slight sag or pike.`
  }
  return `Body drifted ${deg}° off a straight line — a large sag or pike.`
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

const bodyLine: Dimension = {
  id: "bodyLine",
  name: "Body Line",
  weight: 0.5,
  // Deviation from a straight shoulder→hip→ankle (180 = level) at the clearest frame.
  measure: (ctx) => 180 - bodyLineAngle(ctx.keyPose, ctx.side),
  best: BODYLINE_IDEAL_MAX_DEG,
  worst: BODYLINE_WORST_DEG,
  describe: describeBodyLine,
  strength: (value) =>
    `Excellent alignment — your body stayed only ${Math.round(value)}° off a straight line.`,
  improvement: (value) =>
    `Flatten your body line. Your hips were ${Math.round(value)}° off level; squeeze your glutes and brace your core so shoulders, hips and heels form one line.`,
}

const stability: Dimension = {
  id: "stability",
  name: "Stability",
  weight: 0.5,
  // Cross-frame: how far the facing-side hip drifts from its mean over the hold.
  measure: (ctx) => jointWobble(ctx.frames, `${ctx.side}_hip`),
  best: WOBBLE_STEADY,
  worst: WOBBLE_WORST,
  describe: describeStability,
  strength: (value) =>
    `Rock-solid hold — your hips barely moved (${wobblePct(value)} drift).`,
  improvement: (value) =>
    `Steady the hold. Your hips drifted ${wobblePct(value)} of the frame; brace harder and breathe slowly to stop the wobble.`,
}

// Sum of the facing-side body-line joints' confidence — picks the clearest frame.
const bodyConfidence = (pose: Pose, side: Side): number =>
  keypoint(pose, `${side}_shoulder`).score +
  keypoint(pose, `${side}_hip`).score +
  keypoint(pose, `${side}_ankle`).score

const scoringJoints = (side: Side): KeypointName[] => [
  `${side}_shoulder`,
  `${side}_hip`,
  `${side}_ankle`,
]

export const plank: Movement = {
  id: "plank",
  exerciseIds: ["plank"],
  pickSide: (pose) => pickFacingSide(pose, ["shoulder", "hip", "ankle"]),
  selectKeyFrame: clearestBy(bodyConfidence),
  dimensions: [bodyLine, stability],
  scoringJoints,
  // Body-line endpoints. Ankle is the discriminator vs the no-body dump (~0.19,
  // below CONF_FLOOR), shoulder confirms the upper body — paired with the gate's
  // bounding-box extent check (see lib/pose/quality.ts).
  gateJoints: (side) => [`${side}_shoulder`, `${side}_ankle`],
}
