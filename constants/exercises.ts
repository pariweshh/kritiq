/**
 * Exercise Library
 * Each exercise belongs to a category and has specific metrics the AI evaluates.
 */

import { MaterialCommunityIcons } from "@expo/vector-icons"

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
  icon: keyof typeof MaterialCommunityIcons.glyphMap
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
    icon: "human-handsdown",
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
      "Film from the side (90°), not front-on",
      "Full body from head to feet visible",
      "Include at least one full rep",
    ],
  },
  {
    id: "pushup",
    name: "Push-Up",
    shortName: "Push-Up",
    icon: "yoga",
    category: "anywhere",
    metrics: [
      {
        id: "depth",
        name: "Depth",
        description:
          "Elbows bending to bring the chest toward the floor at the bottom",
      },
      {
        id: "body_line",
        name: "Body Line",
        description:
          "Straight line from shoulders through hips to knees — no sagging or piking",
      },
      {
        id: "tempo",
        name: "Tempo & Control",
        description: "Controlled descent and press, no bouncing off the bottom",
      },
    ],
    tips: [
      "Film from the side (90°), not front-on",
      "Full body from head to feet visible",
      "Include at least one full rep",
    ],
  },
  {
    id: "plank",
    name: "Plank",
    shortName: "Plank",
    icon: "meditation",
    category: "anywhere",
    metrics: [
      {
        id: "body_line",
        name: "Body Line",
        description:
          "Straight line from shoulders through hips to ankles — no sag or pike",
      },
      {
        id: "stability",
        name: "Stability",
        description:
          "Hips held steady through the hold with minimal drift or shaking",
      },
      {
        id: "core",
        name: "Core Bracing",
        description: "Braced midsection and squeezed glutes holding the line",
      },
    ],
    tips: [
      "Film from the side (90°), not front-on",
      "Full body from head to feet visible",
      "Hold the plank steady for a few seconds in frame",
    ],
  },
  {
    id: "reverse_lunge",
    name: "Reverse Lunge",
    shortName: "Rev Lunge",
    icon: "walk",
    category: "anywhere",
    metrics: [
      {
        id: "depth",
        name: "Depth",
        description:
          "Front knee bending toward parallel as the back knee drops",
      },
      {
        id: "torso_position",
        name: "Torso Control",
        description: "Upright torso with neutral spine as you step back",
      },
      {
        id: "balance",
        name: "Balance & Control",
        description:
          "Steady, controlled step back and return without wobbling",
      },
    ],
    tips: [
      "Film from the side (90°), not front-on",
      "Full body from head to feet visible",
      "Include at least one full rep (step back and return)",
    ],
  },
  {
    id: "forward_lunge",
    name: "Forward Lunge",
    shortName: "Fwd Lunge",
    icon: "run",
    category: "anywhere",
    metrics: [
      {
        id: "depth",
        name: "Depth",
        description:
          "Front knee bending toward parallel as you step forward and drop",
      },
      {
        id: "torso_position",
        name: "Torso Control",
        description: "Upright torso with neutral spine as you step forward",
      },
    ],
    tips: [
      "Film from the side (90°), not front-on",
      "Full body from head to feet visible",
      "Include at least one full rep (step forward and return)",
    ],
  },
  {
    id: "glute_bridge",
    name: "Glute Bridge",
    shortName: "Glute Br",
    icon: "kettlebell",
    category: "anywhere",
    metrics: [
      {
        id: "hip_extension",
        name: "Hip Extension",
        description:
          "Hips driving up to a straight line from shoulders through knees at the top",
      },
      {
        id: "shin_position",
        name: "Shin Position",
        description: "Shins vertical with feet under the knees at the top",
      },
    ],
    tips: [
      "Film from the side (90°), not front-on",
      "Full body from head to feet visible",
      "Drive the hips all the way up on at least one rep",
    ],
  },
  {
    id: "wall_sit",
    name: "Wall Sit",
    shortName: "Wall Sit",
    icon: "seat-outline",
    category: "anywhere",
    metrics: [
      {
        id: "knee_angle",
        name: "Knee Angle",
        description: "Thighs parallel to the floor with knees bent to a square 90°",
      },
      {
        id: "stability",
        name: "Stability",
        description: "Hips held steady through the hold with minimal drift",
      },
    ],
    tips: [
      "Film from the side (90°), not front-on",
      "Full body from head to feet visible",
      "Hold the sit steady for a few seconds in frame",
    ],
  },
  {
    id: "squat",
    name: "Barbell Back Squat",
    shortName: "Squat",
    icon: "weight-lifter",
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
      "Film from the side (90°), not front-on",
      "Full body must be visible in frame",
      "Include at least one full rep",
    ],
  },
  {
    id: "bicep_curl",
    name: "Bicep Curl",
    shortName: "Curl",
    icon: "arm-flex",
    category: "gym",
    metrics: [
      {
        id: "range_of_motion",
        name: "Range of Motion",
        description:
          "Elbow flexing fully to bring the weight up to the shoulder at the top",
      },
      {
        id: "torso_sway",
        name: "Torso Sway",
        description:
          "Upper body kept still — no swinging the torso to heave the weight up",
      },
    ],
    tips: [
      "Film from the side (90°), not front-on",
      "Upper body and the working arm fully visible",
      "Include at least one full rep",
    ],
  },
  {
    id: "overhead_press",
    name: "Overhead Press",
    shortName: "OHP",
    icon: "human-handsup",
    category: "gym",
    metrics: [
      {
        id: "lockout",
        name: "Lockout",
        description: "Arm driving to a full lockout, straight overhead at the top",
      },
      {
        id: "torso_position",
        name: "Torso Control",
        description: "Staying tall without leaning back to press the weight up",
      },
    ],
    tips: [
      "Film from the side (90°), not front-on",
      "Full body from head to overhead lockout visible",
      "Include at least one full rep",
    ],
  },
  {
    id: "deadlift",
    name: "Conventional Deadlift",
    shortName: "Deadlift",
    icon: "weight",
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
    icon: "dumbbell",
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
