/**
 * Gemini AI Form Analysis Service — V2
 *
 * Key improvements over V1:
 * - Uses config for API key (not hardcoded)
 * - Much more detailed prompt engineering for consistent scoring
 * - Retry logic with exponential backoff
 * - Video size validation before inline base64 encoding
 * - Fallback model support
 * - Better error messages for common failures
 */

import config from "@/constants/config"
import { getExerciseById } from "@/constants/exercises"
import { getScoreTier } from "@/constants/theme"
import type { AnalysisResult, MetricScore } from "@/constants/types"
import * as FileSystem from "expo-file-system/legacy"

// ========================
// Prompt Engineering
// ========================

function buildSystemContext(): string {
  return `You are FormAI, a world-class strength & conditioning coach with 20+ years of experience and a degree in biomechanics. You analyze exercise form from video footage with the precision of a sports scientist.

YOUR SCORING PHILOSOPHY:
- You are HONEST and CALIBRATED. You do not inflate scores to make people feel good.
- The average recreational gym-goer scores 5.0-6.5. This is normal and expected.
- A score of 7.0-8.0 means genuinely good form that a trainer would approve of.
- A score of 8.5+ means excellent form that stands out in a commercial gym.
- A score of 9.0+ is reserved for competition-level or coach-quality form. This is RARE.
- A score below 4.0 means there are form issues that could lead to injury.

YOUR FEEDBACK STYLE:
- Be specific. Reference body parts, angles, and positions you observe.
- Be constructive. Every criticism should include what to do instead.
- Be encouraging but honest. Don't sugarcoat, but acknowledge what's being done well.
- Use coaching language, not medical jargon.`
}

function buildExercisePrompt(exerciseId: string): string {
  const exercise = getExerciseById(exerciseId)
  if (!exercise) throw new TypeError(`Unknown exercise: ${exerciseId}`)

  const metricsBlock = exercise.metrics
    .map(
      (m, i) =>
        `${i + 1}. **${m.name}** (id: "${m.id}")
   What to evaluate: ${m.description}
   Scoring guide:
   - 9-10: Textbook perfect, no visible issues
   - 7-8: Strong execution with minor refinements possible
   - 5-6: Functional but clear areas for improvement
   - 3-4: Notable form breakdown that limits effectiveness
   - 1-2: Significant issues that risk injury`,
    )
    .join("\n\n")

  return `EXERCISE BEING ANALYZED: ${exercise.name}

EVALUATION CRITERIA:
${metricsBlock}

OVERALL SCORE CALCULATION:
- The overall score should reflect the weighted importance of each metric, NOT a simple average.
- Safety-critical metrics (back position, knee tracking) should weigh more heavily.
- If any single metric is below 4.0, the overall score cannot be above 6.0 regardless of other metrics.

ANALYZE the video and respond with ONLY valid JSON (no markdown, no backticks, no explanation outside JSON):

{
  "overallScore": <number 0.0-10.0, one decimal>,
  "metrics": [
    {
      "metricId": "<exact id from above>",
      "name": "<metric name>",
      "score": <number 0.0-10.0, one decimal>,
      "feedback": "<One specific sentence about what you observed. Reference body position/angle.>"
    }
  ],
  "summary": "<2-3 sentences. Start with the most important observation. Be specific about what you saw in the video.>",
  "topStrength": "<Single most impressive aspect of the form. Be specific.>",
  "topImprovement": "<Single most impactful change they could make. Include a concrete cue or tip.>"
}

EDGE CASE HANDLING:
- If the video is too dark, blurry, or poorly angled to analyze properly: still provide your best assessment but note limitations in the summary. Score conservatively (lower) when uncertain.
- If the video clearly shows a DIFFERENT exercise than ${exercise.name}: set overallScore to 0.0 and explain in summary what exercise you see instead.
- If no human or exercise is visible: set overallScore to 0.0 and explain in summary.
- If the video shows only a partial rep: analyze what's visible but note in summary that a full rep would allow better assessment.`
}

// ========================
// API Communication
// ========================

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string
        thought?: boolean // gemini-2.5+ thinking models
      }[]
    }
    finishReason?: string
  }[]
  error?: {
    message: string
    code?: number
  }
}

interface ParsedAnalysis {
  overallScore: number
  metrics: MetricScore[]
  summary: string
  topStrength: string
  topImprovement: string
}

