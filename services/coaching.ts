/**
 * Coaching enhancement (numbers-only).
 *
 * After on-device scoring, this sends ONLY anonymous numbers (per-dimension
 * scores + their raw measured values) to the Kritiq proxy, which asks Gemini to
 * phrase three coaching headlines. No video, frames, ids, or PII ever leave the
 * device.
 *
 * This is a best-effort overlay on the deterministic coaching from
 * `buildMovementResult`: any failure (offline, timeout, proxy down, bad
 * response, or no proxy configured) returns `null` and the caller keeps the
 * deterministic strings. The app never blocks on it.
 *
 * The payload is the generic `dimensions[]` shape (see lib/coaching/payload), so
 * every movement — not just squat — flows through this one path. The pure
 * builder lives in lib/ (framework-free, unit-tested offline); this module is
 * only the network call and response validation.
 */

import config from "@/constants/config"
import { toCoachPayload } from "@/lib/coaching/payload"
import type { CoachDimension, CoachPayload } from "@/lib/coaching/payload"

export { toCoachPayload }
export type { CoachDimension, CoachPayload }

export interface CoachingHeadlines {
  summary: string
  topStrength: string
  topImprovement: string
}

function isHeadlines(value: unknown): value is CoachingHeadlines {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.summary === "string" &&
    typeof v.topStrength === "string" &&
    typeof v.topImprovement === "string"
  )
}

/**
 * Request phrased coaching headlines from the proxy. Returns `null` on any
 * failure or if no proxy URL is configured — never throws.
 */
export async function tryCoaching(
  payload: CoachPayload,
): Promise<CoachingHeadlines | null> {
  const { proxyUrl, proxyKey, timeoutMs } = config.coaching
  if (!proxyUrl) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    }
    if (proxyKey) headers["x-kritiq-key"] = proxyKey

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!response.ok) return null

    const data: unknown = await response.json()
    return isHeadlines(data) ? data : null
  } catch {
    // offline / timeout / parse error — fall back to deterministic coaching
    return null
  } finally {
    clearTimeout(timer)
  }
}
