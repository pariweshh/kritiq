/**
 * Kritiq Core Types
 */

import type { Pose } from "@/lib/pose/types"

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
  /**
   * The scored key pose (17 normalized keypoints, numbers only — no footage),
   * persisted to draw the form-snapshot overlay. Absent on older records.
   */
  pose?: Pose
}

export interface AnalysisHistory {
  analyses: AnalysisResult[]
}

export interface UserState {
  isPremium: boolean
  onboardingComplete: boolean
}

export type ExerciseId =
  | "bodyweight_squat"
  | "squat"
  | "pushup"
  | "plank"
  | "reverse_lunge"
  | "forward_lunge"
  | "glute_bridge"
  | "overhead_press"
  | "bicep_curl"
  | "wall_sit"
  | "deadlift"
  | "bench"
