/**
 * Kritiq Core Types
 */

export interface MetricScore {
  metricId: string
  name: string
  score: number // 0-10
  feedback: string // One-line AI feedback for this metric
}

export interface AnalysisResult {
  id: string
  exerciseId: string
  exerciseName: string
  overallScore: number // 0-10, one decimal
  metrics: MetricScore[]
  summary: string // 2-3 sentence overall feedback
  topStrength: string // Best aspect
  topImprovement: string // Primary area to improve
  timestamp: number // Unix ms
  tier: "ELITE" | "ADVANCED" | "DEVELOPING" | "NEEDS WORK"
}

export interface AnalysisHistory {
  analyses: AnalysisResult[]
}

export interface UserState {
  isPremium: boolean
  firstAnalysisDate?: number // Unix ms — set on first completed analysis
  onboardingComplete: boolean
}

export type ExerciseId = "bodyweight_squat" | "squat" | "deadlift" | "bench"
