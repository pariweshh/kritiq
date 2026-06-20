/**
 * Reverse lunge movement spec.
 *
 * A unilateral squat-family rep: the athlete steps one foot back and drops into a
 * lunge. Scored on the same two robust sagittal-plane dimensions as the squat —
 * depth (front-knee flexion at the bottom) and torso lean from vertical — because
 * a deep camera-near (front) leg and an upright torso are exactly what a clean
 * reverse lunge demands. `pickFacingSide` defaults to the leg joints, which in a
 * sagittal lunge selects the camera-near = front (working) leg; the bottom of the
 * rep is the deepest front-knee frame.
 *
 * DRY: reuses the squat's geometry primitives (kneeAngle, torsoLeanFromVertical)
 * and the generic engine — NO new primitives. Kept as its OWN spec rather than
 * aliasing squat. DECISION (phrasing): although the math overlaps with squat, the
 * coaching cues for a lunge are movement-specific (front knee / drop the back
 * knee toward the floor / stay tall as you step back), so the describe/strength/
 * improvement text is authored fresh here in squat's style instead of importing
 * squat's strings. The shared part is the math, not the words.
 *
 * Thresholds below are first-pass PLACEHOLDERS — same tunable status as squat v1;
 * calibrate against labelled footage. NOTE: depth `worst` is 150° here, whereas
 * the squat uses 160° (the spec asked for "the same bounds as squat" but a
 * slightly tighter 150 floor) — reconcile the two during calibration.
 */

import { kneeAngle, torsoLeanFromVertical } from "@/lib/geometry/angles"
import { pickFacingSide } from "@/lib/geometry/facingSide"
import { deepestBy } from "@/lib/movements/selectors"
import type { Dimension, Movement } from "@/lib/movements/types"
import type { KeypointName, Side } from "@/lib/pose/types"

// Scoring thresholds (degrees). PLACEHOLDER / tunable — same status as squat v1.
const FRONT_KNEE_FULL_DEPTH_DEG = 90 // at/below parallel → full depth marks
const FRONT_KNEE_NO_DEPTH_DEG = 150 // ~standing → zero depth (squat uses 160; see header note)
const TORSO_IDEAL_MAX_DEG = 30 // at/below → full torso marks
const TORSO_WORST_DEG = 75 // at/above → zero torso

// Phrasing thresholds — pick words only, distinct from the scoring thresholds.
const PARALLEL_DEG = 90
const NEAR_PARALLEL_DEG = 110
const TALL_TORSO_DEG = 30
const MODERATE_TORSO_DEG = 50

function describeDepth(kneeAngleDeg: number): string {
  const deg = Math.round(kneeAngleDeg)
  if (kneeAngleDeg <= PARALLEL_DEG) {
    return `Front knee bent to ${deg}° at the bottom — at or below parallel.`
  }
  if (kneeAngleDeg <= NEAR_PARALLEL_DEG) {
    return `Front knee bent to ${deg}° at the bottom — just above parallel.`
  }
  return `Front knee bent to ${deg}° at the bottom — well above parallel.`
}

function describeTorso(torsoLean: number): string {
  const deg = Math.round(torsoLean)
  if (torsoLean <= TALL_TORSO_DEG) {
    return `Torso leaned ${deg}° from vertical — tall and upright.`
  }
  if (torsoLean <= MODERATE_TORSO_DEG) {
    return `Torso leaned ${deg}° from vertical — a moderate forward lean.`
  }
  return `Torso leaned ${deg}° from vertical — a large forward lean.`
}

const depth: Dimension = {
  id: "depth",
  name: "Depth",
  weight: 0.6,
  measure: (ctx) => kneeAngle(ctx.keyPose, ctx.side),
  best: FRONT_KNEE_FULL_DEPTH_DEG,
  worst: FRONT_KNEE_NO_DEPTH_DEG,
  describe: describeDepth,
  strength: (value) =>
    `Strong lunge depth — ${Math.round(value)}° of front-knee flexion at the bottom.`,
  improvement: (value) =>
    `Drop deeper. Your front knee reached ${Math.round(value)}°; lower your back knee toward the floor until your front thigh is about parallel (~90° or less).`,
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
    `Good torso control — only ${Math.round(value)}° of forward lean at the bottom.`,
  improvement: (value) =>
    `Stay taller. Your torso leaned ${Math.round(value)}°; keep your chest up and brace your core as you step back.`,
}

const scoringJoints = (side: Side): KeypointName[] => [
  `${side}_shoulder`,
  `${side}_hip`,
  `${side}_knee`,
  `${side}_ankle`,
]

export const reverseLunge: Movement = {
  id: "reverse_lunge",
  exerciseIds: ["reverse_lunge"],
  pickSide: pickFacingSide,
  selectKeyFrame: deepestBy(kneeAngle),
  dimensions: [depth, torso],
  scoringJoints,
  gateJoints: (side) => [`${side}_knee`, `${side}_ankle`],
}
