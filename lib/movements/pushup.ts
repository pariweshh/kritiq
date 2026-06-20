/**
 * Pushup movement spec.
 *
 * A sagittal (side-on) pushup graded on two robust dimensions: depth (elbow
 * flexion at the bottom) and body line (how straight the shoulder→hip→knee line
 * stays — measured as the deviation 180 − hipAngle, so a perfectly straight body
 * reads 0). The camera-near arm is picked from the arm joints, and the bottom of
 * the rep is the deepest-elbow frame.
 *
 * Thresholds below are first-pass PLACEHOLDERS — same tunable status as squat v1;
 * calibrate against labelled footage.
 */

import { elbowAngle, hipAngle } from "@/lib/geometry/angles"
import { pickFacingSide } from "@/lib/geometry/facingSide"
import { deepestBy } from "@/lib/movements/selectors"
import type { Dimension, Movement } from "@/lib/movements/types"
import type { KeypointName, Side } from "@/lib/pose/types"

// Scoring thresholds (degrees). PLACEHOLDER / tunable — same status as squat v1.
const ELBOW_FULL_DEPTH_DEG = 90 // at/below → full depth marks (chest near floor)
const ELBOW_NO_DEPTH_DEG = 150 // barely bent → zero depth
const BODYLINE_IDEAL_MAX_DEG = 8 // ≤ this much off straight → full body-line marks
const BODYLINE_WORST_DEG = 35 // large sag/pike → zero body-line

// Phrasing thresholds — pick words only, distinct from the scoring thresholds.
const DEEP_ELBOW_DEG = 90
const NEAR_DEEP_ELBOW_DEG = 110
const STRAIGHT_BODY_DEG = 8
const MODERATE_SAG_DEG = 20

function describeDepth(elbowAngleDeg: number): string {
  const deg = Math.round(elbowAngleDeg)
  if (elbowAngleDeg <= DEEP_ELBOW_DEG) {
    return `Elbow bent to ${deg}° at the bottom — chest near the floor.`
  }
  if (elbowAngleDeg <= NEAR_DEEP_ELBOW_DEG) {
    return `Elbow bent to ${deg}° at the bottom — a solid range of motion.`
  }
  return `Elbow bent to ${deg}° at the bottom — only a shallow press.`
}

function describeBodyLine(deviationDeg: number): string {
  const deg = Math.round(deviationDeg)
  if (deviationDeg <= STRAIGHT_BODY_DEG) {
    return `Hips stayed in line — only ${deg}° off a straight body.`
  }
  if (deviationDeg <= MODERATE_SAG_DEG) {
    return `Hips drifted ${deg}° out of line — a slight sag.`
  }
  return `Hips drifted ${deg}° out of line — a large sag.`
}

const depth: Dimension = {
  id: "depth",
  name: "Depth",
  weight: 0.5,
  measure: (ctx) => elbowAngle(ctx.keyPose, ctx.side),
  best: ELBOW_FULL_DEPTH_DEG,
  worst: ELBOW_NO_DEPTH_DEG,
  describe: describeDepth,
  strength: (value) =>
    `Strong pushup depth — ${Math.round(value)}° of elbow bend at the bottom.`,
  improvement: (value) =>
    `Go deeper. You reached ${Math.round(value)}° of elbow bend; aim to bring your chest toward the floor (~90° or less).`,
}

const bodyLine: Dimension = {
  id: "bodyLine",
  name: "Body Line",
  weight: 0.5,
  // Deviation from a straight body: a perfectly straight shoulder→hip→knee is
  // hipAngle 180, so 180 − hipAngle reads 0; sag or pike pushes it up.
  measure: (ctx) => 180 - hipAngle(ctx.keyPose, ctx.side),
  best: BODYLINE_IDEAL_MAX_DEG,
  worst: BODYLINE_WORST_DEG,
  describe: describeBodyLine,
  strength: (value) =>
    `Solid body line — hips only ${Math.round(value)}° off straight at the bottom.`,
  improvement: (value) =>
    `Keep a straight line. Your hips drifted ${Math.round(value)}° out of line; brace your core and squeeze your glutes to stop the sag.`,
}

const scoringJoints = (side: Side): KeypointName[] => [
  `${side}_shoulder`,
  `${side}_elbow`,
  `${side}_wrist`,
  `${side}_hip`,
]

export const pushup: Movement = {
  id: "pushup",
  exerciseIds: ["pushup"],
  pickSide: (pose) => pickFacingSide(pose, ["shoulder", "elbow", "wrist"]),
  selectKeyFrame: deepestBy(elbowAngle),
  dimensions: [depth, bodyLine],
  scoringJoints,
  gateJoints: (side) => [`${side}_elbow`, `${side}_wrist`],
}
