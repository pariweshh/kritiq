/**
 * ExerciseIcon
 * Single source of truth for how an exercise glyph renders. Exercises store a
 * MaterialCommunityIcons glyph name — one consistent line-icon family that
 * replaces the old per-platform emoji. Centralizing the render here means the
 * icon family (or a future custom SVG set) can be swapped in one place.
 */

import { MaterialCommunityIcons } from "@expo/vector-icons"

interface ExerciseIconProps {
  name: keyof typeof MaterialCommunityIcons.glyphMap
  size: number
  color: string
}

export default function ExerciseIcon({ name, size, color }: ExerciseIconProps) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />
}
