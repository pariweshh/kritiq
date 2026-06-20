/**
 * Coaching payload builder (pure, numbers-only).
 *
 * Maps a MovementScore into the small anonymous payload the coaching proxy
 * accepts: the movement id, the exercise id, the overall total, and a generic
 * list of scored dimensions (id / name / 0–100 score / raw measured value). No
 * video, frames, ids, or PII — just numbers and the static dimension labels.
 *
 * This is the generic `dimensions[]` shape that replaced the original
 * squat-only `{ depth, torso } + angles` payload, so one coaching path serves
 * every movement (squat, pushup, plank, reverse lunge, …). It lives in the pure
 * lib layer (not services/) so it stays framework-free and unit-testable
 * offline; services/coaching.ts re-exports it alongside the network call.
 */

import type { MovementScore } from "@/lib/movements/types"

/** One scored dimension — numbers plus a static label only. */
export interface CoachDimension {
  readonly id: string
  readonly name: string
  /** 0–100 integer. */
  readonly score: number
  /** Raw measured value at the key pose (degrees, frame-fraction, …), 2dp. */
  readonly value: number
}

/** The anonymous numbers-only payload sent to the proxy. */
export interface CoachPayload {
  readonly movementId: string
  readonly exercise: string
  /** Weighted overall, 0–100. */
  readonly total: number
  readonly dimensions: readonly CoachDimension[]
  readonly lowConfidence: boolean
}

/**
 * Round to 2 decimals. Keeps angle precision while preserving fractional
 * dimensions (e.g. plank hip wobble ~0.03) that a plain Math.round would
 * collapse to 0.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function toCoachPayload(
  score: MovementScore,
  exerciseId: string,
): CoachPayload {
  return {
    movementId: score.movementId,
    exercise: exerciseId,
    total: score.total,
    dimensions: score.dimensions.map((d) => ({
      id: d.id,
      name: d.name,
      score: d.score,
      value: round2(d.value),
    })),
    lowConfidence: score.lowConfidence,
  }
}
