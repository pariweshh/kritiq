/**
 * Consecutive-day activity streaks. Pure + immutable: every update returns a new
 * `StreakState`. Days are local calendar days so a streak reflects the user's
 * own midnight, and `longest` only ever grows.
 */

import type { StreakState } from "@/lib/progress/types"

const MS_PER_DAY = 86_400_000

/** Local calendar day key "YYYY-MM-DD" for a Unix-ms timestamp. */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp)
  const year = d.getFullYear()
  const month = `${d.getMonth() + 1}`.padStart(2, "0")
  const day = `${d.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Integer local-day index — increments by exactly 1 across each local midnight,
 * so day adjacency math is correct across month and year boundaries.
 */
export function dayNumber(timestamp: number): number {
  const d = new Date(timestamp)
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY
}

function dayNumberFromKey(key: string): number {
  const [year, month, day] = key.split("-").map(Number)
  return Date.UTC(year, month - 1, day) / MS_PER_DAY
}

/**
 * Fold one analysis timestamp into the running streak:
 * - first ever activity → current 1
 * - same local day as last activity → unchanged
 * - exactly the next local day → current + 1
 * - a gap of 2+ days → reset to 1
 * - an out-of-order (older) timestamp → unchanged (defensive)
 */
export function updateStreak(
  prev: StreakState,
  timestamp: number,
): StreakState {
  const key = dayKey(timestamp)

  if (prev.lastActiveDay === null) {
    return { current: 1, longest: Math.max(prev.longest, 1), lastActiveDay: key }
  }

  if (prev.lastActiveDay === key) {
    return prev
  }

  const diff = dayNumber(timestamp) - dayNumberFromKey(prev.lastActiveDay)
  if (diff <= 0) {
    // Same index (different key — shouldn't happen) or an older timestamp:
    // don't advance the streak.
    return prev
  }

  const current = diff === 1 ? prev.current + 1 : 1
  return {
    current,
    longest: Math.max(prev.longest, current),
    lastActiveDay: key,
  }
}
