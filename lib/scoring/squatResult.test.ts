import { describe, expect, it } from "vitest"

import type { SquatScore } from "@/lib/scoring/squat"
import { buildSquatResult } from "@/lib/scoring/squatResult"

const OPTS = {
  exerciseId: "squat",
  exerciseName: "Barbell Back Squat",
  id: "analysis_test",
  timestamp: 1_700_000_000_000,
}

function makeScore(overrides: Partial<SquatScore> = {}): SquatScore {
  return {
    total: 80,
    depth: 90,
    torso: 70,
    bottomKneeAngle: 85,
    bottomTorsoLean: 25,
    side: "left",
    lowConfidence: false,
    ...overrides,
  }
}

describe("buildSquatResult", () => {
  it("maps the 0-100 scores onto the result and its two dimensions", () => {
    const result = buildSquatResult(makeScore(), OPTS)

    expect(result.overallScore).toBe(80)
    expect(result.id).toBe("analysis_test")
    expect(result.timestamp).toBe(1_700_000_000_000)
    expect(result.exerciseName).toBe("Barbell Back Squat")
    expect(result.metrics).toHaveLength(2)
    expect(result.metrics[0]).toMatchObject({ metricId: "depth", score: 90 })
    expect(result.metrics[1]).toMatchObject({
      metricId: "torso",
      name: "Torso Control",
      score: 70,
    })
  })

  it.each([
    [92, "ELITE"],
    [75, "ADVANCED"],
    [55, "DEVELOPING"],
    [30, "NEEDS WORK"],
  ])("derives tier %i -> %s from getScoreTier", (total, tier) => {
    const result = buildSquatResult(makeScore({ total }), OPTS)
    expect(result.tier).toBe(tier)
  })

  it("coaches the weaker dimension: depth < torso -> sit deeper", () => {
    const result = buildSquatResult(
      makeScore({ depth: 40, torso: 88, bottomKneeAngle: 130 }),
      OPTS,
    )
    expect(result.topImprovement.toLowerCase()).toContain("deeper")
    expect(result.topStrength.toLowerCase()).toContain("torso")
  })

  it("coaches the weaker dimension: torso < depth -> stay taller", () => {
    const result = buildSquatResult(
      makeScore({ depth: 95, torso: 35, bottomTorsoLean: 55 }),
      OPTS,
    )
    expect(result.topImprovement.toLowerCase()).toContain("taller")
    expect(result.topStrength.toLowerCase()).toContain("depth")
  })

  it("flags low confidence and appends a refilm note to the summary", () => {
    const result = buildSquatResult(makeScore({ lowConfidence: true }), OPTS)
    expect(result.lowConfidence).toBe(true)
    expect(result.summary.toLowerCase()).toContain("refilm")
  })

  it("omits the refilm note when confidence is fine", () => {
    const result = buildSquatResult(makeScore({ lowConfidence: false }), OPTS)
    expect(result.lowConfidence).toBe(false)
    expect(result.summary.toLowerCase()).not.toContain("refilm")
  })

  it("produces non-empty coaching text for every field", () => {
    const result = buildSquatResult(makeScore(), OPTS)
    expect(result.summary.length).toBeGreaterThan(0)
    expect(result.topStrength.length).toBeGreaterThan(0)
    expect(result.topImprovement.length).toBeGreaterThan(0)
    for (const metric of result.metrics) {
      expect(metric.feedback.length).toBeGreaterThan(0)
    }
  })
})
