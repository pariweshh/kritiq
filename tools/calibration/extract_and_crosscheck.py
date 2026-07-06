#!/usr/bin/env python3
"""
tools/calibration/extract_and_crosscheck.py  — STUB (mirror your real angle math)

Bridges raw footage -> (a) a keypoint fixture for the TS harness, and
(b) T1 measurement evidence: MediaPipe angles vs. your engine's MoveNet angles.

Runs on your Mac. Video is processed locally and NOT committed — only the
extracted-keypoint fixture is (CALIBRATION.md §4/§6).

Install:
    pip install opencv-python mediapipe numpy

Usage:
    # produce a MediaPipe fixture for the harness
    python extract_and_crosscheck.py clip.mov --movement squat --exercise bodyweight_squat \\
        --out lib/calibration/fixtures/squat/squat_good_side_01.json

    # also cross-check against MoveNet keypoints you exported from a debug hook
    python extract_and_crosscheck.py clip.mov --movement squat --exercise bodyweight_squat \\
        --out fixture.json --movenet movenet_keypoints.json
"""

import argparse
import json
import math
from typing import Optional

import cv2
import numpy as np
import mediapipe as mp

# ── MediaPipe(33) -> COCO(17) index map. VERIFY against your transform. ───────
# COCO order: nose, L/R eye, L/R ear, L/R shoulder, L/R elbow, L/R wrist,
#             L/R hip, L/R knee, L/R ankle
MP = mp.solutions.pose.PoseLandmark
MP_TO_COCO = [
    MP.NOSE, MP.LEFT_EYE, MP.RIGHT_EYE, MP.LEFT_EAR, MP.RIGHT_EAR,
    MP.LEFT_SHOULDER, MP.RIGHT_SHOULDER, MP.LEFT_ELBOW, MP.RIGHT_ELBOW,
    MP.LEFT_WRIST, MP.RIGHT_WRIST, MP.LEFT_HIP, MP.RIGHT_HIP,
    MP.LEFT_KNEE, MP.RIGHT_KNEE, MP.LEFT_ANKLE, MP.RIGHT_ANKLE,
]
COCO = {name: i for i, name in enumerate([
    "nose", "l_eye", "r_eye", "l_ear", "r_ear", "l_shoulder", "r_shoulder",
    "l_elbow", "r_elbow", "l_wrist", "r_wrist", "l_hip", "r_hip",
    "l_knee", "r_knee", "l_ankle", "r_ankle",
])}


def sample_timestamps(n: int, duration_ms: float) -> list[float]:
    """Interior 1/(N+1) timestamps — the same sampling the app uses (BUILD_STATE.md §5)."""
    return [duration_ms * (i + 1) / (n + 1) for i in range(n)]


def extract_keypoints(video_path: str, n_frames: int = 12) -> list[list[list[float]]]:
    """Returns per-frame 17 COCO keypoints as [y, x, score] (normalized), matching fixture format."""
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
    duration_ms = (total / fps) * 1000.0
    frames: list[list[list[float]]] = []

    with mp.solutions.pose.Pose(static_image_mode=True, model_complexity=2) as pose:
        for ts in sample_timestamps(n_frames, duration_ms):
            cap.set(cv2.CAP_PROP_POS_MSEC, ts)
            ok, img = cap.read()
            if not ok:
                continue
            res = pose.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            kps = [[0.0, 0.0, 0.0] for _ in range(17)]
            if res.pose_landmarks:
                lm = res.pose_landmarks.landmark
                for coco_i, mp_lm in enumerate(MP_TO_COCO):
                    p = lm[mp_lm]
                    kps[coco_i] = [float(p.y), float(p.x), float(p.visibility)]  # [y, x, score]
            frames.append(kps)
    cap.release()
    return frames


# ── Angle helpers. TODO: replace with your exact lib/geometry/angles formulas ──
def _angle(a, b, c) -> float:
    """Interior angle at b for points a-b-c, using (x, y) from a [y, x, score] keypoint."""
    ax, ay = a[1], a[0]
    bx, by = b[1], b[0]
    cx, cy = c[1], c[0]
    v1 = np.array([ax - bx, ay - by])
    v2 = np.array([cx - bx, cy - by])
    cos = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-9)
    return math.degrees(math.acos(np.clip(cos, -1.0, 1.0)))


def representative_angles(kps: list[list[float]]) -> dict[str, float]:
    """A few reference angles per frame. TODO: mirror the dimensions your specs actually score."""
    return {
        "knee_L": _angle(kps[COCO["l_hip"]], kps[COCO["l_knee"]], kps[COCO["l_ankle"]]),
        "elbow_L": _angle(kps[COCO["l_shoulder"]], kps[COCO["l_elbow"]], kps[COCO["l_wrist"]]),
        "hip_L": _angle(kps[COCO["l_shoulder"]], kps[COCO["l_hip"]], kps[COCO["l_knee"]]),
    }


def build_fixture(fixture_id: str, movement: str, exercise: str, frames) -> dict:
    return {
        "id": fixture_id,
        "movementId": movement,
        "exerciseId": exercise,
        "capturedWith": "mediapipe",
        "frames": frames,
        "labels": {
            # Fill these in by hand per CALIBRATION.md §5/§7:
            "group": None, "rank": None, "tie": False,
            "groundTruthAngles": {},          # protractor/MediaPipe truth, dimensionId -> degrees
            "groundTruthSource": "mediapipe",
            "failureMode": None,
            "nuisance": [],
        },
    }


def crosscheck(mp_frames, movenet_path: str) -> None:
    """Print per-frame angle deltas: MediaPipe vs. exported MoveNet keypoints (T1 evidence)."""
    with open(movenet_path) as f:
        mn = json.load(f)
    mn_frames = mn["frames"] if isinstance(mn, dict) else mn
    n = min(len(mp_frames), len(mn_frames))
    print(f"\n── T1 cross-check: MediaPipe vs MoveNet ({n} frames) ──")
    keys = representative_angles(mp_frames[0]).keys()
    acc = {k: [] for k in keys}
    for i in range(n):
        a, b = representative_angles(mp_frames[i]), representative_angles(mn_frames[i])
        for k in keys:
            d = abs(a[k] - b[k])
            acc[k].append(d)
    for k in keys:
        arr = np.array(acc[k])
        flag = "OK " if np.median(arr) <= 5 and np.percentile(arr, 95) <= 8 else "!! "
        print(f"  {flag}{k:10s} median {np.median(arr):5.1f}°  p95 {np.percentile(arr, 95):5.1f}°")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--movement", required=True)
    ap.add_argument("--exercise", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--frames", type=int, default=12)
    ap.add_argument("--movenet", type=Optional[str], default=None,
                    help="Path to exported MoveNet keypoints JSON to cross-check against")
    args = ap.parse_args()

    frames = extract_keypoints(args.video, args.frames)
    fixture = build_fixture(f"{args.movement}_{args.exercise}", args.movement, args.exercise, frames)
    with open(args.out, "w") as f:
        json.dump(fixture, f, indent=2)
    print(f"✅ wrote fixture: {args.out}  ({len(frames)} frames)")

    if args.movenet:
        crosscheck(frames, args.movenet)


if __name__ == "__main__":
    main()