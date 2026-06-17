/**
 * Exercise Library
 * Each exercise belongs to a category and has specific metrics the AI evaluates.
 */

export interface ExerciseMetric {
  id: string
  name: string
  description: string // What the AI looks for
}

export type ExerciseCategory = "anywhere" | "gym"

export interface Exercise {
  id: string
  name: string
  shortName: string
  icon: string
  category: ExerciseCategory
  metrics: ExerciseMetric[]
  tips: string[]
}

export const CATEGORY_LABELS: Record<
  ExerciseCategory,
  { title: string; subtitle: string }
> = {
  anywhere: { title: "ANYWHERE", subtitle: "No equipment needed" },
  gym: { title: "GYM", subtitle: "Equipment required" },
}

export const exercises: Exercise[] = [
  {
    id: "bodyweight_squat",
    name: "Bodyweight Squat",
    shortName: "BW Squat",
    icon: "🦵",
    category: "anywhere",
    metrics: [
      {
        id: "depth",
        name: "Depth",
        description:
          "Hip crease descending to or below knee line at the bottom of the movement",
      },
      {
        id: "knee_tracking",
        name: "Knee Tracking",
        description: "Knees tracking over toes without caving inward (valgus)",
      },
      {
        id: "torso_position",
        name: "Torso Position",
        description:
          "Upright torso with neutral spine, no excessive forward lean or rounding",
      },
      {
        id: "balance",
        name: "Balance & Control",
        description:
          "Even weight on full foot, no heel rise, controlled tempo up and down",
      },
    ],
    tips: [
      "Film from a 45° angle (front-side)",
      "Full body from head to feet visible",
      "Include at least one full rep",
    ],
  },
  {
    id: "squat",
    name: "Barbell Back Squat",
    shortName: "Squat",
    icon: "🏋️",
    category: "gym",
    metrics: [
      {
        id: "depth",
        name: "Depth",
        description: "Hip crease below knee line at the bottom of the movement",
      },
      {
        id: "knee_tracking",
        name: "Knee Tracking",
        description: "Knees tracking over toes without caving inward (valgus)",
      },
      {
        id: "back_angle",
        name: "Back Angle",
        description:
          "Torso angle and neutral spine maintained throughout the lift",
      },
      {
        id: "stability",
        name: "Stability",
        description:
          "Even weight distribution, no shifting or wobbling, controlled tempo",
      },
    ],
    tips: [
      "Film from a 45° angle (front-side)",
      "Full body must be visible in frame",
      "Include at least one full rep",
    ],
  },
  {
    id: "deadlift",
    name: "Conventional Deadlift",
    shortName: "Deadlift",
    icon: "💪",
    category: "gym",
    metrics: [
      {
        id: "hip_hinge",
        name: "Hip Hinge",
        description: "Proper hip hinge initiation, hips loading correctly",
      },
      {
        id: "back_position",
        name: "Back Position",
        description:
          "Neutral spine maintained, no rounding of lower or upper back",
      },
      {
        id: "lockout",
        name: "Lockout",
        description:
          "Full hip extension at the top, shoulders back, glutes engaged",
      },
      {
        id: "bar_path",
        name: "Bar Path",
        description:
          "Bar travels in a straight vertical line close to the body",
      },
    ],
    tips: [
      "Film from the side (90° angle)",
      "Full body visible from feet to head",
      "Include the setup and at least one full rep",
    ],
  },
  {
    id: "bench",
    name: "Barbell Bench Press",
    shortName: "Bench",
    icon: "🔥",
    category: "gym",
    metrics: [
      {
        id: "bar_path",
        name: "Bar Path",
        description:
          "Bar travels in a slight arc from chest to lockout, not straight vertical",
      },
      {
        id: "elbow_angle",
        name: "Elbow Angle",
        description: "Elbows tucked at 45-75° angle, not flared at 90°",
      },
      {
        id: "arch_stability",
        name: "Arch & Setup",
        description: "Proper arch, retracted scapulae, feet planted firmly",
      },
      {
        id: "shoulder_position",
        name: "Shoulder Health",
        description:
          "Shoulders pinned back and down, not shrugging or rolling forward",
      },
    ],
    tips: [
      "Film from the side or at a 45° angle",
      "Ensure the full range of motion is visible",
      "Include at least one full rep from unrack to rerack",
    ],
  },
]

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id)
}

export function getExercisesByCategory(): {
  category: ExerciseCategory
  exercises: Exercise[]
}[] {
  const order: ExerciseCategory[] = ["anywhere", "gym"]
  return order
    .map((cat) => ({
      category: cat,
      exercises: exercises.filter((e) => e.category === cat),
    }))
    .filter((group) => group.exercises.length > 0)
}
