/**
 * lib/calibration/harness.ts  — STUB (wire real imports to your repo)
 *
 * Runs the deterministic scoring engine over labeled keypoint fixtures and reports:
 *   T1 (measurement): |engine dimension.value − groundTruthAngle| per scored dimension
 *   T2 (behaviour):   ordinal violations within each labeled `group` (better rank must score >=)
 *
 * Pure + device-free by design (fixtures are extracted keypoints, never video).
 * Run standalone:   npx tsx lib/calibration/harness.ts
 * Or assert in CI:  see lib/calibration/harness.test.ts (§4 of CALIBRATION.md)
 *
 * Release bars (CALIBRATION.md §1/§8):
 *   T1: ≤ 5° median, ≤ 8° p95 per dimension     T2: zero ordinal violations
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { scoreMovement } from "../movements/engine";
import { getMovementForExercise } from "../movements/registry";
import type { MovementScore } from "../movements/types";
import { KEYPOINT_NAMES, type Pose } from "../pose/types";

// ── Fixture shape (CALIBRATION.md §5) ────────────────────────────────────────
type RawKeypoint = [y: number, x: number, score: number];
interface Fixture {
  id: string;
  movementId: string;
  exerciseId: string;
  capturedWith: string;
  frames: RawKeypoint[][]; // per frame: 17 COCO keypoints, KEYPOINT_NAMES order
  /** Source clip width/height ratio; defaults to 1 (square) when not recorded.
   *  Set it for non-square footage — the geometry layer isotropizes angles
   *  using this, so an unset aspect ratio on a non-square clip skews T1. */
  aspectRatio?: number;
  labels: {
    group?: string;
    rank?: number; // 1 = best in group; lower is better
    tie?: boolean;
    groundTruthAngles?: Record<string, number>; // dimensionId -> degrees
    groundTruthSource?: "protractor" | "mediapipe" | "opencap";
    failureMode?: string | null;
    nuisance?: string[];
  };
}

/** Fixture frames are raw COCO tuples; the engine scores `Pose` objects. */
function toPose(frame: RawKeypoint[], aspectRatio: number): Pose {
  const keypoints = frame.map(([y, x, score], i) => ({
    name: KEYPOINT_NAMES[i],
    x,
    y,
    score,
  }));
  const meanScore =
    keypoints.reduce((sum, kp) => sum + kp.score, 0) / keypoints.length;
  return { keypoints, meanScore, aspectRatio };
}

// ── Report shapes ────────────────────────────────────────────────────────────
interface DimensionError {
  fixtureId: string;
  movementId: string;
  dimensionId: string;
  groundTruth: number;
  measured: number;
  absError: number;
}
interface OrdinalViolation {
  group: string;
  movementId: string;
  betterId: string;
  betterRank: number;
  betterScore: number;
  worseId: string;
  worseRank: number;
  worseScore: number;
}
interface CalibrationReport {
  t1: {
    errors: DimensionError[];
    byDimension: Record<
      string,
      { median: number; p95: number; n: number; pass: boolean }
    >;
  };
  t2: { violations: OrdinalViolation[]; groupsChecked: number; pass: boolean };
}

const T1_MEDIAN_MAX = 5;
const T1_P95_MAX = 8;

// ── Load ─────────────────────────────────────────────────────────────────────
export function loadFixtures(dir: string): Fixture[] {
  const out: Fixture[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith(".json"))
        out.push(JSON.parse(readFileSync(p, "utf8")) as Fixture);
    }
  };
  walk(dir);
  return out;
}

// ── Run one fixture through the engine ───────────────────────────────────────
function runFixture(f: Fixture): MovementScore {
  const movement = getMovementForExercise(f.exerciseId);
  if (!movement)
    throw new Error(
      `No movement spec for exercise "${f.exerciseId}" (fixture ${f.id})`,
    );
  const poses = f.frames.map((frame) => toPose(frame, f.aspectRatio ?? 1));
  return scoreMovement(movement, poses);
}

