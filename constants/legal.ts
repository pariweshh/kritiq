/**
 * Legal URLs (public, non-secret).
 *
 * Apple Guideline 3.1.2 requires functional in-binary links to a Privacy Policy
 * and Terms of Use (EULA) for auto-renewable subscriptions. These live in source
 * control (NOT gitignored config.ts) so they always resolve and survive a fresh
 * checkout. The hosted pages themselves live at kritiq.app.
 */

export const LEGAL_URLS = {
  privacy: "https://kritiq.app/privacy",
  terms: "https://kritiq.app/terms",
} as const
