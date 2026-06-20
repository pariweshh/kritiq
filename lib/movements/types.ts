/**
 * Movement contract — the declarative spec that generalizes the squat vertical.
 *
 * A Movement is pure data + pure functions (no model/framework coupling) so the
 * whole owned scoring layer stays deterministic and unit-testable offline. The
 * generic engine (scoreMovement), the result mapper (buildMovementResult) and
 * the hard no-person gate (hasScorablePose) are all driven by these specs:
 * adding a movement is adding a spec, not writing new engine code.
 */

import type { KeypointName, Pose, Side } from "@/lib/pose/types"

/**
 * Inputs a dimension measures over. `keyPose` is the frame the movement keys on
 * (the deepest frame of a rep, or the clearest frame of a static hold); `frames`
 * is the whole sampled clip, so cross-frame qualities (e.g. plank hold
 * steadiness) can be measured too.
 */
export interface MeasureContext {
  readonly keyPose: Pose
  readonly frames: readonly Pose[]
  readonly side: Side
}

/** One scored quality of a movement (e.g. squat depth, pushup body line). */
export interface Dimension {
  readonly id: string
  readonly name: string
  /** Weight within its movement; a movement's weights sum to 1. */
  readonly weight: number
  /** Raw measured quantity, usually an angle in degrees. */
  readonly measure: (ctx: MeasureContext) => number
  /**
   * gradeLinear bounds: value ≤ best → 100, value ≥ worst → 0. "Lower is better"
   * metrics (knee angle, torso lean) just put `best` below `worst`.
   */
  readonly best: number
  readonly worst: number
  /** Deterministic plain-language description of the measured value. */
  readonly describe: (value: number) => string
  /** One-line praise, used when this is the movement's strongest dimension. */
  readonly strength: (value: number) => string
  /** One-line corrective cue, used when this is the weakest dimension. */
  readonly improvement: (value: number) => string
}

/**
 * Choose the pose the dimensions are measured at — the bottom of a rep, or the
 * clearest frame of a static hold.
 */
export type KeyFrameSelector = (frames: readonly Pose[], side: Side) => Pose

export interface Movement {
  readonly id: string
  /** Exercise ids (from constants/exercises) that map to this movement. */
  readonly exerciseIds: readonly string[]
  /** Pick the camera-facing side for a sagittal (side-on) view. */
  readonly pickSide: (pose: Pose) => Side
  readonly selectKeyFrame: KeyFrameSelector
  readonly dimensions: readonly Dimension[]
  /** Joints that must be confident for a reliable read → soft lowConfidence flag. */
  readonly scoringJoints: (side: Side) => readonly KeypointName[]
  /** The distal joints the HARD no-person gate checks against its floor. */
  readonly gateJoints: (side: Side) => readonly KeypointName[]
}

/** One graded dimension within a MovementScore. */
export interface DimensionScore {
  readonly id: string
  readonly name: string
  /** 0–100, integer. */
  readonly score: number
  /** Raw measured value (degrees etc.) at the key pose. */
  readonly value: number
  /** Deterministic per-metric feedback line. */
  readonly feedback: string
}

export interface MovementScore {
  readonly movementId: string
  /** Weighted overall, 0–100 integer. */
  readonly total: number
  readonly side: Side
  readonly dimensions: readonly DimensionScore[]
  /** True when a scoring joint fell below the confidence floor → suggest refilm. */
  readonly lowConfidence: boolean
}
