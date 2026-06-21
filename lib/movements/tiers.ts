/**
 * Free vs Pro tiering — the single source of truth for which scorable movements
 * are free and which require a Pro entitlement.
 *
 * Pure + framework-free so it stays vitest-testable (the `lib/**` include) and is
 * the ONE place the split is defined — the UI never hardcodes it. It composes the
 * movement registry: an exercise with no Movement spec is "coming soon" (e.g.
 * bench), independent of tier, so a tier flag alone can't express that state.
 *
 *  - Free:  squat / bodyweight_squat, pushup, plank, reverse_lunge — unlimited
 *           forever.
 *  - Pro:   every other movement that HAS a spec (forward_lunge, glute_bridge,
 *           overhead_press, bicep_curl, wall_sit, deadlift).
 */

import { getMovementForExercise } from "@/lib/movements/registry"

/** Exercise ids that are free forever. The source of truth for the split. */
export const FREE_EXERCISE_IDS: ReadonlySet<string> = new Set([
  "squat",
  "bodyweight_squat",
  "pushup",
  "plank",
  "reverse_lunge",
])

/** Whether an exercise is in the free tier. */
export function isFreeExercise(exerciseId: string): boolean {
  return FREE_EXERCISE_IDS.has(exerciseId)
}

/**
 * Whether an exercise is Pro-gated: it must be scorable (have a Movement spec)
 * AND not be free. A spec-less id (bench) is "coming soon", not Pro.
 */
export function isProExercise(exerciseId: string): boolean {
  return (
    getMovementForExercise(exerciseId) !== undefined &&
    !isFreeExercise(exerciseId)
  )
}

/**
 * The packaging state of an exercise, independent of the current user:
 *  - "coming-soon" — no Movement spec yet (can't be scored at all).
 *  - "free"        — scorable and in the free tier.
 *  - "pro"         — scorable but Pro-gated.
 */
export type ExerciseAccess = "free" | "pro" | "coming-soon"

export function exerciseAccess(exerciseId: string): ExerciseAccess {
  // No spec wins regardless of tier — keeps bench (and future spec-less ids)
  // "coming soon" rather than accidentally Pro or free.
  if (!getMovementForExercise(exerciseId)) return "coming-soon"
  return isFreeExercise(exerciseId) ? "free" : "pro"
}

/**
 * Whether a given user may analyze this exercise right now. Free movements are
 * always allowed; Pro movements need an active Pro entitlement; coming-soon
 * movements are never analyzable.
 */
export function isExerciseUnlocked(
  exerciseId: string,
  isPremium: boolean,
): boolean {
  const access = exerciseAccess(exerciseId)
  if (access === "coming-soon") return false
  if (access === "pro") return isPremium
  return true
}
