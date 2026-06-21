/**
 * Kritiq Design System — "Refined Performance Dark"
 * Aesthetic: premium OLED dark with a restrained neon-green signature.
 *
 * Rule: import tokens from here, never hardcode colors/sizes/fonts in
 * components. Font families are exposed as semantic tokens (`typography.fonts`)
 * so the typeface can be swapped in one place — screens reference the role
 * (display / heading / label / body / mono), not a concrete family name.
 */

export const colors = {
  // Core surfaces — a true tonal elevation ramp (darkest canvas → raised chips)
  // so cards and sheets read as layered depth instead of one flat grey.
  bg: {
    primary: "#0A0B0D", // app canvas (near-black, OLED-friendly)
    secondary: "#111317", // cards / primary surfaces
    tertiary: "#181B20", // inputs / nested surfaces
    card: "#111317",
    elevated: "#22262C", // raised chips, badges, menus
    scrim: "rgba(0, 0, 0, 0.6)", // modal / sheet backdrop
  },

  // Accent — the signature neon green, used with restraint (CTA, score,
  // active state). Secondary cyan for supporting highlights.
  accent: {
    primary: "#00FF88",
    secondary: "#00CCFF",
    gradient: ["#00FF88", "#00E599"] as const, // green→mint, for CTAs/score
    muted: "rgba(0, 255, 136, 0.10)",
    border: "rgba(0, 255, 136, 0.22)",
    glow: "rgba(0, 255, 136, 0.30)",
  },

  // Text hierarchy — tuned for dark-surface contrast (primary ≥7:1,
  // secondary/body ≥4.5:1, tertiary ≥3:1).
  text: {
    primary: "#F5F7FA", // headlines, key numbers
    secondary: "#AEB4BD", // titles, body emphasis
    tertiary: "#787F89", // body, captions
    muted: "#4A4F58", // disabled, decorative
    accent: "#00FF88",
  },

  // Borders & dividers — visible on surfaces in dark mode.
  border: {
    default: "#23272E",
    subtle: "rgba(255, 255, 255, 0.06)",
    accent: "rgba(0, 255, 136, 0.22)",
  },

  // Score tier colors
  score: {
    excellent: "#00FF88", // 90-100
    good: "#00CCFF", // 70-89
    fair: "#FFB020", // 50-69
    poor: "#FF5470", // below 50
  },

  // Status
  success: "#00FF88",
  warning: "#FFB020",
  error: "#FF5470",
  info: "#00CCFF",
} as const

export const typography = {
  /**
   * Semantic font tokens. Screens reference the role, not the family — so the
   * typeface swaps in one place. Currently mapped to the shipped faces; the
   * "Refined Performance Dark" target is the Barlow family (athletic condensed
   * display + clean grotesk body) — once those .ttf files are in assets/fonts/
   * and loaded in app/_layout.tsx, only these five values change.
   */
  fonts: {
    display: "BarlowCondensed-Bold", // big scores, wordmark, key numerals
    heading: "BarlowCondensed-SemiBold", // section titles, CTAs, headings
    label: "BarlowCondensed-Medium", // uppercase labels / chips
    body: "Barlow-Regular", // descriptions, paragraphs
    mono: "SpaceMono", // timestamps, technical badges
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

/**
 * Elevation scale — a consistent shadow ramp (rest → raised → floating) plus a
 * green glow for accent moments. Use one tier per surface role; don't invent
 * ad-hoc shadow values per screen.
 */
export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 34,
    elevation: 20,
  },
  glow: {
    shadowColor: "#00FF88",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  button: {
    shadowColor: "#00FF88",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
} as const

// Score tier helper
export function getScoreTier(score: number): {
  label: string
  color: string
} {
  if (score >= 90) return { label: "ELITE", color: colors.score.excellent }
  if (score >= 70) return { label: "ADVANCED", color: colors.score.good }
  if (score >= 50) return { label: "DEVELOPING", color: colors.score.fair }
  return { label: "NEEDS WORK", color: colors.score.poor }
}

// Metric score color
export function getMetricColor(score: number): string {
  if (score >= 90) return colors.score.excellent
  if (score >= 70) return colors.score.good
  if (score >= 50) return colors.score.fair
  return colors.score.poor
}
