/**
 * Key-frame selectors. Pure: given a clip's frames and the camera-facing side,
 * return the single pose a movement's dimensions are measured at.
 */

import type { KeyFrameSelector } from "@/lib/movements/types"
import type { Pose, Side } from "@/lib/pose/types"

/**
 * Select the frame that minimises `angleAt` — the bottom of a rep (e.g. deepest
 * knee flexion for a squat, deepest elbow flexion for a pushup). NaN angles are
 * skipped; falls back to the first frame when none are measurable.
 */
export function deepestBy(
  angleAt: (pose: Pose, side: Side) => number,
): KeyFrameSelector {
  return (frames, side) => {
    let best = frames[0]
    let bestAngle = angleAt(frames[0], side)
    for (const frame of frames) {
      const angle = angleAt(frame, side)
      if (Number.isNaN(angle)) {
        continue
      }
      if (Number.isNaN(bestAngle) || angle < bestAngle) {
        best = frame
        bestAngle = angle
      }
    }
    return best
  }
}

/**
 * Select the frame that maximises `signalAt` — the clearest pose of a static
 * hold (e.g. a plank, which has no rep bottom to key on). NaN signals are
 * skipped; falls back to the first frame when none are measurable.
 */
export function clearestBy(
  signalAt: (pose: Pose, side: Side) => number,
): KeyFrameSelector {
  return (frames, side) => {
    let best = frames[0]
    let bestSignal = signalAt(frames[0], side)
    for (const frame of frames) {
      const signal = signalAt(frame, side)
      if (Number.isNaN(signal)) {
        continue
      }
      if (Number.isNaN(bestSignal) || signal > bestSignal) {
        best = frame
        bestSignal = signal
      }
    }
    return best
  }
}
