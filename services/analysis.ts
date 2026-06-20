/**
 * On-device squat analysis orchestrator.
 *
 * Composes the verified device + pure layers into one end-to-end pass:
 *   extractFrames → estimatePose (per frame) → scoreSquat → buildSquatResult.
 *
 * Privacy (locked): the video and every extracted frame stay on device. Frames
 * are decoded only to read joint numbers, then deleted here BEFORE any network
 * call. Nothing is uploaded except the resulting numbers — the optional Gemini
 * coaching overlay sends only joint angles + scores (see services/coaching.ts).
 */

import { File } from "expo-file-system"

import config from "@/constants/config"
import type { Exercise } from "@/constants/exercises"
import type { AnalysisResult } from "@/constants/types"
import type { Pose } from "@/lib/pose/types"
import { hasScorablePose } from "@/lib/pose/quality"
import { scoreSquat, type SquatScore } from "@/lib/scoring/squat"
import { buildSquatResult } from "@/lib/scoring/squatResult"
import { toCoachPayload, tryCoaching } from "@/services/coaching"
import { extractFrames } from "@/services/frames"
import { estimatePose, type PoseFrame } from "@/services/pose"

const NO_POSE_MESSAGE =
  "Couldn't detect your body. Film side-on with your full body in frame and try again."

/** Best-effort: a leftover cache thumbnail is harmless, so never fail on cleanup. */
function deleteFrames(frames: readonly PoseFrame[]): void {
  for (const frame of frames) {
    try {
      new File(frame.uri).delete()
    } catch {
      // ignore — orphaned thumbnails are swept on next launch
    }
  }
}

/** Decode frames → poses → squat score. Frames are deleted before returning. */
async function scoreFromFrames(frames: readonly PoseFrame[]): Promise<SquatScore> {
  try {
    const poses: Pose[] = []
    for (const frame of frames) {
      poses.push(await estimatePose(frame))
    }

    // Hard no-person gate: MoveNet always emits a full skeleton, so reject
    // clips where the facing-side lower leg never shows real, full-frame
    // confidence (see lib/pose/quality). Keeps the soft per-joint
    // lowConfidence flag below untouched.
    if (!hasScorablePose(poses)) {
      throw new Error(NO_POSE_MESSAGE)
    }

    const score = scoreSquat(poses)
    if (Number.isNaN(score.total) || Number.isNaN(score.bottomKneeAngle)) {
      throw new Error(NO_POSE_MESSAGE)
    }
    return score
  } finally {
    deleteFrames(frames)
  }
}

export async function analyzeSquat(
  videoUri: string,
  durationMs: number,
  exercise: Exercise,
): Promise<AnalysisResult> {
  const frames = await extractFrames(
    videoUri,
    config.analysis.poseFrameCount,
    durationMs,
  )

  // Frames (and the source video upstream) are gone by the time this returns —
  // only numbers remain for the optional coaching overlay below.
  const score = await scoreFromFrames(frames)

  const result = buildSquatResult(score, {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    id: `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  })

  // Skip the proxy on unreliable reads — the refilm banner is the right UX there,
  // and it saves tokens on exactly the low-quality clips.
  if (score.lowConfidence) return result

  const headlines = await tryCoaching(toCoachPayload(score, exercise.id))
  if (!headlines) return result

  return {
    ...result,
    summary: headlines.summary,
    topStrength: headlines.topStrength,
    topImprovement: headlines.topImprovement,
  }
}
