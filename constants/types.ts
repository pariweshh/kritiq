/**
 * Kritiq Core Types
 */

export interface MetricScore {
  metricId: string
  name: string
  score: number // 0-100
  feedback: string // One-line feedback for this metric
}

export interface AnalysisResult {
  id: string
  exerciseId: string
  exerciseName: string
  overallScore: number // 0-100, integer
  metrics: MetricScore[]
  summary: string // 2-3 sentence overall feedback
  topStrength: string // Best aspect
  topImprovement: string // Primary area to improve
  timestamp: number // Unix ms
  tier: "ELITE" | "ADVANCED" | "DEVELOPING" | "NEEDS WORK"
  /** Set by the on-device pipeline when a scoring joint was low-confidence → suggest refilm. */
  lowConfidence?: boolean
}

export interface AnalysisHistory {
  analyses: AnalysisResult[]
}

export interface UserState {
  isPremium: boolean
  firstAnalysisDate?: number // Unix ms — set on first completed analysis
  onboardingComplete: boolean
}

export type ExerciseId =
  | "bodyweight_squat"
  | "squat"
  | "pushup"
  | "plank"
  | "reverse_lunge"
  | "deadlift"
  | "bench"
