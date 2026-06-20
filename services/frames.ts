/**
 * Frame extraction for the on-device analysis pipeline.
 *
 * The locked plan favored expo-video `generateThumbnailsAsync`, but the spike
 * proved expo-video-thumbnails `getThumbnailAsync` on device, so we sample with
 * the verified path (one call per timestamp). Swap to batched generation later
 * if extraction time becomes a bottleneck.
 */

import * as VideoThumbnails from "expo-video-thumbnails"

import type { PoseFrame } from "@/services/pose"

/**
 * Sample `count` frames evenly across `[0, durationMs]`, skipping the exact
 * start/end so each sample lands inside the rep.
 */
export async function extractFrames(
  videoUri: string,
  count: number,
  durationMs: number,
): Promise<PoseFrame[]> {
  if (count < 1) {
    throw new Error("extractFrames: count must be >= 1")
  }
  if (durationMs <= 0) {
    throw new Error("extractFrames: durationMs must be > 0")
  }

  const frames: PoseFrame[] = []
  for (let i = 0; i < count; i++) {
    const time = Math.round(((i + 1) * durationMs) / (count + 1))
    const thumb = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time,
      quality: 1,
    })
    frames.push({ uri: thumb.uri, width: thumb.width, height: thumb.height })
  }
  return frames
}