async function getVideoInfo(
  uri: string,
): Promise<{ sizeMB: number; extension: string }> {
  const info = await FileSystem.getInfoAsync(uri)
  const sizeMB = info.exists && info.size ? info.size / (1024 * 1024) : 0
  const extension = uri.split(".").pop()?.toLowerCase() || "mp4"
  return { sizeMB, extension }
}

function getMimeType(extension: string): string {
  const mimeMap: Record<string, string> = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    m4v: "video/mp4",
    avi: "video/x-msvideo",
    webm: "video/webm",
    "3gp": "video/3gpp",
  }
  return mimeMap[extension] || "video/mp4"
}

async function callGeminiAPI(
  base64Video: string,
  mimeType: string,
  exerciseId: string,
  model: string,
): Promise<GeminiResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.gemini.apiKey}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildSystemContext() }],
      },
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Video,
              },
            },
            {
              text: buildExercisePrompt(exerciseId),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_ONLY_HIGH",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH",
        },
      ],
    }),
  })

  if (!response.ok) {
    // Log full error for debugging
    let errorBody = ""
    try {
      errorBody = await response.text()
    } catch {
      // ignore
    }
    console.error(
      `[FormAI] Gemini API error ${response.status} for model ${model}:`,
      errorBody,
    )

    if (response.status === 400) {
      throw new Error(
        "The video format may not be supported. Try recording in MP4 or MOV format.",
      )
    }
    if (response.status === 403) {
      throw new Error(
        "API key is invalid or has exceeded its quota. Check your Gemini API key.",
      )
    }
    if (response.status === 404) {
      throw new Error(
        `Model "${model}" not found. It may have been deprecated.`,
      )
    }
    if (response.status === 429) {
      throw new Error("Too many requests. Please wait a minute and try again.")
    }
    if (response.status === 413) {
      throw new Error(
        "Video file is too large. Try a shorter clip (under 30 seconds).",
      )
    }
    throw new Error(`Analysis failed (${response.status}). Please try again.`)
  }

  return response.json()
}

function parseResponse(data: GeminiResponse): ParsedAnalysis {
  if (data.error) {
    throw new Error(`AI error: ${data.error.message}`)
  }

  const candidate = data.candidates?.[0]
  if (!candidate?.content?.parts?.length) {
    if (candidate?.finishReason === "SAFETY") {
      throw new Error(
        "The video was flagged by content filters. Please try a different video.",
      )
    }
    throw new Error(
      "No analysis returned. The video may be too short or unclear.",
    )
  }

  // Gemini 2.5+ models may return multiple parts (thinking + response).
  // Filter out thinking parts and search response parts for the JSON.
  const responseParts = candidate.content.parts.filter(
    (p) => !p.thought && p.text,
  )
  const allText = responseParts.map((p) => p.text!).join("\n")

  console.log("[FormAI] Raw response length:", allText.length)
  console.log("[FormAI] Raw response preview:", allText.slice(0, 500))

  if (!allText.trim()) {
    throw new Error(
      "No analysis returned. The video may be too short or unclear.",
    )
  }

  const cleanedText = allText.replaceAll(/```json\n?|```\n?/g, "").trim()

  let parsed: ParsedAnalysis
  try {
    parsed = JSON.parse(cleanedText)
  } catch {
    // Try to find JSON object within the text (model may include extra text)
    const jsonMatch = /\{[\s\S]*"overallScore"[\s\S]*\}/.exec(cleanedText)
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch {
        console.error(
          "[FormAI] Failed to parse extracted JSON:",
          jsonMatch[0].slice(0, 300),
        )
        throw new Error("Could not parse AI response. Please try again.")
      }
    } else {
      console.error(
        "[FormAI] No JSON found in response:",
        cleanedText.slice(0, 300),
      )
      throw new Error("Could not parse AI response. Please try again.")
    }
  }

  if (
    typeof parsed.overallScore !== "number" ||
    !Array.isArray(parsed.metrics)
  ) {
    throw new TypeError("Invalid analysis format. Please try again.")
  }

  return parsed
}

// ========================
// Main Analysis Function
// ========================

const NON_RETRYABLE_PATTERNS = [
  "API key",
  "too large",
  "not configured",
  "content filters",
  "not found", // 404 — wrong model name
  "Too many requests", // 429 — rate limited, don't hammer
  "quota", // 403 — quota exceeded
]

// These errors won't be fixed by a different model — stop everything
const FATAL_PATTERNS = [
  "API key",
  "too large",
  "not configured",
  "content filters",
]

