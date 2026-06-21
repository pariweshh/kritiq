/**
 * Progress data model — durable per-user aggregates derived from analysis
 * sessions. A "session" is simply a stored `AnalysisResult`; personal bests and
 * streaks are folded out of those sessions and persisted separately so they
 * survive the capped recent-history list.
 */

/** A single best score (per exercise overall, or per metric) and when it landed. */
export interface MetricBest {
  score: number // 0-100
  at: number // Unix ms of the analysis that set it
}

/** Personal bests for one exercise: best overall + best per scored metric. */
export interface PersonalBest {
  exerciseId: string
  bestOverall: number // 0-100
  bestOverallAt: number // Unix ms
  /** Best score per metricId (e.g. "depth", "torso"). */
  bestByMetric: Record<string, MetricBest>
}

/** Personal bests keyed by exerciseId. */
export type PersonalBests = Record<string, PersonalBest>

/** Consecutive-day activity streak. `lastActiveDay` is a local "YYYY-MM-DD". */
export interface StreakState {
  current: number
  longest: number
  lastActiveDay: string | null
}

/** Bump when the persisted shape changes incompatibly. */
export const PROGRESS_VERSION = 1 as const

/** The durable progress blob stored under the `kritiq_records` key. */
export interface ProgressRecords {
  version: number
  personalBests: PersonalBests
  streak: StreakState
}

/** A fresh, empty records blob (no history yet). */
export function emptyRecords(): ProgressRecords {
  return {
    version: PROGRESS_VERSION,
    personalBests: {},
    streak: { current: 0, longest: 0, lastActiveDay: null },
  }
}
