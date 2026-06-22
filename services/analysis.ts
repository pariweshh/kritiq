/**
 * On-device movement analysis orchestrator.
 *
 * Composes the verified device + pure layers into one end-to-end pass, driven by
 * a Movement spec:
 *   extractFrames → estimatePose (per frame) → scoreMovement → buildMovementResult.
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
import { scoreMovement, selectKeyPose } from "@/lib/movements/engine"
import { buildMovementResult } from "@/lib/movements/result"
import type { Movement, MovementScore } from "@/lib/movements/types"
import { hasScorablePose } from "@/lib/pose/quality"
import type { Pose } from "@/lib/pose/types"
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

/** Decode frames → poses → movement score. Frames are deleted before returning. */
async function scoreFromFrames(
  frames: readonly PoseFrame[],
  movement: Movement,
): Promise<{ score: MovementScore; keyPose: Pose }> {
  try {
    const poses: Pose[] = []
    for (const frame of frames) {
      poses.push(await estimatePose(frame))
    }

    // Hard no-person gate: MoveNet always emits a full skeleton, so reject clips
    // where the movement's facing-side distal joints never show real, full-frame
    // confidence (see lib/pose/quality). Keeps the soft per-joint lowConfidence
    // flag in the engine untouched.
    if (!hasScorablePose(poses, movement)) {
      throw new Error(NO_POSE_MESSAGE)
    }

    const score = scoreMovement(movement, poses)
    if (
      Number.isNaN(score.total) ||
      score.dimensions.some((d) => Number.isNaN(d.value))
    ) {
      throw new Error(NO_POSE_MESSAGE)
    }
    // Keep the scored key pose (numbers only) for the form-snapshot overlay;
    // the frame images are still deleted in `finally` below.
    const keyPose = selectKeyPose(movement, poses)
    return { score, keyPose }
  } finally {
    deleteFrames(frames)
  }
}

export async function analyzeMovement(
  videoUri: string,
  durationMs: number,
  exercise: Exercise,
  movement: Movement,
): Promise<AnalysisResult> {
  const frames = await extractFrames(
    videoUri,
    config.analysis.poseFrameCount,
    durationMs,
  )

  // Frames (and the source video upstream) are gone by the time this returns —
  // only numbers remain for the optional coaching overlay below.
  const { score, keyPose } = await scoreFromFrames(frames, movement)

  const result = buildMovementResult(movement, score, {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    id: `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    pose: keyPose,
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
