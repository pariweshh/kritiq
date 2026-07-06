#!/usr/bin/env python3
"""
tools/calibration/extract_and_crosscheck.py

Bridges raw footage -> (a) a keypoint fixture for the TS harness, and
(b) T1 measurement evidence: MediaPipe angles vs. the app's MoveNet angles.

The angle math below is a LINE-FOR-LINE PORT of lib/geometry/angles.ts,
INCLUDING the isotropic aspect-ratio scaling (x is multiplied by the frame's
width/height ratio before any angle is measured — keypoints are normalized to
width and height separately, so raw (x, y) on a non-square frame is
anisotropic and distorts angles). If angles.ts changes, re-port it here or
the T1 comparison silently skews.

The aspect-ratio convention everywhere is WIDTH / HEIGHT — matching
lib/pose/types.ts (Pose.aspectRatio) and services/pose.ts. Run
`--self-check` to verify the port against analytic non-square cases shared
with lib/calibration/aspectRatio.test.ts (stdlib only, no cv2/mediapipe
needed).

Runs on your Mac. Video is processed locally and NOT committed — only the
extracted-keypoint fixture is (CALIBRATION.md §4/§6).

Install (self-check needs nothing beyond Python 3):
    pip install opencv-python mediapipe numpy

Usage:
    # verify the angles.ts port (run after any change to this file or angles.ts)
    python extract_and_crosscheck.py --self-check

    # produce a MediaPipe fixture (+ per-frame angle table) for the harness
    python extract_and_crosscheck.py clip.mov --movement squat \\
        --exercise bodyweight_squat \\
        --out lib/calibration/fixtures/squat/squat_good_side_01.json

    # also cross-check against MoveNet keypoints exported from the app:
    # set EXPO_PUBLIC_EXPORT_KEYPOINTS=1 in .env, analyze the SAME clip in the
    # dev client, copy the JSON between the [kritiq:fixture:begin/end] markers
    # from the Metro log into a file, then:
    python extract_and_crosscheck.py clip.mov --movement squat \\
        --exercise bodyweight_squat --out fixture.json \\
        --movenet movenet_fixture.json

Filling groundTruthAngles (labels are hand-edited after export): the harness
compares against the ENGINE'S dimension.value, which for some dimensions is a
derived deviation, not the raw joint angle:
    squat/lunge  depth  -> knee_angle at the deepest (minimum-knee) frame
    squat/lunge  torso  -> torso_lean_from_vertical at that same frame
    pushup       depth  -> elbow_angle at the deepest (minimum-elbow) frame
    pushup/plank bodyLine -> 180 - body_line_angle  (deviation from straight)
The per-frame table this tool prints gives the raw angles; apply the
transform yourself where the dimension is a deviation.
"""

import argparse
import json
import math

# The app's KEYPOINT_NAMES order (lib/pose/types.ts) — fixture frames are
# 17 [y, x, score] tuples in exactly this order.
KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]
COCO = {name: i for i, name in enumerate(KEYPOINT_NAMES)}

# T1 bars (CALIBRATION.md §1/§8).
T1_MEDIAN_MAX = 5.0
T1_P95_MAX = 8.0


# ── Ported from lib/math.ts ───────────────────────────────────────────────────
def clamp(value: float, lo: float, hi: float) -> float:
    return lo if value < lo else hi if value > hi else value


# ── Ported from lib/geometry/angles.ts — keep in sync ─────────────────────────
def angle_at_joint(a, b, c) -> float:
    """Interior angle at vertex b for the path a->b->c, degrees [0,180].
    a/b/c are isotropic (x, y) points. NaN when either segment is degenerate."""
    v1x, v1y = a[0] - b[0], a[1] - b[1]
    v2x, v2y = c[0] - b[0], c[1] - b[1]
    mag1 = math.hypot(v1x, v1y)
    mag2 = math.hypot(v2x, v2y)
    if mag1 == 0 or mag2 == 0:
        return float("nan")
    cosine = clamp((v1x * v2x + v1y * v2y) / (mag1 * mag2), -1.0, 1.0)
    return math.degrees(math.acos(cosine))


def isotropic(kp, aspect_ratio: float):
    """[y, x, score] keypoint -> (x * aspectRatio, y): equal units on both axes.
    aspect_ratio is WIDTH / HEIGHT, matching Pose.aspectRatio in the app."""
    return (kp[1] * aspect_ratio, kp[0])


def _joint(kps, name: str):
    return kps[COCO[name]]


