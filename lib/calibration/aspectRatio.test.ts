/**
 * Proof that the isotropic aspect-ratio scaling is applied — and applied in
 * the right direction — through the full calibration path:
 *   fixture JSON → loadFixtures → toPose → scoreMovement → T1 comparison.
 *
 * The pose below is built so the metric (isotropic) angles are analytically
 * EXACT on a 16:9 frame, and so every wrong convention lands far away:
 *
 *   knee (hip→knee→ankle): normalized Δx of 0.1125 = 9/80, and
 *   9/80 · 16/9 = 0.2 exactly → metric vectors (0, −0.2) and (0.2, 0.2)
 *   → exactly 135°. Unscaled (aspect ratio ignored) → 150.64°;
 *   inverted convention (x · height/width) → 162.44°.
 *
 *   torso lean (shoulder over hip): normalized Δx of 0.16875 = 27/160, and
 *   27/160 · 16/9 = 0.3 exactly → atan2(0.3, 0.3) = exactly 45°.
 *   Unscaled → 29.36°; inverted → 17.56°.
 *
 * So the ≤0.01° assertions can only pass when x is scaled by aspectRatio
 * (width/height — lib/pose/types.ts, services/pose.ts:167), and the >10°
 * control on the same frames with the fixture's aspectRatio omitted proves
 * the test actually exercises the scaling rather than passing vacuously.
 *
 * KEEP THE KEYPOINTS IN SYNC with self_check() in
 * tools/calibration/extract_and_crosscheck.py — identical input must yield
 * identical angles in TS and Python, or the T1 cross-check measures our
 * implementation drift instead of estimator drift.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, describe, expect, it } from "vitest"

import { runCalibration } from "./harness"

const AR = 16 / 9
const KNEE_TRUTH_DEG = 135
const TORSO_TRUTH_DEG = 45

// One frame, 17 COCO keypoints as [y, x, score] in KEYPOINT_NAMES order.
// Only the left shoulder/hip/knee/ankle carry the analytic geometry; the
// rest are plausible filler. Left side outranks right so pickFacingSide is
// deterministic.
const FRAME: number[][] = [
  [0.05, 0.55, 0.9], // nose
  [0.04, 0.54, 0.9], // left_eye
  [0.04, 0.56, 0.9], // right_eye
  [0.05, 0.53, 0.9], // left_ear
  [0.05, 0.57, 0.9], // right_ear
  [0.1, 0.66875, 0.95], // left_shoulder  ← torso geometry
  [0.1, 0.67, 0.6], // right_shoulder
  [0.25, 0.7, 0.9], // left_elbow
  [0.25, 0.71, 0.6], // right_elbow
  [0.35, 0.72, 0.9], // left_wrist
  [0.35, 0.73, 0.6], // right_wrist
  [0.4, 0.5, 0.95], // left_hip       ← knee + torso geometry
  [0.4, 0.51, 0.6], // right_hip
  [0.6, 0.5, 0.95], // left_knee      ← knee geometry
  [0.6, 0.51, 0.6], // right_knee
  [0.8, 0.6125, 0.95], // left_ankle     ← knee geometry
  [0.8, 0.62, 0.6], // right_ankle
]

function fixture(id: string, aspectRatio?: number) {
  return {
    id,
    movementId: "squat",
    exerciseId: "bodyweight_squat",
    capturedWith: "synthetic",
    // undefined is dropped by JSON.stringify → toPose falls back to 1.
    aspectRatio,
    frames: [FRAME],
    labels: {
      groundTruthAngles: { depth: KNEE_TRUTH_DEG, torso: TORSO_TRUTH_DEG },
      groundTruthSource: "protractor" as const,
    },
  }
}

const dir = mkdtempSync(join(tmpdir(), "kritiq-ar-test-"))
writeFileSync(join(dir, "ar_correct.json"), JSON.stringify(fixture("ar_correct", AR)))
writeFileSync(join(dir, "ar_unset.json"), JSON.stringify(fixture("ar_unset")))

const report = runCalibration(dir)

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

function errorFor(fixtureId: string, dimensionId: string) {
  const found = report.t1.errors.find(
    (e) => e.fixtureId === fixtureId && e.dimensionId === dimensionId,
  )
  if (!found) {
    throw new Error(`no T1 error entry for ${fixtureId}/${dimensionId}`)
  }
  return found
}

describe("isotropic aspect-ratio scaling through the calibration path", () => {
  it("reproduces analytically exact angles on a 16:9 fixture to ≤0.01°", () => {
    const depth = errorFor("ar_correct", "depth")
    const torso = errorFor("ar_correct", "torso")
    expect(depth.measured).toBeCloseTo(KNEE_TRUTH_DEG, 2)
    expect(torso.measured).toBeCloseTo(TORSO_TRUTH_DEG, 2)
    expect(depth.absError).toBeLessThanOrEqual(0.01)
    expect(torso.absError).toBeLessThanOrEqual(0.01)
  })

  it("control: the same frames WITHOUT aspectRatio miss the truth by >10° (the test exercises the scaling)", () => {
    // Unscaled lands at ~150.64° / ~29.36°; an inverted width/height
    // convention would land at ~162.44° / ~17.56° and fail the test above.
    expect(errorFor("ar_unset", "depth").absError).toBeGreaterThan(10)
    expect(errorFor("ar_unset", "torso").absError).toBeGreaterThan(10)
  })
})
