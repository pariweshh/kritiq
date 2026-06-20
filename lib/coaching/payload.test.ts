import { describe, expect, it } from "vitest"

import { toCoachPayload } from "@/lib/coaching/payload"
import type { DimensionScore, MovementScore } from "@/lib/movements/types"

function dim(over: Partial<DimensionScore> & { id: string }): DimensionScore {
  return {
    id: over.id,
    name: over.name ?? over.id,
    score: over.score ?? 0,
    value: over.value ?? 0,
    feedback: over.feedback ?? "",
  }
}

function score(over: Partial<MovementScore> = {}): MovementScore {
  return {
    movementId: over.movementId ?? "squat",
    total: over.total ?? 0,
    side: over.side ?? "left",
    dimensions: over.dimensions ?? [],
    lowConfidence: over.lowConfidence ?? false,
  }
}

describe("toCoachPayload", () => {
  it("maps a squat score into the generic dimensions[] shape", () => {
    const payload = toCoachPayload(
      score({
        movementId: "squat",
        total: 71,
        dimensions: [
          dim({ id: "depth", name: "Depth", score: 82, value: 131 }),
          dim({ id: "torso", name: "Torso Control", score: 56, value: 42 }),
        ],
      }),
      "bodyweight_squat",
    )

    expect(payload).toEqual({
      movementId: "squat",
      exercise: "bodyweight_squat",
      total: 71,
      dimensions: [
        { id: "depth", name: "Depth", score: 82, value: 131 },
        { id: "torso", name: "Torso Control", score: 56, value: 42 },
      ],
      lowConfidence: false,
    })
  })

  it("works for non-squat movements with arbitrary named dimensions", () => {
    const payload = toCoachPayload(
      score({
        movementId: "pushup",
        total: 64,
        dimensions: [
          dim({ id: "depth", name: "Depth", score: 70, value: 96 }),
          dim({ id: "bodyLine", name: "Body Line", score: 58, value: 14 }),
        ],
      }),
      "pushup",
    )

    expect(payload.movementId).toBe("pushup")
    expect(payload.exercise).toBe("pushup")
    expect(payload.dimensions.map((d) => d.name)).toEqual([
      "Depth",
      "Body Line",
    ])
  })

  it("preserves fractional dimension values (plank wobble) instead of rounding to 0", () => {
    const payload = toCoachPayload(
      score({
        movementId: "plank",
        total: 88,
        dimensions: [
          dim({ id: "bodyLine", name: "Body Line", score: 95, value: 4 }),
          dim({ id: "stability", name: "Stability", score: 80, value: 0.0312 }),
        ],
      }),
      "plank",
    )

    const stability = payload.dimensions.find((d) => d.id === "stability")
    expect(stability?.value).toBe(0.03)
    expect(stability?.value).not.toBe(0)
  })

  it("rounds raw values to 2 decimals", () => {
    const payload = toCoachPayload(
      score({
        dimensions: [dim({ id: "depth", name: "Depth", value: 131.4789 })],
      }),
      "squat",
    )
    expect(payload.dimensions[0].value).toBe(131.48)
  })

  it("passes the lowConfidence flag through", () => {
    const payload = toCoachPayload(
      score({ lowConfidence: true, dimensions: [dim({ id: "depth" })] }),
      "squat",
    )
    expect(payload.lowConfidence).toBe(true)
  })

  it("emits an empty dimensions array for an empty score", () => {
    const payload = toCoachPayload(score(), "squat")
    expect(payload.dimensions).toEqual([])
  })
})
