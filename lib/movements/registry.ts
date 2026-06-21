/**
 * Movement registry — resolves an exercise id to the Movement that scores it.
 *
 * The single source of truth for which exercises are scorable on device. Add a
 * movement here (and its exercise ids) to make it live; ids with no movement are
 * "coming soon" upstream.
 */

import { bicepCurl } from "@/lib/movements/bicepCurl"
import { deadlift } from "@/lib/movements/deadlift"
import { forwardLunge } from "@/lib/movements/forwardLunge"
import { gluteBridge } from "@/lib/movements/gluteBridge"
import { overheadPress } from "@/lib/movements/overheadPress"
import { plank } from "@/lib/movements/plank"
import { pushup } from "@/lib/movements/pushup"
import { reverseLunge } from "@/lib/movements/reverseLunge"
import { squat } from "@/lib/movements/squat"
import type { Movement } from "@/lib/movements/types"
import { wallSit } from "@/lib/movements/wallSit"

// `deadlift` is registered but Pro-gated: the home screen reveals it (and the
// other Tier A movements) behind a Pro lock via `lib/movements/tiers`, so being
// scorable no longer means free. Anything NOT in `tiers.FREE_EXERCISE_IDS` is
// Pro; `bench` stays "coming soon" because it has no spec here.
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
  deadlift,
]

export function getMovementForExercise(
  exerciseId: string,
): Movement | undefined {
  return MOVEMENTS.find((m) => m.exerciseIds.includes(exerciseId))
}