def knee_angle(kps, side: str, ar: float) -> float:
    """Knee flexion: hip->knee->ankle. 180 = straight leg."""
    return angle_at_joint(
        isotropic(_joint(kps, f"{side}_hip"), ar),
        isotropic(_joint(kps, f"{side}_knee"), ar),
        isotropic(_joint(kps, f"{side}_ankle"), ar),
    )


def elbow_angle(kps, side: str, ar: float) -> float:
    """Elbow flexion: shoulder->elbow->wrist. 180 = straight arm."""
    return angle_at_joint(
        isotropic(_joint(kps, f"{side}_shoulder"), ar),
        isotropic(_joint(kps, f"{side}_elbow"), ar),
        isotropic(_joint(kps, f"{side}_wrist"), ar),
    )


def hip_angle(kps, side: str, ar: float) -> float:
    """Hip flexion: shoulder->hip->knee. 180 = fully open."""
    return angle_at_joint(
        isotropic(_joint(kps, f"{side}_shoulder"), ar),
        isotropic(_joint(kps, f"{side}_hip"), ar),
        isotropic(_joint(kps, f"{side}_knee"), ar),
    )


def body_line_angle(kps, side: str, ar: float) -> float:
    """Whole-body line: shoulder->hip->ankle. 180 = straight shoulders-to-heels."""
    return angle_at_joint(
        isotropic(_joint(kps, f"{side}_shoulder"), ar),
        isotropic(_joint(kps, f"{side}_hip"), ar),
        isotropic(_joint(kps, f"{side}_ankle"), ar),
    )


def torso_lean_from_vertical(kps, side: str, ar: float) -> float:
    """Forward lean of the torso (shoulder over hip) from vertical. 0 = upright."""
    shoulder = _joint(kps, f"{side}_shoulder")
    hip = _joint(kps, f"{side}_hip")
    dx = (shoulder[1] - hip[1]) * ar  # x is index 1 in [y, x, score]
    dy = shoulder[0] - hip[0]  # y is index 0
    # "Up" is negative y in image coords; measure hip->shoulder off vertical.
    return math.degrees(math.atan2(abs(dx), -dy))


ANGLE_FNS = {
    "knee": knee_angle,
    "elbow": elbow_angle,
    "hip": hip_angle,
    "body_line": body_line_angle,
    "torso_lean": torso_lean_from_vertical,
}


def representative_angles(kps, ar: float) -> dict:
    """Every ported angle for both sides — the T1 cross-check compares these."""
    return {
        f"{name}_{side}": fn(kps, side, ar)
        for name, fn in ANGLE_FNS.items()
        for side in ("left", "right")
    }


# ── Self-check: the port vs analytic non-square ground truth ──────────────────
def self_check() -> None:
    """Verify the angles.ts port on a 16:9 pose whose metric angles are
    analytically exact. KEEP THE KEYPOINTS IN SYNC with
    lib/calibration/aspectRatio.test.ts — identical input must yield identical
    angles in TS and Python, or the T1 cross-check measures implementation
    drift instead of estimator drift.

    Derivation: knee Δx 0.1125 = 9/80, and 9/80 · 16/9 = 0.2 exactly →
    metric vectors (0, −0.2)/(0.2, 0.2) → exactly 135°. Torso Δx 0.16875 =
    27/160, · 16/9 = 0.3 exactly → atan2(0.3, 0.3) = exactly 45°. Unscaled
    lands at ~150.64°/~29.36°; an INVERTED width/height convention at
    ~162.44°/~17.56° — both far outside the 0.01° bar, so this check fails
    if the scaling is dropped or flipped."""
    ar = 16.0 / 9.0
    frame = [
        [0.05, 0.55, 0.9],     # nose
        [0.04, 0.54, 0.9],     # left_eye
        [0.04, 0.56, 0.9],     # right_eye
        [0.05, 0.53, 0.9],     # left_ear
        [0.05, 0.57, 0.9],     # right_ear
        [0.1, 0.66875, 0.95],  # left_shoulder  <- torso geometry
        [0.1, 0.67, 0.6],      # right_shoulder
        [0.25, 0.7, 0.9],      # left_elbow
        [0.25, 0.71, 0.6],     # right_elbow
        [0.35, 0.72, 0.9],     # left_wrist
        [0.35, 0.73, 0.6],     # right_wrist
        [0.4, 0.5, 0.95],      # left_hip       <- knee + torso geometry
        [0.4, 0.51, 0.6],      # right_hip
        [0.6, 0.5, 0.95],      # left_knee      <- knee geometry
        [0.6, 0.51, 0.6],      # right_knee
        [0.8, 0.6125, 0.95],   # left_ankle     <- knee geometry
        [0.8, 0.62, 0.6],      # right_ankle
    ]

    knee = knee_angle(frame, "left", ar)
    torso = torso_lean_from_vertical(frame, "left", ar)
    assert abs(knee - 135.0) <= 0.01, f"knee: expected 135.000°, got {knee:.4f}°"
    assert abs(torso - 45.0) <= 0.01, f"torso: expected 45.000°, got {torso:.4f}°"

    # Control: the same frame unscaled must MISS — proves the scaling is
    # actually exercised (and catches an inverted convention upstream).
    knee_unscaled = knee_angle(frame, "left", 1.0)
    torso_unscaled = torso_lean_from_vertical(frame, "left", 1.0)
    assert abs(knee_unscaled - 135.0) > 10, (
        f"unscaled knee unexpectedly near truth ({knee_unscaled:.2f}°)"
    )
    assert abs(torso_unscaled - 45.0) > 10, (
        f"unscaled torso unexpectedly near truth ({torso_unscaled:.2f}°)"
    )

    print("✅ self-check passed:")
    print(f"   knee  @16:9  {knee:8.4f}°  (truth 135.000°, unscaled {knee_unscaled:.2f}°)")
    print(f"   torso @16:9  {torso:8.4f}°  (truth  45.000°, unscaled {torso_unscaled:.2f}°)")


