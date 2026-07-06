/**
 * App Configuration — EXAMPLE
 *
 * Copy this file to `constants/config.ts` (gitignored) and fill in real
 * values for your own deployment. Every value below is a placeholder —
 * no real keys or secrets belong in this committed file.
 *
 * For development: edit the values below directly in your local config.ts.
 * For production: source them from EAS secrets / environment variables.
 *
 * NEVER commit real API keys to git — config.ts stays gitignored.
 */

const config = {
  // Gemini coaching proxy (numbers-only). The real Gemini key lives ONLY in
  // the Cloudflare Worker; the app just calls this URL. URL + key come from
  // the bundle via EXPO_PUBLIC_* (so the key is an abuse speed-bump, not a
  // secret — see proxy/README.md). Empty url => coaching is skipped,
  // deterministic-only feedback still works.
  coaching: {
    proxyUrl: process.env.EXPO_PUBLIC_COACH_PROXY_URL ?? "",
    proxyKey: process.env.EXPO_PUBLIC_COACH_PROXY_KEY ?? "",
    timeoutMs: 7000,
  },

  // RevenueCat (In-App Purchases). Placeholder keys make the SDK no-op at
  // runtime — offerings come back empty and the paywall shows "temporarily
  // unavailable" until you set real keys.
  revenueCat: {
    appleApiKey: "YOUR_REVENUECAT_APPLE_KEY",
    googleApiKey: "YOUR_REVENUECAT_GOOGLE_KEY",
    entitlementId: "pro",
  },

  // Analysis constraints
  analysis: {
    maxVideoDurationSeconds: 30,
    maxVideoSizeMB: 50,
    videoQuality: 0.8,
    // Frames sampled across the clip for on-device pose estimation.
    poseFrameCount: 12,
  },

  // App info
  app: {
    name: "Kritiq",
    tagline: "AI rates your form",
    website: "kritiq.app",
    supportEmail: "support@kritiq.app",
  },
} as const

export default config
