/**
 * Weekly activity view — which of the last 7 local days (oldest → today) had at
 * least one analysis. Pure; reuses the streak module's local-day index so the
 * day boundaries match the user's own midnight (and month/year edges).
 */

import { dayNumber } from "@/lib/progress/streaks"

const DAYS = 7

export function weeklyActivity(
  timestamps: number[],
  now: number = Date.now(),
): boolean[] {
  const today = dayNumber(now)
  const activeDays = new Set(timestamps.map(dayNumber))
  return Array.from({ length: DAYS }, (_, i) =>
    activeDays.has(today - (DAYS - 1 - i)),
  )
}
