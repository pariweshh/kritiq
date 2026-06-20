/**
 * Pick the camera-facing leg in a sagittal (side-on) view: the side whose
 * lower-body keypoints (hip, knee, ankle) the model is most confident about.
 * The far leg is partly occluded, so its confidence is lower.
 */

import { keypoint, type Pose, type Side } from "@/lib/pose/types"

export function pickFacingSide(pose: Pose): Side {
  const legConfidence = (side: Side): number =>
    keypoint(pose, `${side}_hip`).score +
    keypoint(pose, `${side}_knee`).score +
    keypoint(pose, `${side}_ankle`).score

  return legConfidence("left") >= legConfidence("right") ? "left" : "right"
}
