/**
 * Kritiq coaching proxy — Cloudflare Worker.
 *
 * Privacy (locked): receives ONLY anonymous numbers (joint angles + scores)
 * from the app — never video, frames, or PII. It asks Gemini to phrase three
 * coaching headlines, returns them, and logs nothing. The Gemini API key lives
 * here as a Worker secret and never ships in the client bundle.
 *
 * Implementation note: this calls the Gemini REST API directly via `fetch`
 * rather than the @google/genai SDK. In the Workers runtime a dependency-free
 * fetch call is lighter and avoids nodejs-compat surprises, while still
 * targeting the same v1beta API + model. Swap to the SDK if you prefer.
 */

const GEMINI_MODEL = "gemini-3.5-flash"
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const MAX_EXERCISE_LEN = 40

export interface Env {
  // Set via `wrangler secret put GEMINI_API_KEY`.
  GEMINI_API_KEY: string
  // Optional abuse speed-bump; if set, callers must send a matching `x-kritiq-key`.
  PROXY_SHARED_SECRET?: string
}

interface CoachPayload {
  exercise: string
  overall: number
  metrics: { depth: number; torso: number }
  angles: { bottomKneeAngle: number; bottomTorsoLean: number }
  lowConfidence: boolean
}

interface CoachingHeadlines {
  summary: string
  topStrength: string
  topImprovement: string
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    topStrength: { type: "string" },
    topImprovement: { type: "string" },
  },
  required: ["summary", "topStrength", "topImprovement"],
} as const

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

/** Strict numbers-only validation — reject anything that isn't the small numeric shape. */
function parsePayload(data: unknown): CoachPayload | null {
  if (typeof data !== "object" || data === null) return null
  const d = data as Record<string, unknown>
  const m = d.metrics as Record<string, unknown> | undefined
  const a = d.angles as Record<string, unknown> | undefined

  if (typeof d.exercise !== "string" || d.exercise.length > MAX_EXERCISE_LEN) {
    return null
  }
  if (!isFiniteNumber(d.overall)) return null
  if (!m || !isFiniteNumber(m.depth) || !isFiniteNumber(m.torso)) return null
  if (
    !a ||
    !isFiniteNumber(a.bottomKneeAngle) ||
    !isFiniteNumber(a.bottomTorsoLean)
  ) {
    return null
  }
  if (typeof d.lowConfidence !== "boolean") return null

  return {
    exercise: d.exercise,
    overall: clamp(d.overall, 0, 100),
    metrics: { depth: clamp(m.depth, 0, 100), torso: clamp(m.torso, 0, 100) },
    angles: {
      bottomKneeAngle: clamp(a.bottomKneeAngle, 0, 180),
      bottomTorsoLean: clamp(a.bottomTorsoLean, 0, 180),
    },
    lowConfidence: d.lowConfidence,
  }
}

function buildPrompt(p: CoachPayload): string {
  return [
    `You are a calibrated, encouraging strength coach. A lifter performed a ${p.exercise}.`,
    `Scores are 0-100. Overall ${p.overall}.`,
    `Depth ${p.metrics.depth} — knee bent to ${Math.round(p.angles.bottomKneeAngle)}° at the bottom (<=90° is at or below parallel).`,
    `Torso control ${p.metrics.torso} — torso leaned ${Math.round(p.angles.bottomTorsoLean)}° from vertical at the bottom (lower is more upright).`,
    `Write specific, non-medical coaching that references the actual numbers. No emojis.`,
    `summary: 2-3 sentences. topStrength: the single best aspect. topImprovement: the most impactful fix with a concrete cue.`,
  ].join(" ")
}

/** Concatenate the model's answer text, skipping thinking parts (gemini-2.5+). */
function extractText(data: unknown): string | null {
  const parts = (
    data as {
      candidates?: {
        content?: { parts?: { text?: string; thought?: boolean }[] }
      }[]
    }
  )?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return null

  const text = parts
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("")
    .trim()
  return text.length > 0 ? text : null
}

function finishReasonOf(data: unknown): string {
  return (
    (data as { candidates?: { finishReason?: string }[] })?.candidates?.[0]
      ?.finishReason ?? "unknown"
  )
}

function readHeadlines(text: string): CoachingHeadlines | null {
  // responseMimeType=json should yield bare JSON, but strip fences defensively.
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return null
  }
  const h = parsed as Record<string, unknown>
  if (
    typeof h?.summary !== "string" ||
    typeof h?.topStrength !== "string" ||
    typeof h?.topImprovement !== "string"
  ) {
    return null
  }
  return {
    summary: h.summary,
    topStrength: h.topStrength,
    topImprovement: h.topImprovement,
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405)
    }
    if (
      env.PROXY_SHARED_SECRET &&
      request.headers.get("x-kritiq-key") !== env.PROXY_SHARED_SECRET
    ) {
      return json({ error: "Unauthorized" }, 401)
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: "Server not configured" }, 500)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json({ error: "Invalid JSON" }, 400)
    }
    const payload = parsePayload(body)
    if (!payload) {
      return json({ error: "Invalid payload" }, 400)
    }

    let upstream: Response
    try {
      upstream = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(payload) }] }],
          generationConfig: {
            temperature: 0.4,
            // Higher cap: gemini-2.5+ "thinking" models spend output tokens on
            // reasoning, so a small cap can leave no room for the actual JSON.
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      })
    } catch {
      return json({ error: "Upstream unreachable" }, 502)
    }
    if (!upstream.ok) {
      return json({ error: "Upstream error" }, 502)
    }

    let data: unknown
    try {
      data = await upstream.json()
    } catch {
      return json({ error: "Bad upstream response" }, 502)
    }

    const text = extractText(data)
    const headlines = text ? readHeadlines(text) : null
    if (!headlines) {
      // Surface why on the error path only (no PII; never on success).
      return json(
        {
          error: "Malformed coaching response",
          finishReason: finishReasonOf(data),
          preview: (text ?? "").slice(0, 200),
        },
        502,
      )
    }
    return json(headlines)
  },
}