// ── T1: measurement error ────────────────────────────────────────────────────
function collectT1(fixtures: Fixture[]): DimensionError[] {
  const errs: DimensionError[] = [];
  for (const f of fixtures) {
    const gt = f.labels.groundTruthAngles;
    if (!gt) continue;
    const score = runFixture(f);
    for (const [dimId, truth] of Object.entries(gt)) {
      const dim = score.dimensions.find((d) => d.id === dimId);
      if (!dim) {
        console.warn(
          `⚠ fixture ${f.id}: groundTruth key "${dimId}" has no matching scored dimension (check §5 key alignment)`,
        );
        continue;
      }
      errs.push({
        fixtureId: f.id,
        movementId: f.movementId,
        dimensionId: dimId,
        groundTruth: truth,
        measured: dim.value,
        absError: Math.abs(dim.value - truth),
      });
    }
  }
  return errs;
}

function summariseT1(
  errors: DimensionError[],
): CalibrationReport["t1"]["byDimension"] {
  const groups: Record<string, number[]> = {};
  for (const e of errors) (groups[e.dimensionId] ??= []).push(e.absError);
  const out: CalibrationReport["t1"]["byDimension"] = {};
  for (const [dim, vals] of Object.entries(groups)) {
    const sorted = [...vals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 =
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    out[dim] = {
      median,
      p95,
      n: sorted.length,
      pass: median <= T1_MEDIAN_MAX && p95 <= T1_P95_MAX,
    };
  }
  return out;
}

// ── T2: ordinal consistency within each group ────────────────────────────────
function collectT2(fixtures: Fixture[]): {
  violations: OrdinalViolation[];
  groupsChecked: number;
} {
  const byGroup: Record<string, Fixture[]> = {};
  for (const f of fixtures)
    if (f.labels.group && f.labels.rank != null)
      (byGroup[f.labels.group] ??= []).push(f);

  const violations: OrdinalViolation[] = [];
  for (const [group, members] of Object.entries(byGroup)) {
    const scored = members
      .map((f) => ({ f, total: runFixture(f).total }))
      .sort((a, b) => a.f.labels.rank! - b.f.labels.rank!);
    // rank ascending = best→worst. Better rank must not score lower than a worse rank.
    for (let i = 0; i < scored.length; i++) {
      for (let j = i + 1; j < scored.length; j++) {
        const better = scored[i],
          worse = scored[j];
        if (better.f.labels.tie || worse.f.labels.tie) continue;
        if (better.total < worse.total) {
          violations.push({
            group,
            movementId: better.f.movementId,
            betterId: better.f.id,
            betterRank: better.f.labels.rank!,
            betterScore: better.total,
            worseId: worse.f.id,
            worseRank: worse.f.labels.rank!,
            worseScore: worse.total,
          });
        }
      }
    }
  }
  return { violations, groupsChecked: Object.keys(byGroup).length };
}

// ── Public entry ─────────────────────────────────────────────────────────────
export function runCalibration(fixtureDir: string): CalibrationReport {
  const fixtures = loadFixtures(fixtureDir);
  const t1Errors = collectT1(fixtures);
  const byDimension = summariseT1(t1Errors);
  const { violations, groupsChecked } = collectT2(fixtures);
  return {
    t1: { errors: t1Errors, byDimension: byDimension },
    t2: { violations, groupsChecked, pass: violations.length === 0 },
  };
}

export function formatReport(r: CalibrationReport): string {
  const lines: string[] = ["# Calibration report", ""];
  lines.push("## T1 — measurement (°)");
  for (const [dim, s] of Object.entries(r.t1.byDimension)) {
    lines.push(
      `  ${s.pass ? "✅" : "❌"} ${dim.padEnd(12)} median ${s.median.toFixed(1)}  p95 ${s.p95.toFixed(1)}  (n=${s.n})`,
    );
  }
  lines.push(
    "",
    `## T2 — ordinal (${r.t2.groupsChecked} groups) ${r.t2.pass ? "✅ 0 violations" : `❌ ${r.t2.violations.length} violations`}`,
  );
  for (const v of r.t2.violations) {
    lines.push(
      `  ❌ ${v.group}: ${v.betterId}(rank ${v.betterRank}, ${v.betterScore}) scored below ${v.worseId}(rank ${v.worseRank}, ${v.worseScore})`,
    );
  }
  return lines.join("\n");
}

// ── CLI ──────────────────────────────────────────────────────────────────────
// TODO: adjust the default dir to your repo layout.
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] ?? join(__dirname, "fixtures");
  console.log(formatReport(runCalibration(dir)));
}
