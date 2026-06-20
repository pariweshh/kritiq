/**
 * Kritiq coaching proxy — Cloudflare Worker.
 *
 * Privacy (locked): receives ONLY anonymous numbers (per-dimension scores +
 * their raw measured values) plus static labels — never video, frames, or PII.
 * It asks Gemini to phrase three coaching headlines, returns them, and logs
 * nothing. The Gemini API key lives here as a Worker secret and never ships in
 * the client bundle.
 *
 * Payload is the generic `dimensions[]` shape (movementId + exercise + total +
 * a list of { id, name, score, value }), so one prompt phrases coaching for any
 * movement — squat, pushup, plank, reverse lunge, … — not just squat.
 *
 * Implementation note: this calls the Gemini REST API directly via `fetch`
 * rather than the @google/genai SDK. In the Workers runtime a dependency-free
 * fetch call is lighter and avoids nodejs-compat surprises, while still
 * targeting the same v1beta API + model. Swap to the SDK if you prefer.
 */

const GEMINI_MODEL = "gemini-3.5-flash"
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// Bounds for the numbers-only payload — strings are short static labels, the
// dimension list is small, and numbers are clamped to sane ranges.
const MAX_LABEL_LEN = 40
const MIN_DIMENSIONS = 1
const MAX_DIMENSIONS = 8
const MAX_ABS_VALUE = 1000

export interface Env {
  // Set via `wrangler secret put GEMINI_API_KEY`.
  GEMINI_API_KEY: string
  // Optional abuse speed-bump; if set, callers must send a matching `x-kritiq-key`.
  PROXY_SHARED_SECRET?: string
}

interface CoachDimension {
  id: string
  name: string
  score: number
  value: number
}

interface CoachPayload {
  movementId: string
  exercise: string
  total: number
  dimensions: CoachDimension[]
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

/** A non-empty, length-bounded static label (movement id, dimension name, …). */
function isLabel(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= MAX_LABEL_LEN
}

/** Validate one scored dimension — labels + two finite numbers, clamped. */
function parseDimension(data: unknown): CoachDimension | null {
  if (typeof data !== "object" || data === null) return null
  const d = data as Record<string, unknown>
  if (!isLabel(d.id) || !isLabel(d.name)) return null
  if (!isFiniteNumber(d.score) || !isFiniteNumber(d.value)) return null
  return {
    id: d.id,
    name: d.name,
    score: clamp(d.score, 0, 100),
    value: clamp(d.value, -MAX_ABS_VALUE, MAX_ABS_VALUE),
  }
}

/** Strict numbers-only validation — reject anything that isn't the small generic shape. */
function parsePayload(data: unknown): CoachPayload | null {
  if (typeof data !== "object" || data === null) return null
  const d = data as Record<string, unknown>

  if (!isLabel(d.movementId) || !isLabel(d.exercise)) return null
  if (!isFiniteNumber(d.total)) return null
  if (typeof d.lowConfidence !== "boolean") return null
  if (
    !Array.isArray(d.dimensions) ||
    d.dimensions.length < MIN_DIMENSIONS ||
    d.dimensions.length > MAX_DIMENSIONS
  ) {
    return null
  }

  const dimensions: CoachDimension[] = []
  for (const raw of d.dimensions) {
    const dim = parseDimension(raw)
    if (!dim) return null
    dimensions.push(dim)
  }

  return {
    movementId: d.movementId,
    exercise: d.exercise,
    total: clamp(d.total, 0, 100),
    dimensions,
    lowConfidence: d.lowConfidence,
  }
}

function buildPrompt(p: CoachPayload): string {
  const dims = p.dimensions
    .map((d) => `${d.name}: ${d.score}/100 (raw measured value ${d.value}).`)
    .join(" ")
  return [
    `You are a calibrated, encouraging strength coach. A lifter performed a ${p.exercise}.`,
    `Every score is 0-100 where higher is better. Overall score ${p.total}.`,
    `Here is each aspect of the movement with its score and the raw measured value behind it: ${dims}`,
    `Write specific, non-medical coaching that references the actual scores and names each aspect by name.`,
    `Base topStrength on the highest-scoring aspect and topImprovement on the lowest-scoring one. No emojis.`,
    `summary: 2-3 sentences. topStrength: the single best aspect. topImprovement: the most impactful fix with a concrete, movement-appropriate cue.`,
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