# ── Extraction (needs cv2 + mediapipe — imported lazily so --self-check
#    and the pure math above run with stdlib only) ─────────────────────────────
def sample_timestamps(n: int, duration_ms: float) -> list:
    """Interior 1/(N+1) timestamps, rounded to ms — the app's exact sampling
    (services/frames.ts: Math.round(((i + 1) * durationMs) / (count + 1)))."""
    return [round(((i + 1) * duration_ms) / (n + 1)) for i in range(n)]


def extract_keypoints(video_path: str, n_frames: int):
    """Returns (frames, aspect_ratio): per-frame 17 COCO keypoints as
    [y, x, score] (normalized), matching the fixture format. MediaPipe's
    per-landmark visibility stands in for confidence. aspect_ratio is
    WIDTH / HEIGHT of the source frames."""
    import cv2
    import mediapipe as mp

    lm_ids = mp.solutions.pose.PoseLandmark
    # MediaPipe(33) -> COCO(17), in KEYPOINT_NAMES order.
    mp_to_coco = [
        lm_ids.NOSE, lm_ids.LEFT_EYE, lm_ids.RIGHT_EYE, lm_ids.LEFT_EAR,
        lm_ids.RIGHT_EAR, lm_ids.LEFT_SHOULDER, lm_ids.RIGHT_SHOULDER,
        lm_ids.LEFT_ELBOW, lm_ids.RIGHT_ELBOW, lm_ids.LEFT_WRIST,
        lm_ids.RIGHT_WRIST, lm_ids.LEFT_HIP, lm_ids.RIGHT_HIP,
        lm_ids.LEFT_KNEE, lm_ids.RIGHT_KNEE, lm_ids.LEFT_ANKLE,
        lm_ids.RIGHT_ANKLE,
    ]

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
    duration_ms = (total / fps) * 1000.0
    frames = []
    aspect_ratio = None

    with mp.solutions.pose.Pose(static_image_mode=True, model_complexity=2) as pose:
        for ts in sample_timestamps(n_frames, duration_ms):
            cap.set(cv2.CAP_PROP_POS_MSEC, ts)
            ok, img = cap.read()
            if not ok:
                continue
            if aspect_ratio is None:
                h, w = img.shape[:2]
                aspect_ratio = w / h
            res = pose.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            kps = [[0.0, 0.0, 0.0] for _ in range(17)]
            if res.pose_landmarks:
                lm = res.pose_landmarks.landmark
                for coco_i, mp_lm in enumerate(mp_to_coco):
                    p = lm[mp_lm]
                    kps[coco_i] = [float(p.y), float(p.x), float(p.visibility)]
            frames.append(kps)
    cap.release()

    if not frames or aspect_ratio is None:
        raise SystemExit(f"❌ could not read any frames from {video_path}")
    return frames, aspect_ratio


