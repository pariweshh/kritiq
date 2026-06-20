/**
 * Privacy: record-then-delete enforcement.
 *
 * Locked posture: a recorded clip stays in the app-private sandbox (NEVER
 * Photos), is analyzed on device, and is deleted immediately after analysis.
 * This module provides the deletion primitive plus a launch-time sweep for
 * orphaned recordings (e.g. the app was killed mid-analysis before the inline
 * delete ran).
 *
 * Sandbox + no-backup are satisfied by design: expo-camera and
 * expo-video-thumbnails write into the iOS cache directory, which iOS excludes
 * from iCloud backup, and we never call MediaLibrary — so nothing reaches the
 * user's Photos. Only numbers ever leave the device.
 */

import { Directory, File, Paths } from "expo-file-system"

// Video container extensions a recording may land under in the cache dir.
const VIDEO_EXTENSIONS = [".mov", ".mp4", ".m4v"] as const

// expo-camera may nest recordings one level under this subdir on some configs.
const CAMERA_SUBDIR = "Camera"

/**
 * Delete a single file best-effort. Guards on existence and never throws, so a
 * cleanup pass can't crash the analysis flow or app launch. A leftover sandbox
 * file is harmless — it's swept on the next launch.
 */
export function deleteQuietly(uri: string): void {
  try {
    const file = new File(uri)
    if (file.exists) {
      file.delete()
    }
  } catch {
    // ignore — orphaned sandbox files are swept on next launch
  }
}

function isVideoFile(name: string): boolean {
  const lower = name.toLowerCase()
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/** Delete every video file directly inside `dir`. Never throws. */
function sweepVideos(dir: Directory): void {
  let entries: (Directory | File)[]
  try {
    entries = dir.list()
  } catch {
    // directory missing or unreadable — nothing to sweep
    return
  }

  for (const entry of entries) {
    if (entry instanceof File && isVideoFile(entry.name)) {
      deleteQuietly(entry.uri)
    }
  }
}

/**
 * Sweep orphaned recordings from the cache directory on app launch. Covers clips
 * left behind if the app was killed mid-analysis before the inline delete ran.
 * Sweeps the cache root plus one level into a `Camera/` subdir if present.
 *
 * Only video containers are removed — frame thumbnails (images) and other cache
 * entries are left untouched. Safe to call unconditionally on every launch.
 */
export function cleanupOrphanRecordings(): void {
  const cache = Paths.cache
  sweepVideos(cache)

  try {
    const cameraDir = new Directory(cache, CAMERA_SUBDIR)
    if (cameraDir.exists) {
      sweepVideos(cameraDir)
    }
  } catch {
    // ignore — the Camera subdir is optional
  }
}
