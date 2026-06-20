/**
 * Squat movement spec — the reference Movement.
 *
 * Ports the original scoreSquat / buildSquatResult constants and phrasing
 * verbatim onto the generic contract: two robust sagittal-plane dimensions,
 * depth (knee flexion at the bottom) and torso lean. Thresholds are first-pass
 * and tune against labelled footage.
 */

import { kneeAngle, torsoLeanFromVertical } from "@/lib/geometry/angles"
import { pickFacingSide } from "@/lib/geometry/facingSide"
import { deepestBy } from "@/lib/movements/selectors"
import type { Dimension, Movement } from "@/lib/movements/types"
import type { KeypointName, Side } from "@/lib/pose/types"

// Scoring thresholds (degrees).
const KNEE_FULL_DEPTH_DEG = 90 // at/below parallel → full depth marks
const KNEE_NO_DEPTH_DEG = 160 // ~standing → zero depth
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
    return `Knee bent to ${deg}° at the bottom — at or below parallel.`
  }
  if (kneeAngleDeg <= NEAR_PARALLEL_DEG) {
    return `Knee bent to ${deg}° at the bottom — just above parallel.`
  }
  return `Knee bent to ${deg}° at the bottom — well above parallel.`
}

function describeTorso(torsoLean: number): string {
  const deg = Math.round(torsoLean)
  if (torsoLean <= TALL_TORSO_DEG) {
    return `Torso leaned ${deg}° from vertical — tall and controlled.`
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
  best: KNEE_FULL_DEPTH_DEG,
  worst: KNEE_NO_DEPTH_DEG,
  describe: describeDepth,
  strength: (value) =>
    `Strong squat depth — ${Math.round(value)}° of knee flexion at the bottom.`,
  improvement: (value) =>
    `Sit deeper. You reached ${Math.round(value)}° of knee bend; aim to get your hips below parallel (~90° or less).`,
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
    `Stay taller. Your torso leaned ${Math.round(value)}°; brace your core and keep your chest up to reduce forward lean.`,
}

const scoringJoints = (side: Side): KeypointName[] => [
  `${side}_shoulder`,
  `${side}_hip`,
  `${side}_knee`,
  `${side}_ankle`,
]

export const squat: Movement = {
  id: "squat",
  exerciseIds: ["squat", "bodyweight_squat"],
  pickSide: pickFacingSide,
  selectKeyFrame: deepestBy(kneeAngle),
  dimensions: [depth, torso],
  scoringJoints,
  gateJoints: (side) => [`${side}_knee`, `${side}_ankle`],
}
