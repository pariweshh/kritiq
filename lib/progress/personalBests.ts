/**
 * Personal bests, derived per exercise from analysis sessions. Pure + immutable:
 * updates return a new `PersonalBests` map and never touch the input.
 */

import type { AnalysisResult } from "@/constants/types"
import type { MetricBest, PersonalBests } from "@/lib/progress/types"

export interface NewBestFlags {
  /** True when this result BEAT a pre-existing overall best (not the first ever). */
  overall: boolean
  /** metricIds whose score beat a pre-existing per-metric best. */
  metrics: string[]
}

/**
 * Which aspects of `result` beat the PREVIOUS records. The first analysis of an
 * exercise establishes the baseline and is deliberately NOT counted as a beaten
 * PB, so the UI doesn't celebrate "New Best" on a user's very first rep. Pure.
 */
export function isNewBest(
  prev: PersonalBests,
  result: AnalysisResult,
): NewBestFlags {
  const existing = prev[result.exerciseId]
  const overall = !!existing && result.overallScore > existing.bestOverall

  const metrics: string[] = []
  for (const metric of result.metrics) {
    const prevMetric = existing?.bestByMetric[metric.metricId]
    if (prevMetric && metric.score > prevMetric.score) {
      metrics.push(metric.metricId)
    }
  }

  return { overall, metrics }
}

/** Fold `result` into the durable per-exercise personal bests. Immutable. */
export function updatePersonalBests(
  prev: PersonalBests,
  result: AnalysisResult,
): PersonalBests {
  const { exerciseId, overallScore, timestamp: at, metrics } = result
  const existing = prev[exerciseId]

  const bestByMetric: Record<string, MetricBest> = {
    ...(existing?.bestByMetric ?? {}),
  }
  for (const metric of metrics) {
    const prevMetric = bestByMetric[metric.metricId]
    if (!prevMetric || metric.score > prevMetric.score) {
      bestByMetric[metric.metricId] = { score: metric.score, at }
    }
  }

  if (!existing) {
    return {
      ...prev,
      [exerciseId]: {
        exerciseId,
        bestOverall: overallScore,
        bestOverallAt: at,
        bestByMetric,
      },
    }
  }

  const beatsOverall = overallScore > existing.bestOverall
  return {
    ...prev,
    [exerciseId]: {
      exerciseId,
      bestOverall: beatsOverall ? overallScore : existing.bestOverall,
      bestOverallAt: beatsOverall ? at : existing.bestOverallAt,
      bestByMetric,
    },
  }
}

/** Count of exercises with at least one recorded personal best. */
export function personalBestCount(bests: PersonalBests): number {
  return Object.keys(bests).length
}
