/**
 * Coaching enhancement (numbers-only).
 *
 * After on-device scoring, this sends ONLY anonymous numbers (joint angles +
 * scores) to the Kritiq proxy, which asks Gemini to phrase three coaching
 * headlines. No video, frames, IDs, or PII ever leave the device.
 *
 * This is a best-effort overlay on the deterministic coaching from
 * `buildSquatResult`: any failure (offline, timeout, proxy down, bad response,
 * or no proxy configured) returns `null` and the caller keeps the deterministic
 * strings. The app never blocks on it.
 */

import config from "@/constants/config"
import type { SquatScore } from "@/lib/scoring/squat"

export interface CoachingHeadlines {
  summary: string
  topStrength: string
  topImprovement: string
}

/** The anonymous numbers-only payload sent to the proxy. */
export interface CoachPayload {
  exercise: string
  overall: number
  metrics: { depth: number; torso: number }
  angles: { bottomKneeAngle: number; bottomTorsoLean: number }
  lowConfidence: boolean
}

export function toCoachPayload(
  score: SquatScore,
  exerciseId: string,
): CoachPayload {
  return {
    exercise: exerciseId,
    overall: score.total,
    metrics: { depth: score.depth, torso: score.torso },
    angles: {
      bottomKneeAngle: Math.round(score.bottomKneeAngle),
      bottomTorsoLean: Math.round(score.bottomTorsoLean),
    },
    lowConfidence: score.lowConfidence,
  }
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
