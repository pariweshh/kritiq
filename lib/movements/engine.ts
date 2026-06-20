/**
 * Generic movement scoring engine (0–100). Pure + deterministic.
 *
 * Drives every movement off its declarative spec: pick the camera-facing side,
 * choose the key frame, grade each dimension linearly, then weight the grades
 * into an overall. This is the generalization of the original scoreSquat — the
 * squat thresholds and phrasing now live in lib/movements/squat.ts.
 */

import { keypoint, type Pose } from "@/lib/pose/types"
import type {
  DimensionScore,
  MeasureContext,
  Movement,
  MovementScore,
} from "@/lib/movements/types"

const MIN_SCORING_CONFIDENCE = 0.3

/** Map a measured value to 0–100: ≤best → 100, ≥worst → 0, linear between. */
export function gradeLinear(value: number, best: number, worst: number): number {
  if (best === worst) {
    return value <= best ? 100 : 0
  }
  const graded = ((worst - value) / (worst - best)) * 100
  return graded < 0 ? 0 : graded > 100 ? 100 : graded
}

export function scoreMovement(
  movement: Movement,
  frames: readonly Pose[],
): MovementScore {
  if (frames.length === 0) {
    throw new Error(
      `scoreMovement(${movement.id}): needs at least one pose frame`,
    )
  }

  // Pick the side from a mid-clip frame — the subject is usually best framed there.
  const side = movement.pickSide(frames[Math.floor(frames.length / 2)])
  const keyPose = movement.selectKeyFrame(frames, side)
  const ctx: MeasureContext = { keyPose, frames, side }

  // Measure each dimension once; keep the unrounded grade for the weighted total
  // (round once at the end, matching squat v1) and round per-dimension for display.
  const graded = movement.dimensions.map((dim) => {
    const value = dim.measure(ctx)
    return { dim, value, rawGrade: gradeLinear(value, dim.best, dim.worst) }
  })

  const dimensions: DimensionScore[] = graded.map(({ dim, value, rawGrade }) => ({
    id: dim.id,
    name: dim.name,
    score: Math.round(rawGrade),
    value,
    feedback: dim.describe(value),
  }))

  const total = Math.round(
    graded.reduce((sum, g) => sum + g.rawGrade * g.dim.weight, 0),
  )

  const lowConfidence = movement
    .scoringJoints(side)
    .some((joint) => keypoint(keyPose, joint).score < MIN_SCORING_CONFIDENCE)

  return { movementId: movement.id, total, side, dimensions, lowConfidence }
}
