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

import type { AnalysisResult } from "@/constants/types"
import { analyzeForm } from "@/services/gemini"
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
  error: null
}

interface AnalyzeFailed {
  result: null
  error: string
}

type AnalyzeOutcome = AnalyzeSuccess | AnalyzeFailed

interface UseAnalysisReturn {
  analyze: (videoUri: string, exerciseId: string) => Promise<AnalyzeOutcome>
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
    async (videoUri: string, exerciseId: string): Promise<AnalyzeOutcome> => {
      setError(null)

      try {
        // 1. Check free tier limits
        setStage("checking_limits")
        const { allowed, isPremium, trialStarted } = await canAnalyze()

        if (!allowed) {
          setStage("idle")
          router.push("/paywall")
          return { result: null, error: "Free limit reached" }
        }

        // 2. Run AI analysis
        setStage("analyzing")
        const result = await analyzeForm(videoUri, exerciseId)

        // 3. Save result + record trial start
        setStage("saving")
        await saveAnalysis(result)

        if (!trialStarted) {
          await recordTrialStart()
        }

        // 4. Done
        setStage("complete")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

        return { result, error: null }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Analysis failed. Please try again."
        setError(message)
        setStage("error")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        return { result: null, error: message }
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
