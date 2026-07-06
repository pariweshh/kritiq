# Kritiq — privacy-first, on-device form scoring

Point your camera at a set and get a trustworthy 0–100 form score — computed
entirely on your phone from measured joint angles, not a chatbot's guess at
pixels. Your clip never leaves the device.

## How it works

1. Record (or pick from your library) a short clip of a set.
2. The app runs MoveNet pose estimation **on-device** to find 17 body
   keypoints per sampled frame.
3. A hard no-person gate rejects empty/off-angle frames, then an owned,
   deterministic scoring engine grades the movement from measured joint
   angles — depth, torso lean, body-line, lockout, etc., depending on the
   exercise.
4. The camera clip and extracted frames are deleted immediately after
   scoring, before anything touches the network.
5. Only anonymous numbers (never coordinates, never pixels) are optionally
   sent to a Cloudflare Worker, which asks Gemini to phrase three coaching
   headlines from those numbers. Any failure here falls back to deterministic,
   locally-generated coaching text — the app never blocks on the network.

See [`proxy/README.md`](proxy/README.md) for the exact wire format and privacy
contract of that last step.

## Tech stack

| Layer      | Tech                                              |
| ---------- | -------------------------------------------------- |
| Framework  | Expo SDK 55, React Native 0.83.6, React 19.2, New Architecture |
| Navigation | Expo Router (typed routes)                          |
| Pose       | MoveNet SinglePose Thunder via `react-native-fast-tflite` |
| Scoring    | Owned deterministic engine — pure TypeScript in `lib/`, unit-tested |
| Coaching   | Cloudflare Worker + Gemini, numbers-only input, best-effort |
| Payments   | RevenueCat (movement-gate: some exercises free, some Pro) |
| Storage    | AsyncStorage — offline-first, no login, no backend beyond the coaching proxy |

## Project structure

```
Kritiq/
├── app/                 expo-router screens (splash, onboarding, home,
│                        analyze/camera, result, history, progress, paywall,
│                        settings, privacy)
├── components/          ScoreCard, PoseSkeleton, StreakHero, ConsistencyHeatmap, ...
├── hooks/useAnalysis.ts the analysis pipeline entry point
├── constants/           config.ts (gitignored — copy from config.example.ts),
│                        exercises.ts, theme.ts, types.ts
├── lib/                 PURE logic, node-unit-tested (vitest)
│   ├── math.ts, geometry/, pose/
│   ├── movements/        the scoring engine + one declarative spec per exercise
│   ├── coaching/payload.ts   numbers-only payload sent to the proxy
│   ├── progress/         streaks, personal bests, heatmap
│   └── calibration/       harness for validating scoring thresholds against
│                          labeled fixtures (see CALIBRATION.md)
├── services/             DEVICE-ONLY, not unit-tested: pose.ts (model loader),
│                        frames.ts, analysis.ts, storage.ts, purchases.ts, privacy.ts
├── proxy/                Cloudflare Worker — coaching proxy (own package)
├── assets/models/movenet_thunder.tflite   the pose model, committed direct
└── tools/calibration/    Python cross-check tooling (see CALIBRATION.md)
```

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy the config template and fill in your own values
cp constants/config.example.ts constants/config.ts
#    - coaching.proxyUrl / proxyKey come from EXPO_PUBLIC_COACH_PROXY_URL / _KEY
#      in a local .env (see proxy/README.md to deploy your own proxy)
#    - revenueCat keys are optional for local dev — placeholders make the SDK
#      no-op safely (see "Monetization" below)

# 3. Run on a physical device (NOT Expo Go — New Architecture + the pose
#    model need a custom dev client)
npx expo run:ios       # or: npx expo run:android
```

Camera/pose features require a physical device; simulators can't drive the
camera or the native pose pipeline.

## Development

```bash
npm test              # vitest run — pure lib/ logic, no device needed
npx tsc --noEmit       # app typecheck
npm run lint           # expo lint
cd proxy && npx tsc --noEmit   # proxy typecheck (separate package)
```

## Monetization

Movement-gate, not a time trial: free exercises (bodyweight squat, barbell
squat, push-up, plank, reverse lunge) are unlimited forever; Pro exercises
(forward lunge, glute bridge, wall sit, bicep curl, overhead press, deadlift)
need an active RevenueCat `pro` entitlement. Prices are never hardcoded — they
come live from whatever offering you configure in the RevenueCat dashboard.

## Privacy

- Video and extracted frames live only in app-private cache and are deleted
  right after scoring — before any network call.
- The only bytes that ever leave the device are anonymous numbers (a
  movement id, an exercise id, an integer total, and up to 8
  `{id, name, score, value}` tuples) — see [`proxy/README.md`](proxy/README.md).
- No photo library writes, no account, no login.

## Status

This app is pre-store-submission. The single biggest open item is **threshold
calibration** — every scoring threshold is a first-pass placeholder pending
validation against labeled footage; see `CALIBRATION.md` for the method and
release gate, and `BUILD_STATE.md` for full current status, known gaps, and
the roadmap.