function validateAnalysisInput(exerciseId: string, apiKey: string) {
  const exercise = getExerciseById(exerciseId)
  if (!exercise) throw new TypeError(`Unknown exercise: ${exerciseId}`)

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    throw new Error(
      "Gemini API key not configured. Open constants/config.ts and add your key from aistudio.google.com",
    )
  }

  return exercise
}

async function validateVideo(videoUri: string) {
  const { sizeMB, extension } = await getVideoInfo(videoUri)

  if (sizeMB > config.analysis.maxVideoSizeMB) {
    throw new Error(
      `Video is too large (${sizeMB.toFixed(1)}MB). Maximum is ${config.analysis.maxVideoSizeMB}MB. Try a shorter clip.`,
    )
  }

  if (sizeMB === 0) {
    throw new Error(
      "Video file appears to be empty. Please try recording again.",
    )
  }

  return getMimeType(extension)
}

function clampScore(score: number): number {
  return Math.round(Math.min(10, Math.max(0, score)) * 10) / 10
}

function buildMetrics(
  parsed: ParsedAnalysis,
  exercise: ReturnType<typeof getExerciseById>,
  overallScore: number,
): MetricScore[] {
  const metrics: MetricScore[] = parsed.metrics.map((m) => ({
    metricId: m.metricId,
    name: m.name,
    score: clampScore(m.score),
    feedback: m.feedback || "No specific feedback available.",
  }))

  const returnedMetricIds = new Set(metrics.map((m) => m.metricId))

  for (const expected of exercise!.metrics) {
    if (!returnedMetricIds.has(expected.id)) {
      metrics.push({
        metricId: expected.id,
        name: expected.name,
        score: overallScore,
        feedback:
          "Could not evaluate this metric clearly from the video angle.",
      })
    }
  }

  return metrics
}

function buildResult(
  parsed: ParsedAnalysis,
  exercise: NonNullable<ReturnType<typeof getExerciseById>>,
  exerciseId: string,
): AnalysisResult {
  const overallScore = clampScore(parsed.overallScore)
  const metrics = buildMetrics(parsed, exercise, overallScore)
  const { label: tier } = getScoreTier(overallScore)

  return {
    id: `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    exerciseId,
    exerciseName: exercise.name,
    overallScore,
    metrics,
    summary: parsed.summary || "Analysis complete.",
    topStrength: parsed.topStrength || "Form was analyzed successfully.",
    topImprovement:
      parsed.topImprovement ||
      "Try recording from a clearer angle for more detailed feedback.",
    timestamp: Date.now(),
    tier: tier as AnalysisResult["tier"],
  }
}

function isNonRetryable(error: Error): boolean {
  return NON_RETRYABLE_PATTERNS.some((pattern) =>
    error.message.includes(pattern),
  )
}

function isFatal(error: Error): boolean {
  return FATAL_PATTERNS.some((pattern) => error.message.includes(pattern))
}

async function attemptAnalysis(
  base64Video: string,
  mimeType: string,
  exerciseId: string,
  model: string,
): Promise<GeminiResponse> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callGeminiAPI(base64Video, mimeType, exerciseId, model)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (isNonRetryable(lastError)) {
        throw lastError
      }

      if (attempt < 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        )
      }
    }
  }

  throw lastError || new Error("Analysis failed. Please try again.")
}

export async function analyzeForm(
  videoUri: string,
  exerciseId: string,
): Promise<AnalysisResult> {
  const exercise = validateAnalysisInput(exerciseId, config.gemini.apiKey)
  const mimeType = await validateVideo(videoUri)

  const base64Video = await FileSystem.readAsStringAsync(videoUri, {
    encoding: FileSystem.EncodingType.Base64,
  })

  const models = [config.gemini.model, config.gemini.fallbackModel]
  let lastError: Error | null = null

  for (const model of models) {
    try {
      console.log(`[FormAI] Trying model: ${model}`)
      const data = await attemptAnalysis(
        base64Video,
        mimeType,
        exerciseId,
        model,
      )
      const parsed = parseResponse(data)
      return buildResult(parsed, exercise, exerciseId)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`[FormAI] Model ${model} failed:`, lastError.message)

      // Fatal errors won't be fixed by a different model
      if (isFatal(lastError)) {
        throw lastError
      }
      // Otherwise continue to fallback model
    }
  }

  throw (
    lastError ||
    new Error("Analysis failed after all attempts. Please try again.")
  )
}
