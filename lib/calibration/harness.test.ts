/**
 * Release-bar regression gate for scoring calibration (CALIBRATION.md §8).
 *
 * Runs every committed fixture under lib/calibration/fixtures/ through the
 * real scoring engine and asserts the two hard bars:
 *   T1 — measurement: per scored dimension, |engine value − ground truth|
 *        must be ≤ 5° median and ≤ 8° p95.
 *   T2 — behaviour: zero ordinal violations — a rep labeled better must
 *        never score below a rep labeled worse within the same ladder group.
 *
 * Until fixtures exist the bars can't be evaluated, so the tests skip
 * (visibly) instead of passing vacuously. To create fixtures: film per
 * CALIBRATION.md §7, export MoveNet keypoints from the dev client
 * (EXPO_PUBLIC_EXPORT_KEYPOINTS=1 — see services/keypointExport.ts), and
 * drop the JSON under lib/calibration/fixtures/<movement>/.
 *
 * Once green, this is the permanent regression gate: the day a dependency
 * bump shifts pose output or angle math (BUILD_STATE.md §13 #4), CI goes
 * red here instead of users getting wrong scores.
 */

import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { formatReport, loadFixtures, runCalibration } from "./harness"

// String form of import.meta.url — avoids the DOM-URL vs node-URL type clash
// under Expo's tsconfig (same workaround as vitest.config.ts).
const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures")

const fixtures = existsSync(FIXTURE_DIR) ? loadFixtures(FIXTURE_DIR) : []
const t1FixtureCount = fixtures.filter(
  (f) =>
    f.labels.groundTruthAngles &&
    Object.keys(f.labels.groundTruthAngles).length > 0,
).length
const t2GroupCount = new Set(
  fixtures
    .filter((f) => f.labels.group && f.labels.rank != null)
    .map((f) => f.labels.group!),
).size

const report = fixtures.length > 0 ? runCalibration(FIXTURE_DIR) : null

describe("calibration release bars (CALIBRATION.md §8)", () => {
  it.runIf(fixtures.length === 0)(
    "no fixtures committed yet — bars not evaluated, not passed (see file header for how to add them)",
    () => {
      expect(fixtures).toHaveLength(0)
    },
  )

  it.skipIf(t1FixtureCount === 0)(
    "T1 — measurement: every scored dimension ≤ 5° median / ≤ 8° p95 vs ground truth",
    () => {
      // Guard against a silent no-op: fixtures carry groundTruthAngles, so at
      // least one comparison must have happened. Zero means the keys don't
      // match the spec's dimension ids (CALIBRATION.md §5 key alignment).
      if (report!.t1.errors.length === 0) {
        throw new Error(
          `${t1FixtureCount} fixture(s) carry groundTruthAngles but produced ZERO comparisons — ` +
            "the groundTruthAngles keys don't match any scored dimension id. " +
            "Align them to the movement spec's dimension ids (CALIBRATION.md §5).",
        )
      }

      const failing = Object.entries(report!.t1.byDimension).filter(
        ([, s]) => !s.pass,
      )
      if (failing.length > 0) {
        const failingIds = new Set(failing.map(([dim]) => dim))
        const worst = [...report!.t1.errors]
          .filter((e) => failingIds.has(e.dimensionId))
          .sort((a, b) => b.absError - a.absError)
          .slice(0, 5)
        throw new Error(
          `T1 bar missed on ${failing.length} dimension(s):\n` +
            failing
              .map(
                ([dim, s]) =>
                  `  ${dim}: median ${s.median.toFixed(1)}° (bar 5°), p95 ${s.p95.toFixed(1)}° (bar 8°), n=${s.n}`,
              )
              .join("\n") +
            "\n\nWorst fixtures:\n" +
            worst
              .map(
                (e) =>
                  `  ${e.fixtureId} · ${e.dimensionId}: measured ${e.measured.toFixed(1)}° vs truth ${e.groundTruth.toFixed(1)}° (Δ ${e.absError.toFixed(1)}°)`,
              )
              .join("\n") +
            "\n\nFull report:\n" +
            formatReport(report!),
        )
      }

      expect(report!.t1.errors.length).toBeGreaterThan(0)
    },
  )

  it.skipIf(t2GroupCount === 0)(
    "T2 — behaviour: zero ordinal violations across every ladder group",
    () => {
      const { violations, groupsChecked } = report!.t2
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} ordinal violation(s) across ${groupsChecked} ladder group(s):\n` +
            violations
              .map(
                (v) =>
                  `  ${v.group}: "${v.betterId}" (rank ${v.betterRank}) scored ${v.betterScore}, ` +
                  `below "${v.worseId}" (rank ${v.worseRank}) at ${v.worseScore}`,
              )
              .join("\n") +
            "\n\nAn inversion is usually a threshold or key-frame-selection bug; " +
            "a genuine tie must be labeled tie:true on the fixture (CALIBRATION.md §3.2).",
        )
      }

      expect(report!.t2.pass).toBe(true)
      expect(groupsChecked).toBe(t2GroupCount)
    },
  )
})
