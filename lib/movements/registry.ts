/**
 * Movement registry — resolves an exercise id to the Movement that scores it.
 *
 * The single source of truth for which exercises are scorable on device. Add a
 * movement here (and its exercise ids) to make it live; ids with no movement are
 * "coming soon" upstream.
 */

import { plank } from "@/lib/movements/plank"
import { pushup } from "@/lib/movements/pushup"
import { reverseLunge } from "@/lib/movements/reverseLunge"
import { squat } from "@/lib/movements/squat"
import type { Movement } from "@/lib/movements/types"

const MOVEMENTS: readonly Movement[] = [squat, pushup, plank, reverseLunge]

export function getMovementForExercise(
  exerciseId: string,
): Movement | undefined {
  return MOVEMENTS.find((m) => m.exerciseIds.includes(exerciseId))
}