def build_fixture(fixture_id: str, movement: str, exercise: str, frames, ar: float) -> dict:
    return {
        "id": fixture_id,
        "movementId": movement,
        "exerciseId": exercise,
        "capturedWith": "mediapipe",
        "aspectRatio": round(ar, 5),
        "frames": frames,
        "labels": {
            # Fill these in by hand per CALIBRATION.md §5/§7:
            "group": None, "rank": None, "tie": False,
            "groundTruthAngles": {},  # dimensionId -> value (see module docstring)
            "groundTruthSource": "mediapipe",
            "failureMode": None,
            "nuisance": [],
        },
    }


# ── Reporting ─────────────────────────────────────────────────────────────────
def print_angle_table(frames, ar: float) -> None:
    """Per-frame raw angles, both sides — for picking the key frame and
    hand-filling groundTruthAngles."""
    keys = list(representative_angles(frames[0], ar).keys())
    print("\n── per-frame angles (°) ──")
    print("frame  " + "  ".join(f"{k:>15s}" for k in keys))
    for i, kps in enumerate(frames):
        angles = representative_angles(kps, ar)
        print(f"{i:5d}  " + "  ".join(f"{angles[k]:15.1f}" for k in keys))


def crosscheck(mp_frames, mp_ar: float, movenet_path: str) -> None:
    """Per-angle deltas: MediaPipe vs. exported MoveNet keypoints (T1 evidence)."""
    import numpy as np

    with open(movenet_path) as f:
        mn = json.load(f)
    mn_frames = mn["frames"] if isinstance(mn, dict) else mn
    mn_ar = mn.get("aspectRatio", mp_ar) if isinstance(mn, dict) else mp_ar

    n = min(len(mp_frames), len(mn_frames))
    keys = list(representative_angles(mp_frames[0], mp_ar).keys())
    acc = {k: [] for k in keys}
    for i in range(n):
        a = representative_angles(mp_frames[i], mp_ar)
        b = representative_angles(mn_frames[i], mn_ar)
        for k in keys:
            acc[k].append(abs(a[k] - b[k]))

    print(f"\n── T1 cross-check: MediaPipe vs MoveNet ({n} frames) ──")
    print(f"   bars: median ≤ {T1_MEDIAN_MAX}°, p95 ≤ {T1_P95_MAX}° (CALIBRATION.md §8)")
    for k in keys:
        arr = np.array(acc[k], dtype=float)
        valid = arr[~np.isnan(arr)]
        if valid.size == 0:
            print(f"  --  {k:16s} no valid frames (all NaN)")
            continue
        med = float(np.median(valid))
        p95 = float(np.percentile(valid, 95))
        flag = "OK " if med <= T1_MEDIAN_MAX and p95 <= T1_P95_MAX else "!! "
        print(
            f"  {flag}{k:16s} median {med:5.1f}°  p95 {p95:5.1f}°"
            f"  (n={valid.size}/{arr.size})"
        )


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Extract MediaPipe keypoints into a calibration fixture "
                    "and cross-check angles against exported MoveNet keypoints.",
    )
    ap.add_argument("video", nargs="?",
                    help="clip to process (omit with --self-check)")
    ap.add_argument("--self-check", action="store_true",
                    help="verify the angles.ts port against analytic non-square "
                         "cases and exit (stdlib only)")
    ap.add_argument("--movement", help="movement id, e.g. squat")
    ap.add_argument("--exercise", help="exercise id, e.g. bodyweight_squat")
    ap.add_argument("--out", help="fixture JSON output path")
    ap.add_argument("--frames", type=int, default=12,
                    help="frames sampled across the clip (app default: 12)")
    ap.add_argument("--movenet", type=str, default=None,
                    help="path to a MoveNet fixture JSON exported from the app "
                         "(EXPO_PUBLIC_EXPORT_KEYPOINTS=1) to cross-check against")
    args = ap.parse_args()

    if args.self_check:
        self_check()
        return

    if not (args.video and args.movement and args.exercise and args.out):
        ap.error("video, --movement, --exercise and --out are required "
                 "(or use --self-check)")

    frames, ar = extract_keypoints(args.video, args.frames)
    fixture = build_fixture(
        f"{args.movement}_{args.exercise}", args.movement, args.exercise, frames, ar,
    )
    with open(args.out, "w") as f:
        json.dump(fixture, f, indent=2)
    print(f"✅ wrote fixture: {args.out}  ({len(frames)} frames, aspectRatio {ar:.4f})")

    print_angle_table(frames, ar)

    if args.movenet:
        crosscheck(frames, ar, args.movenet)


if __name__ == "__main__":
    main()
