/**
 * Pick the camera-facing side in a sagittal (side-on) view: the side whose
 * chosen joints the model is most confident about. The far limb is partly
 * occluded, so its confidence is lower.
 *
 * Defaults to the lower-body joints (hip, knee, ankle) for squat/hinge work, so
 * the squat path is byte-for-byte unchanged. Pass the arm joints (shoulder,
 * elbow, wrist) to pick the camera-near arm for a pushup.
 */

import { keypoint, type KeypointName, type Pose, type Side } from "@/lib/pose/types"

/** A joint base name that exists on both sides (e.g. "knee" → left_knee/right_knee). */
type SidedJoint<T = KeypointName> = T extends `left_${infer J}` ? J : never

const DEFAULT_JOINTS: readonly SidedJoint[] = ["hip", "knee", "ankle"]

export function pickFacingSide(
  pose: Pose,
  joints: readonly SidedJoint[] = DEFAULT_JOINTS,
): Side {
  const confidence = (side: Side): number =>
    joints.reduce(
      (sum, joint) => sum + keypoint(pose, `${side}_${joint}`).score,
      0,
    )

  return confidence("left") >= confidence("right") ? "left" : "right"
}
