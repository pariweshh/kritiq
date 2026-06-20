/**
 * Pure 2D joint-angle geometry over a Pose. Angles are in degrees.
 * Coordinates are original-image normalized (x: left→right, y: top→bottom).
 */

import { clamp } from "@/lib/math"
import { keypoint, type Keypoint, type Pose, type Side } from "@/lib/pose/types"

interface Point {
  readonly x: number
  readonly y: number
}

/** Interior angle at vertex `b` for the path a→b→c, in degrees [0,180]. */
export function angleAtJoint(a: Point, b: Point, c: Point): number {
  const v1x = a.x - b.x
  const v1y = a.y - b.y
  const v2x = c.x - b.x
  const v2y = c.y - b.y
  const mag1 = Math.hypot(v1x, v1y)
  const mag2 = Math.hypot(v2x, v2y)
  if (mag1 === 0 || mag2 === 0) {
    return NaN
  }
  const cosine = clamp((v1x * v2x + v1y * v2y) / (mag1 * mag2), -1, 1)
  return (Math.acos(cosine) * 180) / Math.PI
}

/**
 * Convert a normalized keypoint to an isotropic point (equal pixel units on
 * both axes). x/y are normalized to source width/height separately, so on a
 * non-square frame a raw (x,y) is anisotropic and distorts angles. Scaling x by
 * the aspect ratio (width/height) restores a common metric — letterboxing keeps
 * detection accurate, this keeps the geometry on top of it accurate too.
 */
function isotropic(kp: Keypoint, aspectRatio: number): Point {
  return { x: kp.x * aspectRatio, y: kp.y }
}

/** Knee flexion: angle at the knee (hip→knee→ankle). 180 = straight leg. */
export function kneeAngle(pose: Pose, side: Side): number {
  const a = pose.aspectRatio
  return angleAtJoint(
    isotropic(keypoint(pose, `${side}_hip`), a),
    isotropic(keypoint(pose, `${side}_knee`), a),
    isotropic(keypoint(pose, `${side}_ankle`), a),
  )
}

/** Elbow flexion: angle at the elbow (shoulder→elbow→wrist). 180 = straight arm. */
export function elbowAngle(pose: Pose, side: Side): number {
  const a = pose.aspectRatio
  return angleAtJoint(
    isotropic(keypoint(pose, `${side}_shoulder`), a),
    isotropic(keypoint(pose, `${side}_elbow`), a),
    isotropic(keypoint(pose, `${side}_wrist`), a),
  )
}

/** Hip flexion: angle at the hip (shoulder→hip→knee). 180 = fully open. */
export function hipAngle(pose: Pose, side: Side): number {
  const a = pose.aspectRatio
  return angleAtJoint(
    isotropic(keypoint(pose, `${side}_shoulder`), a),
    isotropic(keypoint(pose, `${side}_hip`), a),
    isotropic(keypoint(pose, `${side}_knee`), a),
  )
}

/**
 * Whole-body line: angle at the hip for shoulder→hip→ankle. 180 = a straight
 * line from shoulders to heels (the ideal plank); sag or pike drops it below 180.
 */
export function bodyLineAngle(pose: Pose, side: Side): number {
  const a = pose.aspectRatio
  return angleAtJoint(
    isotropic(keypoint(pose, `${side}_shoulder`), a),
    isotropic(keypoint(pose, `${side}_hip`), a),
    isotropic(keypoint(pose, `${side}_ankle`), a),
  )
}

/** Forward lean of the torso (shoulder over hip) from vertical, degrees. 0 = upright. */
export function torsoLeanFromVertical(pose: Pose, side: Side): number {
  const shoulder = keypoint(pose, `${side}_shoulder`)
  const hip = keypoint(pose, `${side}_hip`)
  // Scale x by aspect (see isotropic) so the lean angle is metric-correct.
  const dx = (shoulder.x - hip.x) * pose.aspectRatio
  const dy = shoulder.y - hip.y
  // "Up" is negative y in image coords; measure the hip→shoulder vector off vertical.
  return (Math.atan2(Math.abs(dx), -dy) * 180) / Math.PI
}
