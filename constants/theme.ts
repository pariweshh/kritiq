/**
 * Kritiq Design System
 * Aesthetic: Dark Cyber — Nike Training Club meets gaming
 *
 * Rule: Import from here, never hardcode colors/sizes in components.
 */

export const colors = {
  // Core backgrounds
  bg: {
    primary: "#0D0D0D",
    secondary: "#111111",
    tertiary: "#151515",
    card: "#111111",
    elevated: "#1A1A1A",
  },

  // Accent — the signature neon green
  accent: {
    primary: "#00FF88",
    secondary: "#00CCFF",
    gradient: ["#00FF88", "#00CCFF"] as const,
    muted: "rgba(0, 255, 136, 0.08)",
    border: "rgba(0, 255, 136, 0.15)",
    glow: "rgba(0, 255, 136, 0.3)",
  },

  // Text hierarchy
  text: {
    primary: "#FFFFFF",
    secondary: "#888888",
    tertiary: "#555555",
    muted: "#333333",
    accent: "#00FF88",
  },

  // Borders & dividers
  border: {
    default: "#1A1A1A",
    subtle: "rgba(255, 255, 255, 0.05)",
    accent: "rgba(0, 255, 136, 0.15)",
  },

  // Score tier colors
  score: {
    excellent: "#00FF88", // 9-10
    good: "#00CCFF", // 7-8.9
    fair: "#FFB800", // 5-6.9
    poor: "#FF4444", // below 5
  },

  // Status
  success: "#00FF88",
  warning: "#FFB800",
  error: "#FF4444",
  info: "#00CCFF",
} as const

export const typography = {
  // Font families — loaded via expo-font
  fonts: {
    mono: "Orbitron", // Scores, brand, techy elements
    heading: "Rajdhani", // Labels, headings
    body: "Inter", // Body text, descriptions
    code: "SpaceMono", // Timestamps, technical info
  },

  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    "2xl": 24,
    "3xl": 32,
    "4xl": 48,
    score: 96, // The big score number
  },

  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    heavy: "900" as const,
  },
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  "5xl": 40,
  "6xl": 48,
  cardPadding: 28,
} as const

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 100,
} as const

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.45,
    shadowRadius: 34,
    elevation: 20,
  },
  glow: {
    shadowColor: "#00FF88",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 10,
  },
  button: {
    shadowColor: "#00FF88",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
} as const

// Score tier helper
export function getScoreTier(score: number): {
  label: string
  color: string
} {
  if (score >= 9) return { label: "ELITE", color: colors.score.excellent }
  if (score >= 7) return { label: "ADVANCED", color: colors.score.good }
  if (score >= 5) return { label: "DEVELOPING", color: colors.score.fair }
  return { label: "NEEDS WORK", color: colors.score.poor }
}

// Metric score color
export function getMetricColor(score: number): string {
  if (score >= 9) return colors.score.excellent
  if (score >= 7) return colors.score.good
  if (score >= 5) return colors.score.fair
  return colors.score.poor
}
