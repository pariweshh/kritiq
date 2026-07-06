/**
 * Dev-only calibration fixture export (CALIBRATION.md §6's "debug hook").
 *
 * When BOTH gates are on — a __DEV__ build AND EXPO_PUBLIC_EXPORT_KEYPOINTS=1
 * in .env — every analyzed clip's MoveNet keypoints are logged to the Metro
 * console as a CALIBRATION.md §5 fixture JSON, wrapped in grep-able markers.
 *
 * Privacy: numbers only — [y, x, score] tuples, no video, no pixels — and the
 * output goes to the local dev console, never the network. __DEV__ is false
 * in any production build, so this cannot ship or fire for real users.
 *
 * Workflow:
 *   1. Add EXPO_PUBLIC_EXPORT_KEYPOINTS=1 to .env, restart the dev server.
 *   2. Film/analyze a clip in the dev client.
 *   3. Copy the JSON between the [kritiq:fixture:begin/end] markers from the
 *      Metro log into lib/calibration/fixtures/<movement>/<name>.json and
 *      hand-fill `labels` (CALIBRATION.md §5/§7). Pass the same file to
 *      tools/calibration/extract_and_crosscheck.py via --movenet for the
 *      MediaPipe T1 cross-check.
 */

import type { Pose } from "@/lib/pose/types"

const EXPORT_ENABLED = process.env.EXPO_PUBLIC_EXPORT_KEYPOINTS === "1"

/** 5 decimals ≈ 1/100,000th of the frame — plenty for T1, keeps logs small. */
function round5(value: number): number {
  return Math.round(value * 1e5) / 1e5
}

export function maybeExportFixture(
  poses: readonly Pose[],
  movementId: string,
  exerciseId: string,
): void {
  if (!__DEV__ || !EXPORT_ENABLED || poses.length === 0) {
    return
  }

  const fixture = {
    id: `${exerciseId}_${Date.now()}`,
    movementId,
    exerciseId,
    capturedWith: "moveNet_thunder",
    aspectRatio: round5(poses[0].aspectRatio),
    frames: poses.map((pose) =>
      pose.keypoints.map((kp) => [round5(kp.y), round5(kp.x), round5(kp.score)]),
    ),
    labels: {
      // Hand-fill per CALIBRATION.md §5/§7 after saving the file.
      group: null,
      rank: null,
      tie: false,
      groundTruthAngles: {},
      failureMode: null,
      nuisance: [],
    },
  }

  console.log("[kritiq:fixture:begin]")
  console.log(JSON.stringify(fixture))
  console.log("[kritiq:fixture:end]")
}
