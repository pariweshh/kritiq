/**
 * Per-day analysis counts for the last `days` local days (oldest → today), for a
 * consistency heatmap. Pure; reuses the streak module's local-day index so day
 * boundaries match the user's own midnight.
 */

import { dayNumber } from "@/lib/progress/streaks"

export function dailyCounts(
  timestamps: number[],
  days: number,
  now: number = Date.now(),
): number[] {
  const today = dayNumber(now)
  const counts = new Array<number>(Math.max(0, days)).fill(0)
  for (const ts of timestamps) {
    const offset = today - dayNumber(ts) // 0 = today, 1 = yesterday, …
    if (offset >= 0 && offset < days) {
      counts[days - 1 - offset] += 1 // oldest at index 0, today at the end
    }
  }
  return counts
}
