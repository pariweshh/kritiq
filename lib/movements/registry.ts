/**
 * Movement registry — resolves an exercise id to the Movement that scores it.
 *
 * The single source of truth for which exercises are scorable on device. Add a
 * movement here (and its exercise ids) to make it live; ids with no movement are
 * "coming soon" upstream.
 */

import { bicepCurl } from "@/lib/movements/bicepCurl"
import { forwardLunge } from "@/lib/movements/forwardLunge"
import { gluteBridge } from "@/lib/movements/gluteBridge"
import { overheadPress } from "@/lib/movements/overheadPress"
import { plank } from "@/lib/movements/plank"
import { pushup } from "@/lib/movements/pushup"
import { reverseLunge } from "@/lib/movements/reverseLunge"
import { squat } from "@/lib/movements/squat"
import type { Movement } from "@/lib/movements/types"
import { wallSit } from "@/lib/movements/wallSit"

// NOTE: `deadlift` (lib/movements/deadlift.ts) is intentionally NOT registered
// yet. Unlike the other Tier A movements, `deadlift` already has a home card +
// ExerciseId, and the home gate is `isComingSoon = !getMovementForExercise(id)`,
// so registering it would flip its "coming soon" card to enabled + free before
// the paywall exists. It is fully built + unit-tested (the test imports the spec
// directly) and gets registered here in Phase 3 alongside the RevenueCat Pro
// gating that reveals the Tier A set as Pro-locked.
const MOVEMENTS: readonly Movement[] = [
  squat,
  pushup,
  plank,
  reverseLunge,
  forwardLunge,
  gluteBridge,
  overheadPress,
  bicepCurl,
  wallSit,
]

export function getMovementForExercise(
  exerciseId: string,
): Movement | undefined {
  return MOVEMENTS.find((m) => m.exerciseIds.includes(exerciseId))
}
