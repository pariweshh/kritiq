import { describe, expect, it } from "vitest"

import { dayKey, dayNumber, updateStreak } from "@/lib/progress/streaks"
import type { StreakState } from "@/lib/progress/types"

// Build timestamps from LOCAL date parts so these tests are timezone-independent.
const at = (year: number, month: number, day: number, hour = 12): number =>
  new Date(year, month - 1, day, hour).getTime()

const empty: StreakState = { current: 0, longest: 0, lastActiveDay: null }

describe("dayKey / dayNumber", () => {
  it("formats a local day as YYYY-MM-DD", () => {
    expect(dayKey(at(2026, 6, 21))).toBe("2026-06-21")
  })

  it("gives adjacent local days a difference of exactly 1", () => {
    expect(dayNumber(at(2026, 6, 22)) - dayNumber(at(2026, 6, 21))).toBe(1)
  })

  it("crosses a month boundary correctly", () => {
    expect(dayNumber(at(2026, 7, 1)) - dayNumber(at(2026, 6, 30))).toBe(1)
  })
})

describe("updateStreak", () => {
  it("starts a streak at 1 on the first ever activity", () => {
    // Arrange + Act
    const next = updateStreak(empty, at(2026, 6, 21))

    // Assert
    expect(next).toEqual({
      current: 1,
      longest: 1,
      lastActiveDay: "2026-06-21",
    })
  })

  it("does not advance when the same day is logged twice", () => {
    const day1 = updateStreak(empty, at(2026, 6, 21, 9))
    const same = updateStreak(day1, at(2026, 6, 21, 20))

    expect(same.current).toBe(1)
    expect(same).toBe(day1) // returns the unchanged state by reference
  })

  it("increments on a consecutive day", () => {
    const day1 = updateStreak(empty, at(2026, 6, 21))
    const day2 = updateStreak(day1, at(2026, 6, 22))

    expect(day2.current).toBe(2)
    expect(day2.longest).toBe(2)
  })

  it("resets to 1 after a gap of 2+ days but keeps the longest", () => {
    let s = updateStreak(empty, at(2026, 6, 21))
    s = updateStreak(s, at(2026, 6, 22))
    s = updateStreak(s, at(2026, 6, 23)) // 3-day streak
    expect(s.current).toBe(3)

    const afterGap = updateStreak(s, at(2026, 6, 26)) // skipped 24, 25
    expect(afterGap.current).toBe(1)
    expect(afterGap.longest).toBe(3)
  })

  it("ignores an out-of-order older timestamp", () => {
    const day2 = updateStreak(updateStreak(empty, at(2026, 6, 21)), at(2026, 6, 22))
    const older = updateStreak(day2, at(2026, 6, 20))

    expect(older).toBe(day2)
  })

  it("does not mutate the previous state", () => {
    const prev: StreakState = { current: 2, longest: 5, lastActiveDay: "2026-06-21" }
    updateStreak(prev, at(2026, 6, 22))

    expect(prev).toEqual({ current: 2, longest: 5, lastActiveDay: "2026-06-21" })
  })
})
