import { describe, expect, it } from "vitest"

import { computeLetterbox, mapToOriginal } from "@/lib/pose/transform"

describe("computeLetterbox", () => {
  it("does not pad a square frame", () => {
    const lb = computeLetterbox(512, 512, 256)
    expect(lb).toMatchObject({
      scale: 0.5,
      drawW: 256,
      drawH: 256,
      padX: 0,
      padY: 0,
    })
  })

  it("pads the short axis of a portrait frame", () => {
    const lb = computeLetterbox(1080, 1920, 256)
    expect(lb.drawH).toBe(256)
    expect(lb.drawW).toBe(144) // round(1080 * 256/1920)
    expect(lb.padX).toBe(56) // floor((256-144)/2)
    expect(lb.padY).toBe(0)
  })

  it("rejects non-positive dimensions", () => {
    expect(() => computeLetterbox(0, 100, 256)).toThrow()
  })
})

describe("mapToOriginal", () => {
  it("is identity at the center of a square frame", () => {
    const lb = computeLetterbox(512, 512, 256)
    expect(mapToOriginal(0.5, 0.5, lb)).toEqual({ x: 0.5, y: 0.5 })
  })

  it("undoes letterbox padding for a portrait frame", () => {
    const lb = computeLetterbox(1080, 1920, 256)
    // The original horizontal center sits at model x = (padX + drawW/2)/size.
    const modelXNorm = (lb.padX + lb.drawW / 2) / lb.size
    const { x } = mapToOriginal(modelXNorm, 0.5, lb)
    expect(x).toBeCloseTo(0.5, 5)
  })

  it("clamps out-of-frame coordinates into 0–1", () => {
    const lb = computeLetterbox(1080, 1920, 256)
    // x at the very left padding region maps negative → clamped to 0.
    expect(mapToOriginal(0, 0.5, lb).x).toBe(0)
  })
})
