import { describe, expect, it } from "vitest"
import { weeklyActivity } from "@/lib/progress/weeklyActivity"

const DAY = 86_400_000
// Local noon keeps the day math stable across ±1h DST shifts.
const NOW = new Date(2026, 5, 22, 12, 0, 0).getTime()

describe("weeklyActivity", () => {
  it("returns 7 slots", () => {
    expect(weeklyActivity([], NOW)).toHaveLength(7)
  })

  it("is all-false with no analyses", () => {
    expect(weeklyActivity([], NOW)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ])
  })

  it("marks today in the last slot", () => {
    const week = weeklyActivity([NOW], NOW)
    expect(week[6]).toBe(true)
    expect(week.slice(0, 6)).toEqual([false, false, false, false, false, false])
  })

  it("marks six days ago in the first slot", () => {
    const week = weeklyActivity([NOW - 6 * DAY], NOW)
    expect(week[0]).toBe(true)
    expect(week.slice(1)).toEqual([false, false, false, false, false, false])
  })

  it("ignores activity older than 7 days", () => {
    expect(weeklyActivity([NOW - 7 * DAY], NOW)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ])
  })

  it("dedupes multiple analyses on the same day", () => {
    const week = weeklyActivity([NOW, NOW - 1000, NOW - 2000], NOW)
    expect(week[6]).toBe(true)
    expect(week.filter(Boolean)).toHaveLength(1)
  })
})
