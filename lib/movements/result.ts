/**
 * Maps a MovementScore (numbers only) into the app's `AnalysisResult`
 * presentation/storage model. Pure + deterministic.
 *
 * Generalizes the original buildSquatResult: metrics come straight off the
 * scored dimensions, the strongest dimension drives topStrength and the weakest
 * drives topImprovement. The coaching strings here are the deterministic floor;
 * the optional Gemini overlay replaces summary/topStrength/topImprovement
 * afterwards without touching this mapper (see services/analysis.ts).
 */

import { getScoreTier } from "@/constants/theme"
import type { AnalysisResult, MetricScore } from "@/constants/types"
import type {
  DimensionScore,
  Movement,
  MovementScore,
} from "@/lib/movements/types"

const REFILM_NOTE =
  " Some joints were hard to track — refilm side-on with your full body in frame for a more reliable score."

export interface BuildMovementResultOptions {
  readonly exerciseId: string
  readonly exerciseName: string
  /** Caller supplies these so the mapper stays deterministic for tests. */
  readonly id: string
  readonly timestamp: number
}

/** Strongest ("max") or weakest ("min") dimension; ties resolve to the first. */
function pickExtreme(
  dimensions: readonly DimensionScore[],
  mode: "max" | "min",
): DimensionScore {
  return dimensions.reduce((best, d) =>
    mode === "max"
      ? d.score > best.score
        ? d
        : best
      : d.score < best.score
        ? d
        : best,
  )
}

export function buildMovementResult(
  movement: Movement,
  score: MovementScore,
  opts: BuildMovementResultOptions,
): AnalysisResult {
  const metrics: MetricScore[] = score.dimensions.map((d) => ({
    metricId: d.id,
    name: d.name,
    score: d.score,
    feedback: d.feedback,
  }))

  const strongest = pickExtreme(score.dimensions, "max")
  const weakest = pickExtreme(score.dimensions, "min")
  const dimFor = (id: string) =>
    movement.dimensions.find((d) => d.id === id) ?? movement.dimensions[0]

  const summary =
    `${opts.exerciseName}: ${score.total}/100. ` +
    score.dimensions.map((d) => `${d.name} ${d.score}`).join(", ") +
    "." +
    (score.lowConfidence ? REFILM_NOTE : "")

  return {
    id: opts.id,
    exerciseId: opts.exerciseId,
    exerciseName: opts.exerciseName,
    overallScore: score.total,
    metrics,
    summary,
    topStrength: dimFor(strongest.id).strength(strongest.value),
    topImprovement: dimFor(weakest.id).improvement(weakest.value),
    timestamp: opts.timestamp,
    tier: getScoreTier(score.total).label as AnalysisResult["tier"],
    lowConfidence: score.lowConfidence,
  }
}
