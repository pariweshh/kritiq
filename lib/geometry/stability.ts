/**
 * Cross-frame positional steadiness over a clip. Pure (no model/framework
 * coupling), so it stays unit-testable offline like the rest of the geometry
 * layer. Used to grade how steady a static hold (e.g. a plank) is.
 */

import { keypoint, type KeypointName, type Pose } from "@/lib/pose/types"

/**
 * Mean wobble of a joint across a clip, in isotropic normalized units (x scaled
 * by each frame's aspect ratio so the metric is square): the average distance of
 * the joint from its own mean position over all frames. 0 = perfectly still;
 * larger = more drift/shake. NaN for an empty clip.
 */
export function jointWobble(
  frames: readonly Pose[],
  joint: KeypointName,
): number {
  if (frames.length === 0) {
    return NaN
  }
  const points = frames.map((pose) => {
    const kp = keypoint(pose, joint)
    return { x: kp.x * pose.aspectRatio, y: kp.y }
  })
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length
  return (
    points.reduce((sum, p) => sum + Math.hypot(p.x - meanX, p.y - meanY), 0) /
    points.length
  )
}
