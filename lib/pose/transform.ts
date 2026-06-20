/**
 * Pure letterbox math for MoveNet preprocessing.
 *
 * MoveNet needs a square input (256×256). Squishing a portrait frame to square
 * distorts joint angles — anisotropic scaling does not preserve angles — which
 * would corrupt every downstream score. So we letterbox: scale the frame to fit
 * the square while preserving aspect, pad the remainder, then map the model's
 * normalized keypoints back into the original image's aspect-correct 0–1 space.
 */

import { clamp01 } from "@/lib/math"

export interface Letterbox {
  /** Square model input size in px (e.g. 256). */
  readonly size: number
  /** Multiplier from original px to model px. */
  readonly scale: number
  /** Scaled content width in model px. */
  readonly drawW: number
  /** Scaled content height in model px. */
  readonly drawH: number
  /** Left padding in model px. */
  readonly padX: number
  /** Top padding in model px. */
  readonly padY: number
}

export function computeLetterbox(
  origW: number,
  origH: number,
  size: number,
): Letterbox {
  if (origW <= 0 || origH <= 0) {
    throw new Error(`Invalid frame dimensions: ${origW}x${origH}`)
  }
  const scale = size / Math.max(origW, origH)
  const drawW = Math.round(origW * scale)
  const drawH = Math.round(origH * scale)
  const padX = Math.floor((size - drawW) / 2)
  const padY = Math.floor((size - drawH) / 2)
  return { size, scale, drawW, drawH, padX, padY }
}

/**
 * Map a model-space normalized coordinate (0–1 of the padded square) back to
 * original-image normalized space (0–1), aspect-correct. Clamped to the frame.
 */
export function mapToOriginal(
  xNorm: number,
  yNorm: number,
  lb: Letterbox,
): { x: number; y: number } {
  const x = (xNorm * lb.size - lb.padX) / lb.drawW
  const y = (yNorm * lb.size - lb.padY) / lb.drawH
  return { x: clamp01(x), y: clamp01(y) }
}
