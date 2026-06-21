import { describe, expect, it } from "vitest"

import type { AnalysisResult, MetricScore } from "@/constants/types"
import {
  isNewBest,
  personalBestCount,
  updatePersonalBests,
} from "@/lib/progress/personalBests"
import type { PersonalBests } from "@/lib/progress/types"

const metric = (metricId: string, score: number): MetricScore => ({
  metricId,
  name: metricId,
  score,
  feedback: "",
})

const result = (
  overrides: Partial<AnalysisResult> & {
    exerciseId: string
    overallScore: number
    metrics: MetricScore[]
    timestamp: number
  },
): AnalysisResult => ({
  id: `${overrides.timestamp}`,
  exerciseName: overrides.exerciseId,
  summary: "",
  topStrength: "",
  topImprovement: "",
  tier: "DEVELOPING",
  ...overrides,
})

describe("updatePersonalBests", () => {
  it("records a baseline from the first analysis of an exercise", () => {
    const next = updatePersonalBests(
      {},
      result({
        exerciseId: "squat",
        overallScore: 71,
        metrics: [metric("depth", 82), metric("torso", 56)],
        timestamp: 1000,
      }),
    )

    expect(next.squat.bestOverall).toBe(71)
    expect(next.squat.bestOverallAt).toBe(1000)
    expect(next.squat.bestByMetric.depth).toEqual({ score: 82, at: 1000 })
    expect(next.squat.bestByMetric.torso).toEqual({ score: 56, at: 1000 })
  })

  it("raises overall + the beaten metric, keeps the unbeaten metric", () => {
    const base = updatePersonalBests(
      {},
      result({
        exerciseId: "squat",
        overallScore: 71,
        metrics: [metric("depth", 82), metric("torso", 56)],
        timestamp: 1000,
      }),
    )

    const next = updatePersonalBests(
      base,
      result({
        exerciseId: "squat",
        overallScore: 78,
        metrics: [metric("depth", 80), metric("torso", 74)], // depth lower, torso higher
        timestamp: 2000,
      }),
    )

    expect(next.squat.bestOverall).toBe(78)
    expect(next.squat.bestOverallAt).toBe(2000)
    expect(next.squat.bestByMetric.depth).toEqual({ score: 82, at: 1000 }) // unchanged
    expect(next.squat.bestByMetric.torso).toEqual({ score: 74, at: 2000 }) // raised
  })

  it("keeps the prior best when the new score is lower", () => {
    const base = updatePersonalBests(
      {},
      result({
        exerciseId: "squat",
        overallScore: 90,
        metrics: [metric("depth", 90)],
        timestamp: 1000,
      }),
    )

    const next = updatePersonalBests(
      base,
      result({
        exerciseId: "squat",
        overallScore: 60,
        metrics: [metric("depth", 60)],
        timestamp: 2000,
      }),
    )

    expect(next.squat.bestOverall).toBe(90)
    expect(next.squat.bestOverallAt).toBe(1000)
  })

  it("tracks different exercises independently", () => {
    let bests: PersonalBests = updatePersonalBests(
      {},
      result({
        exerciseId: "squat",
        overallScore: 71,
        metrics: [metric("depth", 82)],
        timestamp: 1000,
      }),
    )
    bests = updatePersonalBests(
      bests,
      result({
        exerciseId: "pushup",
        overallScore: 64,
        metrics: [metric("depth", 70)],
        timestamp: 2000,
      }),
    )

    expect(personalBestCount(bests)).toBe(2)
    expect(bests.squat.bestOverall).toBe(71)
    expect(bests.pushup.bestOverall).toBe(64)
  })

  it("does not mutate the previous bests", () => {
    const base = updatePersonalBests(
      {},
      result({
        exerciseId: "squat",
        overallScore: 71,
        metrics: [metric("depth", 82)],
        timestamp: 1000,
      }),
    )
    const snapshot = JSON.stringify(base)

    updatePersonalBests(
      base,
      result({
        exerciseId: "squat",
        overallScore: 99,
        metrics: [metric("depth", 99)],
        timestamp: 2000,
      }),
    )

    expect(JSON.stringify(base)).toBe(snapshot)
  })
})

describe("isNewBest", () => {
  it("is not a beaten PB on the first ever analysis (baseline only)", () => {
    const flags = isNewBest(
      {},
      result({
        exerciseId: "squat",
        overallScore: 71,
        metrics: [metric("depth", 82)],
        timestamp: 1000,
      }),
    )

    expect(flags.overall).toBe(false)
    expect(flags.metrics).toEqual([])
  })

  it("flags overall + the specific metrics that beat prior bests", () => {
    const base = updatePersonalBests(
      {},
      result({
        exerciseId: "squat",
        overallScore: 71,
        metrics: [metric("depth", 82), metric("torso", 56)],
        timestamp: 1000,
      }),
    )

    const flags = isNewBest(
      base,
      result({
        exerciseId: "squat",
        overallScore: 78,
        metrics: [metric("depth", 80), metric("torso", 74)],
        timestamp: 2000,
      }),
    )

    expect(flags.overall).toBe(true)
    expect(flags.metrics).toEqual(["torso"])
  })

  it("flags nothing when the result ties or trails the prior best", () => {
    const base = updatePersonalBests(
      {},
      result({
        exerciseId: "squat",
        overallScore: 78,
        metrics: [metric("depth", 82)],
        timestamp: 1000,
      }),
    )

    const flags = isNewBest(
      base,
      result({
        exerciseId: "squat",
        overallScore: 78, // tie, not a beat
        metrics: [metric("depth", 82)],
        timestamp: 2000,
      }),
    )

    expect(flags.overall).toBe(false)
    expect(flags.metrics).toEqual([])
  })
})
