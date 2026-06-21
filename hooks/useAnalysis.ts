/**
 * useAnalysis Hook
 * Manages the complete analysis lifecycle:
 * - Free tier limit checking
 * - AI analysis execution
 * - Result storage
 * - Error handling
 *
 * Usage: const { analyze, isAnalyzing, error, stage } = useAnalysis();
 */

import { getExerciseById } from "@/constants/exercises"
import type { AnalysisResult } from "@/constants/types"
import type { NewBestFlags } from "@/lib/progress/personalBests"
import { getMovementForExercise } from "@/lib/movements/registry"
import { analyzeMovement } from "@/services/analysis"
import {
  canAnalyze,
  recordTrialStart,
  saveAnalysis,
} from "@/services/storage"
import * as Haptics from "expo-haptics"
import { useRouter } from "expo-router"
import { useCallback, useState } from "react"

export type AnalysisStage =
  | "idle"
  | "checking_limits"
  | "analyzing"
  | "saving"
  | "complete"
  | "error"

interface AnalyzeSuccess {
  result: AnalysisResult
  newBest: NewBestFlags
  error: null
}

interface AnalyzeFailed {
  result: null
  newBest: null
  error: string
}

type AnalyzeOutcome = AnalyzeSuccess | AnalyzeFailed

interface UseAnalysisReturn {
  analyze: (
    videoUri: string,
    exerciseId: string,
    durationMs: number,
  ) => Promise<AnalyzeOutcome>
  isAnalyzing: boolean
  stage: AnalysisStage
  error: string | null
  reset: () => void
}

export function useAnalysis(): UseAnalysisReturn {
  const router = useRouter()
  const [stage, setStage] = useState<AnalysisStage>("idle")
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStage("idle")
    setError(null)
  }, [])

  const analyze = useCallback(
    async (
      videoUri: string,
      exerciseId: string,
      durationMs: number,
    ): Promise<AnalyzeOutcome> => {
      setError(null)

      try {
        // 1. Check free tier limits
        setStage("checking_limits")
        const { allowed, trialStarted } = await canAnalyze()

        if (!allowed) {
          setStage("idle")
          router.push("/paywall")
          return { result: null, newBest: null, error: "Free limit reached" }
        }

        // 2. Run analysis — a movement is scored fully on device when the
        //    registry has a Movement spec for its exercise id. Ids without one
        //    are "coming soon"; the old client-side video→Gemini path was
        //    retired with the numbers-only proxy. This branch is also a safety
        //    net since unsupported movements are disabled in the UI.
        setStage("analyzing")
        const exercise = getExerciseById(exerciseId)
        if (!exercise) {
          throw new Error(`Unknown exercise: ${exerciseId}`)
        }
        const movement = getMovementForExercise(exerciseId)
        if (!movement) {
          throw new Error(
            `${exercise.name} isn't available to score yet — it's coming soon.`,
          )
        }
        const result = await analyzeMovement(
          videoUri,
          durationMs,
          exercise,
          movement,
        )

        // 3. Save result + record trial start. saveAnalysis also folds the
        //    result into the durable PB/streak records and reports what it beat.
        setStage("saving")
        const { newBest } = await saveAnalysis(result)

        if (!trialStarted) {
          await recordTrialStart()
        }

        // 4. Done
        setStage("complete")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

        return { result, newBest, error: null }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Analysis failed. Please try again."
        setError(message)
        setStage("error")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        return { result: null, newBest: null, error: message }
      }
    },
    [router],
  )

  return {
    analyze,
    isAnalyzing: ["checking_limits", "analyzing", "saving"].includes(stage),
    stage,
    error,
    reset,
  }
}
