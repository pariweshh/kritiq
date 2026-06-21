/**
 * Bicep curl movement spec.
 *
 * A standing curl: the athlete flexes the elbow to bring the weight up, ideally
 * without swinging the torso to cheat the rep. The scored moment is the TOP of
 * the curl (peak elbow flexion), found via `deepestBy(elbowAngle)` (the minimum
 * elbow angle).
 *
 * Two robust sagittal-plane dimensions:
 *  - Range of Motion: how far the elbow flexes at the top via `elbowAngle`
 *    directly (lower is better — a full curl closes the elbow), graded like the
 *    squat's depth.
 *  - Torso Sway: a cross-frame cheat detector — how much the facing-side shoulder
 *    drifts over the clip via `jointWobble`. A strict curl keeps the upper body
 *    still; swinging the torso to heave the weight shows up as shoulder drift.
 *
 * DRY: reuses existing primitives (elbowAngle, jointWobble) and the generic
 * engine — NO new primitives. Phrasing is authored fresh in squat's style.
 *
 * Thresholds below are first-pass PLACEHOLDERS — same tunable status as squat v1;
 * the sway thresholds (frame-fraction) especially want real clean-vs-cheating
 * clips to set them.
 */

import { elbowAngle } from "@/lib/geometry/angles"
import { pickFacingSide } from "@/lib/geometry/facingSide"
import { jointWobble } from "@/lib/geometry/stability"
import { deepestBy } from "@/lib/movements/selectors"
import type { Dimension, Movement } from "@/lib/movements/types"
import type { KeypointName, Side } from "@/lib/pose/types"

// Scoring thresholds. PLACEHOLDER / tunable — same status as squat v1.
const ELBOW_FULL_FLEXION_DEG = 50 // at/below → full range-of-motion marks
const ELBOW_NO_FLEXION_DEG = 100 // barely curled → zero range of motion
const SWAY_STEADY = 0.01 // ≤ this shoulder drift (frame fraction) → full sway marks
const SWAY_WORST = 0.05 // ≥ this much drift → zero sway marks

// Phrasing thresholds — pick words only, distinct from the scoring thresholds.
const FULL_CURL_DEG = 50
const PARTIAL_CURL_DEG = 80
const STEADY_SWAY = 0.015
const MODERATE_SWAY = 0.035

function describeRange(elbowAngleDeg: number): string {
  const deg = Math.round(elbowAngleDeg)
  if (elbowAngleDeg <= FULL_CURL_DEG) {
    return `Elbow flexed to ${deg}° at the top — a full curl.`
  }
  if (elbowAngleDeg <= PARTIAL_CURL_DEG) {
    return `Elbow flexed to ${deg}° at the top — a solid range of motion.`
  }
  return `Elbow flexed to ${deg}° at the top — only a partial curl.`
}

function swayPct(sway: number): string {
  return `${(sway * 100).toFixed(1)}%`
}

function describeSway(sway: number): string {
  if (sway <= STEADY_SWAY) {
    return `Upper body stayed still — shoulder drifted only ${swayPct(sway)} of the frame.`
  }
  if (sway <= MODERATE_SWAY) {
    return `Mostly strict — shoulder drifted ${swayPct(sway)} of the frame during the curl.`
  }
  return `Swung the weight up — shoulder drifted ${swayPct(sway)} of the frame.`
}

const rangeOfMotion: Dimension = {
  id: "rangeOfMotion",
  name: "Range of Motion",
  weight: 0.6,
  measure: (ctx) => elbowAngle(ctx.keyPose, ctx.side),
  best: ELBOW_FULL_FLEXION_DEG,
  worst: ELBOW_NO_FLEXION_DEG,
  describe: describeRange,
  strength: (value) =>
    `Full range of motion — ${Math.round(value)}° of elbow flexion at the top of the curl.`,
  improvement: (value) =>
    `Curl higher. Your elbow only reached ${Math.round(value)}°; squeeze the weight all the way up to your shoulder for a full contraction.`,
}

const torsoSway: Dimension = {
  id: "torsoSway",
  name: "Torso Sway",
  weight: 0.4,
  // Cross-frame: how far the facing-side shoulder drifts from its mean over the
  // clip. A clean curl keeps the shoulder planted; swinging to cheat moves it.
  measure: (ctx) => jointWobble(ctx.frames, `${ctx.side}_shoulder`),
  best: SWAY_STEADY,
  worst: SWAY_WORST,
  describe: describeSway,
  strength: (value) =>
    `Strict form — your shoulder barely moved (${swayPct(value)} drift) through the curl.`,
  improvement: (value) =>
    `Stop swinging. Your shoulder drifted ${swayPct(value)} of the frame; plant your elbow at your side and let only the forearm move.`,
}

const scoringJoints = (side: Side): KeypointName[] => [
  `${side}_shoulder`,
  `${side}_elbow`,
  `${side}_wrist`,
]

export const bicepCurl: Movement = {
  id: "bicep_curl",
  exerciseIds: ["bicep_curl"],
  pickSide: (pose) => pickFacingSide(pose, ["shoulder", "elbow", "wrist"]),
  selectKeyFrame: deepestBy(elbowAngle),
  dimensions: [rangeOfMotion, torsoSway],
  scoringJoints,
  gateJoints: (side) => [`${side}_elbow`, `${side}_wrist`],
}
