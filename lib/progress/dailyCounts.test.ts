import { describe, expect, it } from "vitest"
import { dailyCounts } from "@/lib/progress/dailyCounts"

const DAY = 86_400_000
// Local noon keeps the day math stable across ±1h DST shifts.
const NOW = new Date(2026, 5, 22, 12, 0, 0).getTime()

describe("dailyCounts", () => {
  it("returns `days` zeros with no analyses", () => {
    expect(dailyCounts([], 7, NOW)).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it("counts today in the last slot", () => {
    const counts = dailyCounts([NOW], 7, NOW)
    expect(counts[6]).toBe(1)
    expect(counts.slice(0, 6)).toEqual([0, 0, 0, 0, 0, 0])
  })

  it("sums multiple analyses on the same day", () => {
    const counts = dailyCounts([NOW, NOW - 1000, NOW - 2000], 7, NOW)
    expect(counts[6]).toBe(3)
  })

  it("places older days earlier in the array", () => {
    const counts = dailyCounts([NOW - 6 * DAY], 7, NOW)
    expect(counts[0]).toBe(1)
    expect(counts.slice(1)).toEqual([0, 0, 0, 0, 0, 0])
  })

  it("ignores analyses outside the window", () => {
    expect(dailyCounts([NOW - 7 * DAY], 7, NOW)).toEqual([0, 0, 0, 0, 0, 0, 0])
  })
})
