import { describe, expect, it } from "vitest"

import {
  exerciseAccess,
  FREE_EXERCISE_IDS,
  isExerciseUnlocked,
  isFreeExercise,
  isProExercise,
} from "@/lib/movements/tiers"

const FREE_IDS = [
  "squat",
  "bodyweight_squat",
  "pushup",
  "plank",
  "reverse_lunge",
]
const PRO_IDS = [
  "forward_lunge",
  "glute_bridge",
  "overhead_press",
  "bicep_curl",
  "wall_sit",
  "deadlift",
]
const COMING_SOON_IDS = ["bench", "totally_unknown_id"]

describe("isFreeExercise", () => {
  it("is true for every free-tier id", () => {
    for (const id of FREE_IDS) {
      expect(isFreeExercise(id)).toBe(true)
    }
  })

  it("is false for Pro and spec-less ids", () => {
    for (const id of [...PRO_IDS, ...COMING_SOON_IDS]) {
      expect(isFreeExercise(id)).toBe(false)
    }
  })

  it("exposes the free set as the source of truth", () => {
    expect([...FREE_EXERCISE_IDS].sort()).toEqual([...FREE_IDS].sort())
  })
})

describe("isProExercise", () => {
  it("is true only for scorable, non-free movements", () => {
    for (const id of PRO_IDS) {
      expect(isProExercise(id)).toBe(true)
    }
  })

  it("is false for free movements", () => {
    for (const id of FREE_IDS) {
      expect(isProExercise(id)).toBe(false)
    }
  })

  it("is false for spec-less ids (coming soon, not Pro)", () => {
    for (const id of COMING_SOON_IDS) {
      expect(isProExercise(id)).toBe(false)
    }
  })

  it("treats a now-registered deadlift as Pro, not coming soon", () => {
    // Guards the registry: deadlift must be registered (so it is scorable) yet
    // stay out of the free set.
    expect(isProExercise("deadlift")).toBe(true)
    expect(exerciseAccess("deadlift")).toBe("pro")
  })
})

describe("exerciseAccess", () => {
  it("classifies free, pro, and coming-soon ids", () => {
    for (const id of FREE_IDS) expect(exerciseAccess(id)).toBe("free")
    for (const id of PRO_IDS) expect(exerciseAccess(id)).toBe("pro")
    for (const id of COMING_SOON_IDS)
      expect(exerciseAccess(id)).toBe("coming-soon")
  })
})

describe("isExerciseUnlocked", () => {
  it("always allows free movements regardless of premium", () => {
    for (const id of FREE_IDS) {
      expect(isExerciseUnlocked(id, false)).toBe(true)
      expect(isExerciseUnlocked(id, true)).toBe(true)
    }
  })

  it("gates Pro movements behind the premium flag", () => {
    for (const id of PRO_IDS) {
      expect(isExerciseUnlocked(id, false)).toBe(false)
      expect(isExerciseUnlocked(id, true)).toBe(true)
    }
  })

  it("never allows coming-soon movements, even for premium", () => {
    for (const id of COMING_SOON_IDS) {
      expect(isExerciseUnlocked(id, false)).toBe(false)
      expect(isExerciseUnlocked(id, true)).toBe(false)
    }
  })
})
