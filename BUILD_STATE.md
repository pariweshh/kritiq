# Kritiq — BUILD_STATE.md

_Single source of truth for a resuming AI session. Everything below is code-verified against the repo at `/Users/pariwesh/Projects/Kritiq` (renamed from `FORM-AI`). Where the research and older docs disagree, this file wins — and the stale sources are named explicitly in §16 and §12._

---

Block A — paste as new §0. Agent operating contract (above §1)

0. Agent operating contract (READ FIRST)

First session is an AUDIT, not a build. On the first pass: read this file + the codebase, then output (a) a critique, (b) a prioritized plan against §15, and (c) every place this doc disagrees with the code you actually find. Then STOP and wait for approval before writing anything. This doc may be a few commits stale; your first job is to catch drift, not to charge ahead.

STOP and get explicit human confirmation before any of these (each is destructive or changes a product/privacy invariant):

ActionWhy it's gatedRotate/replace the Gemini key or edit wrangler secretKey rotation must be coordinated (old key shipped in prior builds — §10)Delete any git branchBranch cleanup is user-owned (§16)Bump PROGRESS_VERSIONSilently discards every user's PBs + streak (§9) — never do this casuallyMigrate the model to Git LFS / rewrite historyRepo-wide, breaks clones mid-flight (§13 #8)Change any scoring threshold or gate constantOnly valid with a committed fixture + harness evidence — see CALIBRATION.md §10. A threshold edit without a fixture is forbidden.Add any telemetry / logging of user dataBreaks the numbers-only + "proxy logs nothing" posture (§10). Opt-in aggregate only, and only with approval — CALIBRATION.md §9.Touch constants/config.ts real secretsGitignored on purpose; work against config.example.ts placeholdersRefactor services/pose.ts internalsSingle most fragile file (§13 #4); untestable in CI — propose first, change only with a device-smoke plan

How to work (contract):


After every landed change, re-run the gates: npx tsc --noEmit (app) · cd proxy && npx tsc --noEmit · npx vitest run. Don't hand back red gates.
Commit in small, described units. Don't bundle a feature and a refactor.
Keep this file live. When you land something in §15 or close a CALIBRATION.md tier, update the relevant § (§3 status, §6 screens, §9 storage, §13 debt) in the same change. A stale source-of-truth is worse than none.
Calibration lives in CALIBRATION.md. §7/§13#3/§15 of this file defer to it for status and the release gate. Don't duplicate calibration state here.
Don't add features or refactor beyond what the current task asks. If you spot adjacent work, note it in §15 and move on.

## 1. Start here (TL;DR for a resuming agent)

**Kritiq** is a privacy-first mobile app (Expo SDK 55 / React Native 0.83.6) that rates a user's exercise **form 0–100 entirely on-device**: it records a clip, runs MoveNet pose estimation locally, scores the movement with an owned deterministic engine, and (best-effort) sends **numbers only** to a Cloudflare Worker that has Gemini rephrase three coaching headlines. Video never leaves the device and is deleted right after analysis. Code lives at `/Users/pariwesh/Projects/Kritiq`; pure logic in `lib/`, device I/O in `services/`, screens in `app/` (expo-router), backend in `proxy/`.

**Current stage:** feature-complete for a v1 offline-first app. All 12 route screens are built and wired, 10 movements score, monetization is real code, progress/streaks/PBs work. **Gates are green: app `tsc` clean, proxy `tsc` clean, `vitest` 161/161.**

**The single most important next thing:** **threshold calibration.** Every scoring threshold in every movement spec (and the no-person gate) is a self-labeled first-pass placeholder tuned against one device dump. The app's core promise — an accurate score — is currently unvalidated. Everything else blocking release (RevenueCat keys, Gemini key rotation, WAF, store assets) is user-offline ops, not code.

---

## 2. What Kritiq is (sharpened positioning)

| | |
|---|---|
| **One-liner** | *Your form, scored on your phone — real biomechanics, not a chatbot's guess, and your video never leaves the device.* |
| **Current tagline** | "AI RATES YOUR FORM" (splash/onboarding). Serviceable but undersells the differentiator — consider surfacing "on-device" + "private". |
| **Target user** | Solo lifters and home/bodyweight trainees who work out without a coach and want objective, instant feedback on technique — privacy-conscious enough to care that footage isn't uploaded. |
| **Core promise** | Point your camera at a set, get a trustworthy 0–100 form score with a specific strongest area, focus area, and a form-snapshot skeleton highlighting your weakest joint — in seconds, offline. |
| **Differentiator** | **Real on-device biomechanics + an owned deterministic scoring engine**, not a black-box LLM guessing from pixels. Scores are computed from measured joint angles, are deterministic and unit-tested, and the LLM only *phrases* coaching from anonymous numbers. **Privacy is a product feature:** video + frames stay on-device and are deleted; only numbers are ever transmitted. |

---

## 3. Current status at a glance

**Stage:** v1 feature-complete, pre-store-submission. Offline-first, no login, no backend beyond a stateless coaching proxy.

**Platform:** Expo SDK 55, RN 0.83.6, React 19.2, New Architecture ON, React Compiler ON, typed routes. iOS-first (device-verified 2026-06-20); Android configured but unverified. CNG — `/ios` and `/android` are gitignored, prebuilt on demand.

**Works today (code-complete + committed):**
- On-device pipeline end-to-end: record → sample 12 frames → MoveNet Thunder pose → hard no-person gate → deterministic scoring → result + save.
- 10 scorable movements; numbers-only Gemini coaching overlay with graceful fallback.
- Record-then-delete privacy; frames deleted before any network call; launch-time orphan sweep.
- Progress: streaks, personal bests (durable beyond history cap), consistency heatmap, score trend, form-snapshot pose overlay.
- Real RevenueCat IAP code; movement-gate monetization.
- All 12 screens built (splash, onboarding, home, analyze/camera, result, history, progress, paywall, settings, privacy).

**Top blockers (all user-offline ops, not code):**
1. **Threshold calibration** — all placeholders (HIGHEST product risk).
2. **RevenueCat activation** — ASC IAP products + dashboard offering + real SDK keys; purchase flow never run end-to-end.
3. **Gemini key rotation** into the deployed Worker (old key was bundled into shipped builds).
4. **Cloudflare WAF / rate-limit rule** — no rate limiting exists in code (correct — belongs at the edge).
5. **Fresh checkout doesn't build** — `constants/config.ts` is gitignored with no committed template (code-level quick fix).

**Verification snapshot:**

| Gate | Result |
|---|---|
| `npx tsc --noEmit` (app) | ✅ exit 0, clean |
| `cd proxy && npx tsc --noEmit` | ✅ exit 0, clean |
| `npx vitest run` | ✅ 161/161, 25 files (~725ms) |
| vitest cold-run flake | **FIXED 2026-07-06:** `vitest.config.ts` now pins `fileParallelism: false`, which was the actual gap (the file existed all along — see §4 — it just didn't pin the pool). |

---

## 4. Tech stack & project layout

**Core:** expo `^55`, react-native `0.83.6`, react `19.2`, expo-router `~55.0.16`, @react-navigation `7.x`.
**Pose/vision:** react-native-fast-tflite `^3.0.1` (Expo plugin config enables the CoreML delegate at build time — **unverified whether it's actually used at runtime:** `services/pose.ts:71` calls `createModel(buffer, [])`, an empty delegates array, so the model may be running on the default/CPU path rather than CoreML; needs an on-device check, not a doc claim), react-native-nitro-modules `0.35.9` (JS pinned to native), jpeg-js `^0.4.4`, expo-image-manipulator, expo-video-thumbnails.
**IAP:** react-native-purchases `^9.7.6` (single importer `services/purchases.ts`).
**UI:** react-native-svg `15.15.3` (PoseSkeleton only), react-native-view-shot `4.0.3` (share card), @expo/vector-icons, expo-linear-gradient, expo-haptics, date-fns.
**Dev:** typescript `~5.9.2`, vitest `^4.1.9`, eslint `^9` + eslint-config-expo.

**Dead/unused weight (safe to remove when convenient):**
- `nativewind ^4.2.1` — installed, **zero wiring** (no babel/tailwind config, no `className=`). All styling is `StyleSheet.create` + `constants/theme.ts` tokens.
- `react-native-reanimated 4.2.1` + `react-native-worklets 0.7.4` — installed, **not directly imported** in app code.

**Config files:** `metro.config.js` (one line: `assetExts.push("tflite")`), `tsconfig.json` (strict, `@/*` alias, excludes `proxy/`), `vitest.config.ts` (`include: lib/**/*.test.ts` only — services are device-only), `app.json` (name Kritiq, `com.kritiq.app`, typedRoutes + reactCompiler, fast-tflite plugin). **No `babel.config.js`, `tailwind.config.js`, `global.css`.** `eas.json` has **only a `development` profile** — no preview/production build profile yet (TODO for store builds).

**Directory map:**
```
Kritiq/
├── app/                      expo-router routes (all built, none stubs)
│   ├── _layout.tsx  index.tsx(splash)  analyze.tsx  paywall.tsx
│   ├── privacy.tsx  settings.tsx  onboarding/index.tsx
│   ├── (tabs)/     _layout.tsx  index.tsx(home)  progress.tsx  history.tsx
│   └── result/[id].tsx
├── components/    AnalyzingOverlay, Confetti, ConsistencyHeatmap, ExerciseIcon,
│                  PoseSkeleton(svg), ScoreCard, ScoreTrend, StreakHero
├── hooks/         useAnalysis.ts      (the analysis pipeline entry)
├── utils/         share.ts
├── constants/     config.ts(GITIGNORED)  exercises.ts  legal.ts  theme.ts  types.ts
├── lib/           PURE logic, node-unit-tested
│   ├── math.ts  geometry/{angles,facingSide,stability}  pose/{types,transform,quality,highlightJoints}
│   ├── movements/ types,engine,result,selectors,registry,tiers
│   │              + 10 specs: squat,pushup,plank,reverseLunge,forwardLunge,
│   │                gluteBridge,overheadPress,bicepCurl,wallSit,deadlift
│   ├── coaching/  payload.ts          (numbers-only proxy payload)
│   ├── progress/  types,streaks,personalBests,dailyCounts,weeklyActivity
│   └── purchases/ entitlement.ts      (pure isProActive)
├── services/      DEVICE-ONLY, not unit-tested
│                  analysis.ts  coaching.ts  frames.ts  pose.ts(fast-tflite loader)
│                  privacy.ts  purchases.ts(RC glue)  storage.ts
├── proxy/         Cloudflare Worker: src/index.ts, wrangler.toml, own tsconfig
├── assets/models/movenet_thunder.tflite   (25 MB, committed direct — Git LFS candidate)
├── app.json  eas.json  metro.config.js  tsconfig.json  vitest.config.ts
└── .env(GITIGNORED)   package.json
```
(`/ios`, `/android` = CNG-generated, gitignored, not present.)

---

## 5. Architecture & end-to-end data flow

```
[Camera clip in app-private cache]                        privacy boundary
        │                                                 ─────────────────
        ▼                                        (nothing left of here is uploaded)
extractFrames(uri, 12, durationMs)   services/frames.ts   ← expo-video-thumbnails, interior 1/(N+1) timestamps
        │
        ▼  per frame
estimatePose(frame)                  services/pose.ts      ← MoveNet Thunder .tflite, C++ loader bypass
        │  17 COCO keypoints [y,x,score] each
        ▼
hasScorablePose(frames, movement)    lib/pose/quality.ts   ← HARD gate: ≥3 frames pass CONF_FLOOR + body-extent
        │  (fail → throw NO_POSE → refilm alert)
        ▼
scoreMovement(frames, movement)      lib/movements/engine.ts
        │  pick side (mid frame) → select key frame → measure each Dimension → gradeLinear → weighted total
        ▼
MovementScore { total, dimensions[{id,name,score,value,feedback}], lowConfidence }
        │
        ├── frames DELETED here (finally, in services/analysis.ts, BEFORE any network) ──┐
        │                                                                                │
        ▼                                                                                ▼
if lowConfidence → skip proxy         toCoachPayload(score, exerciseId)   lib/coaching/payload.ts
        │                             { movementId, exercise, total, dimensions[{id,name,score,value}] }
        │                                     │  value = round2 (preserves fractional wobble ~0.03)
        │                                     ▼   POST  x-kritiq-key
        │                             ┌─────────────────────────────┐
        │                             │ Cloudflare Worker (proxy)   │  strict numbers-only validation
        │                             │ gemini-3.5-flash phrasing    │  → { summary, topStrength, topImprovement }
        │                             └─────────────────────────────┘
        │                                     │  (any failure → null → keep deterministic strings)
        ▼                                     ▼
buildMovementResult(...)  +  optional Gemini overlay  →  AnalysisResult (incl. numbers-only keyPose)
        │
        ▼
saveAnalysis()   services/storage.ts   → history (cap 50) + durable records (PBs/streak); returns {newBest}
        │
        ▼
router.replace("/result/[id]", {data, pb, pbMetrics})     camera clip deleteQuietly'd in finally
```

**Privacy invariant (verified in code):** the only bytes that ever cross the network are `CoachPayload` — `movementId`, `exercise` id, integer `total`, and ≤8 `{id, name, score, value}` tuples where `value` is a **derived scalar** (angle/deviation/frame-fraction), never an (x,y) coordinate, never a pixel. No `MediaLibrary`/Photos write anywhere. Client-side Gemini path fully retired (grep-zero for `EXPO_PUBLIC_GEMINI_API_KEY`, `@google/genai`, `generativelanguage`).

---

## 6. Feature inventory by screen + primary journey

All 12 route files are **fully implemented and wired** — no UI stubs. The only "coming soon" surface is the `bench` exercise *card* (no movement spec), not a screen.

| Route | Screen | Purpose / highlights |
|---|---|---|
| `index.tsx` | **Splash** | KRITIQ wordmark, ≥1s hold, reads `onboardingComplete` → `/(tabs)` or `/onboarding`. |
| `onboarding/index.tsx` | **Onboarding** | 3-slide intro; writes `setOnboardingComplete()` on Get Started/Skip. "No account needed" + privacy line. |
| `(tabs)/_layout.tsx` | **Tab bar** | Analyze \| Progress \| History. |
| `(tabs)/index.tsx` | **Home (Analyze)** | Hub (735 lines). StreakHero (greeting/streak/7-day dots/stats); equipment filter All/Anywhere/Gym; 3-state exercise grid (free / Pro-locked→paywall / coming-soon); camera tips; "What we score" chips; Unlock-Pro chip or PRO badge; gear→settings; privacy trust line. Refreshes on focus. |
| `analyze.tsx` | **Record/Analyze** | Full-screen modal. Camera (or gallery upload fallback); `AnalyzingOverlay` during on-device run; camera recordings deleted in `finally`, gallery picks never touched; passes PB flags on fresh analysis only. |
| `result/[id].tsx` | **Result** | The wow moment (774 lines). Staggered reveal: ScoreCard (ViewShot shareable), form-snapshot PoseSkeleton (weakest joint highlighted), AI summary/strength/focus, per-metric breakdown + PB chips. Confetti + trophy on new PB; low-confidence → Refilm banner. |
| `(tabs)/progress.tsx` | **Progress** | Stat grid (streak/best-streak/sessions/best), 14-point ScoreTrend bars, per-exercise personal bests, 10-week ConsistencyHeatmap. |
| `(tabs)/history.tsx` | **History** | Reverse-chron list; tap → Result (no PB replay). |
| `paywall.tsx` | **Paywall** | Real RevenueCat offerings; purchase/restore; "temporarily unavailable" when offerings empty; §3.1.2 disclosure. |
| `settings.tsx` | **Settings** | Subscription (manage/unlock/restore), Privacy & data (+ destructive Delete all data → `clearHistory`), About, version. |
| `privacy.tsx` | **Privacy** | Privacy-as-feature: 3 pillars (on-device / recorded-then-deleted / only-numbers). |

Root `_layout.tsx` also: loads 7 fonts (gates render), runs `cleanupOrphanRecordings()`, and configures RevenueCat + attaches Pro-entitlement listener + launch-syncs it.

**Primary journey:** Launch → (first run) Onboarding → Home (pick exercise; Pro cards bounce to paywall) → "Analyze My Form" → Record (or gallery) → on-device analyze (gate → score → save, clip deleted) → Result (score + coaching + share; PB celebration; refilm if low-confidence) → back on Home the streak/stats/unlocks refresh on focus; the session appears in History and folds into Progress.

---

## 7. Scoring & movement system

**Engine (`lib/movements/engine.ts`):** a `Movement` is a declarative spec — `{ id, exerciseIds[], pickSide, selectKeyFrame, dimensions[], scoringJoints, gateJoints }`. Adding a movement = adding a spec, no engine code. Each `Dimension` measures one scalar and grades via `gradeLinear(value, best, worst)` (linear map, `value≤best→100`, `value≥worst→0`; "lower is better" flips best below worst; target-band metrics use `|angle−target|`). Total = weighted sum of unrounded grades (weights sum to 1). `lowConfidence` = any scoring joint at key pose < 0.3 conf → **skips the Gemini proxy** and shows a refilm banner.

**Hard no-person gate (`lib/pose/quality.ts`):** MoveNet always emits 17 keypoints (hallucinates on empty frames), so two independent discriminators must both pass on ≥`MIN_SCORABLE_FRAMES`(3): distal `gateJoints` clear `CONF_FLOOR`(0.35), and bounding-box **diagonal** ≥ `MIN_BODY_EXTENT`(0.45) (diagonal so horizontal plank/pushup pass). Fail → refilm.

**All 10 registered movements** (degrees unless noted; every threshold is a **PLACEHOLDER**):

| Movement | exerciseIds | Key frame | Dim1 (w) | Dim2 (w) | Access |
|---|---|---|---|---|---|
| squat | squat, bodyweight_squat | deepest knee | depth (.6) knee 90/160 | torso (.4) lean 30/75 | FREE (both) |
| pushup | pushup | deepest elbow | depth (.5) elbow 90/150 | bodyLine (.5) 180−hip 8/35 | FREE |
| plank | plank | clearest body | bodyLine (.5) 8/35 | stability (.5) hip wobble 0.01/0.05 | FREE |
| reverse_lunge | reverse_lunge | deepest knee | depth (.6) knee 90/**150** | torso (.4) 30/75 | FREE |
| forward_lunge | forward_lunge | deepest knee | depth (.6) knee 90/**150** | torso (.4) 30/75 | PRO |
| glute_bridge | glute_bridge | clearest hip (top) | hipExt (.6) 180−hip 10/50 | shin (.4) \|knee−90\| 8/35 | PRO |
| overhead_press | overhead_press | clearest elbow (top) | lockout (.6) 180−elbow 10/60 | torso (.4) 10/30 | PRO |
| bicep_curl | bicep_curl | deepest elbow (top) | ROM (.6) elbow 50/100 | sway (.4) shoulder wobble 0.01/0.05 | PRO |
| wall_sit | wall_sit | clearest legs | kneeTarget (.6) \|knee−90\| 8/40 | stability (.4) hip wobble 0.01/0.05 | PRO |
| deadlift | deadlift | deepest hip (bottom) | hinge (.4) hip 95/150 | lockout (.6) 180−max-hip-over-clip 10/50 | PRO |

**Coming soon (no spec):** `bench` only.

**Calibration status — ALL PLACEHOLDER (the one genuinely unfinished thing in scoring):**
- Every spec carries `PLACEHOLDER / tunable — same status as squat v1`.
- Unreconciled: lunge depth `worst=150°` vs squat `160°` (flagged in-file).
- Frame-fraction wobble tolerances (0.01/0.05) are guesses needing held-vs-shaky footage.
- Gate constants (0.35 / 0.45 / 3) tuned against **one** device dump (n=1).
- No labeled-footage harness or golden dataset exists. Calibration is a user-offline task.

**Documented constraint (not a bug):** COCO-17 has no mid-back landmark → **neutral-spine / "back position" is NOT gradeable**; deadlift deliberately scores hinge + lockout only. Note: `constants/exercises.ts` display-metric ids (e.g. `knee_tracking`, `bar_path`) are cosmetic labels and do **not** all map to scored dimensions — scored output comes from the movement spec.

---

## 8. Monetization & gating

**Model: movement-gate. No time trial, no usage cap.** `canAnalyze(exerciseId)` = `isExerciseUnlocked(exerciseId, isPremium)`. Free exercises unlimited forever; Pro exercises need an active `pro` entitlement; spec-less = coming-soon/unbuyable.

**Split (source of truth `lib/movements/tiers.ts` × registry):**
- **FREE (5):** bodyweight_squat, pushup, plank, reverse_lunge, squat (barbell — same spec as bodyweight).
- **PRO (6):** forward_lunge, glute_bridge, wall_sit, bicep_curl, overhead_press, deadlift (registered-but-Pro on purpose).
- **COMING-SOON (1):** bench (no spec → can never be mislabeled Pro).

**Prices: not in code.** All price points, plan labels, offering ids come live from RevenueCat at runtime (`getProPackages` → `offerings.current.availablePackages`). Paywall renders whatever the dashboard returns; `savingsLabel` is computed client-side. No hardcoded price anywhere by design.

**RevenueCat wiring — REAL code, placeholder keys:**
- Pure `lib/purchases/entitlement.ts` `isProActive(info, "pro")` (unit-tested, structural input).
- `services/purchases.ts` is the sole SDK importer: idempotent `configurePurchases()` **no-ops on placeholder keys** (`YOUR_`-prefixed), exposes flattened `ProPackage` view-model so the paywall is SDK-free. Private `syncFromInfo` is the ONLY writer of premium-from-RC.
- `isPremium` (in `UserState`) is a **cached mirror** of the live entitlement; the gate reads only the mirror. Sync = mount-once listener + launch sync (no focus poll) in `app/_layout.tsx`.
- Entitlement id `"pro"` is the one real value in `config.ts`; the API keys are placeholders (`YOUR_REVENUECAT_APPLE_KEY`/`…_GOOGLE_KEY`).

**Placeholder → real state:** with placeholder keys the SDK no-ops, offerings come back empty, paywall shows "Subscriptions are temporarily unavailable" + disabled button. This is exactly the state of a fresh checkout. Enforcement is doubled: card-tap (`home`) and analysis-start (`useAnalysis`).

**Dead config:** `config.freeTier { trialDurationDays:3, maxHistoryItems:10 }` is referenced nowhere (trial retired; `MAX_HISTORY_ITEMS=50` is hardcoded in `storage.ts`). Delete when convenient.

**Blocked on user-offline:** real RC SDK keys → gitignored `config.ts`; ASC IAP products + RC dashboard offering (monthly+yearly, entitlement `pro`); on-device sandbox buy/restore test. Purchase flow has **never run end-to-end.**

---

## 9. Data, storage, privacy & progress

**AsyncStorage keys (`services/storage.ts`, all `kritiq_*`):**

| Key | Shape | Notes |
|---|---|---|
| `kritiq_history` | `{ analyses: AnalysisResult[] }` | Cap 50, most-recent-first; parse-fail → `[]` |
| `kritiq_user_state` | `{ isPremium, onboardingComplete }` | No trial fields |
| `kritiq_records` | `{ version:1, personalBests, streak }` | Durable; survives the 50-cap |

`AnalysisResult` = id, exerciseId/Name, overallScore, metrics[], summary, topStrength/topImprovement, timestamp, tier, optional `lowConfidence`, optional **`pose`** (17 numbers-only keypoints for the overlay; absent on older records).

**Legacy migration (DONE):** `readMigrating` does a one-time forward copy `formai_*` → `kritiq_*` on first read then removes the legacy key. Applies to history + user_state. Minor debt: no version stamp retires the migration; it runs on every cold read forever (harmless).

**Durable records:** `saveAnalysis` writes `kritiq_records` every time (folds PBs + streak), version-gated (unknown version → `emptyRecords()`, no crash — but bumping `PROGRESS_VERSION` silently discards existing PBs/streak; acceptable at v1). `clearHistory` wipes history + records together (keeps premium).

**Record-then-delete privacy (DONE):** clip stays in app-private cache (no iCloud, never Photos). Two layers + a sweep: (1) camera source video deleted in `finally` (gallery picks never touched); (2) extracted frames deleted in `finally` **before any network call**; (3) `cleanupOrphanRecordings()` on launch sweeps `.mov/.mp4/.m4v` from cache root + optional `Camera/` subdir. `deleteQuietly` guards on existence, never throws.

**Progress (pure, immutable, tested):** streaks (local-day index across month/year edges; longest only grows), personal bests (first analysis sets baseline, not counted as a beaten PB), consistency heatmap (70 days), weekly activity (7 bools, on Home), score trend (last 14), form-snapshot pose overlay (weakest joint highlighted).

**Gaps:** thresholds placeholder (affects the stored score); no records-version migration beyond reset; device smoke of migration + PB banner + History strip still pending.

---

## 10. Backend proxy (Cloudflare Worker)

**`proxy/src/index.ts`** — stateless, logs nothing, git-tracked (8 files).

**Flow:** POST-only (405 otherwise) → optional `x-kritiq-key` match if `PROXY_SHARED_SECRET` set (401) → require `GEMINI_API_KEY` (500) → strict `parsePayload` (400 on any off-shape: labels ≤40 chars, `total`/`score`/`value` finite+clamped, 1–8 dimensions) → `buildPrompt` (one generic prompt for all movements) → `gemini-3.5-flash` REST via bare `fetch` (no SDK, avoids nodejs-compat surprises), `temperature 0.4`, `maxOutputTokens 2048` (high cap on purpose — thinking models spend tokens reasoning), structured-output schema → `extractText` skips `thought` parts → validate 3 string headlines. Malformed upstream → 502 with a 200-char preview (diagnostics on error path only, no PII since input is numbers).

**Second privacy boundary:** the validator hard-rejects anything but the numbers-only shape, so even a compromised client can't push arbitrary strings/large arrays through. The real Gemini key lives only as a Worker secret.

**Deploy:** `cd proxy && npm install && npx wrangler login && npx wrangler secret put GEMINI_API_KEY && npm run deploy`. Optional `PROXY_SHARED_SECRET`. `wrangler.toml`: `kritiq-coach-proxy`, `compatibility_date 2026-06-01`. Local dev via `proxy/.dev.vars` (gitignored; `.dev.vars.example` committed). Memory: curl-verified GREEN — all 4 movements → HTTP 200 with movement-specific headlines, plank round2 fix confirmed.

**Secrets & WAF status:**
- `GEMINI_API_KEY` — server-only. **Must be rotated:** the old key shipped in prior builds via the retired `EXPO_PUBLIC_GEMINI_API_KEY`; revoke + regenerate + `wrangler secret put`.
- `EXPO_PUBLIC_COACH_PROXY_KEY` (the `x-kritiq-key`) ships in the client bundle → it's a **casual-abuse speed-bump, not secret-grade**.
- **WAF / rate-limit: NOT DONE and NOT in code (correct — belongs at the edge).** Must be a hand-configured Cloudflare dashboard rate-limit rule on the Worker route. Until then, direct Gemini billing-drain risk if the endpoint URL leaks. This is the real abuse control.

---

## 11. Design system / theme

**"Refined Performance Dark" — CONFIRMED & complete.** All 7+ screens migrated to `typography.fonts` tokens (Barlow / SpaceMono), legacy Orbitron/Rajdhani purged. Dark base (`bg.primary #0D0D0D`), semantic tokens in `constants/theme.ts`, StyleSheet-only (nativewind unused). Line-icon exercises (MaterialCommunityIcons), no decorative emoji anywhere in UI. Polish shipped: PB confetti, Home hero/streak banner, settings, progress dashboard, form-snapshot skeleton.

**Invited direction (not a settled constraint):** the user is **open to a theme redesign / visual improvements.** Treat the current theme as a solid baseline that may be revisited, not a fixed requirement. If redesigning, the token layer (`constants/theme.ts` + `typography.fonts`) is the single seam to change — screens read tokens, not raw values.

---

## 12. Key decisions & rationale (+ rejected)

| # | Decision | Why |
|---|---|---|
| 1 | **On-device pose → owned deterministic scoring** (not send-video-to-LLM) | Privacy, determinism/testability, cost. The core pivot away from original FormAI. |
| 2 | **Numbers-only coaching proxy** | Gemini only *phrases* headlines from anonymous numbers; never sees pixels; key stays server-side. |
| 3 | **Coaching is best-effort overlay** | Any failure → deterministic strings; app never blocks on the network. |
| 4 | **Record-then-delete** | Frames deleted before any network call; `videoUri` removed from persisted results. |
| 5 | **Movement = declarative spec** | 10 movements reuse one engine; add a spec, not engine code. |
| 6 | **Trial RETIRED → movement-gate** | Free movements always allowed; Pro needs entitlement; no day/usage cap. |
| 7 | **`isPremium` = cached mirror of live `pro`** | Gate reads mirror; RC writes it via listener + launch sync. |
| 8 | **No login for v1** | Offline-first, AsyncStorage only, no backend. |
| 9 | **Rename FormAI → Kritiq w/ durable migration** | `formai_*` → `kritiq_*` on first read so on-device history survives. |
| 10 | **Direct Gemini REST via `fetch`** | Lighter in Workers runtime, avoids nodejs-compat surprises. |

**Rejected / abandoned:** send full video to Gemini for scoring (original FormAI); weekly-limit free tier; 3-day time-trial (both fully documented in `docs/superpowers` but superseded — see §16); the fast-tflite "spike harness" (removed once real loader landed). **Documented constraints:** neutral-spine not observable with COCO-17; all thresholds first-pass placeholders.

---

## 13. Known gaps, risks & tech debt (ranked)

Note on §13 vs §14 vs §15 — one plan, three lenses. Do not treat as three backlogs.
§13 is state: what is currently true about debt/risk. §14 is the release checklist with binary done-criteria. §15 is the single ordered backlog — the one place that says what to do next and in what order. When they appear to conflict, §15 wins on ordering and CALIBRATION.md wins on anything calibration. An item is not "in progress" in three places; it's tracked in §15 and its finish line is in §14.

1. **[HIGH] Fresh checkout does not build** — `constants/config.ts` gitignored, no committed template, imported by 4 modules incl. `services/analysis.ts`. **Fix: commit `config.example.ts` (placeholders) + update README.** Quick win.
2. **[HIGH] Proxy has no rate-limit/CORS in code** — abuse protection is a manual, undone Cloudflare WAF step; shared secret is optional and client-shipped. Billing-drain risk if URL leaks. User-offline.
3. **[MEDIUM] All scoring thresholds + the no-person gate are placeholders** (gate calibrated n=1). The core value prop is numerically unvalidated. User-offline calibration; no golden dataset exists.
4. **[MEDIUM] `services/pose.ts` is the single most fragile file** — a documented native-runtime workaround (C++ loader bypass, hand-rolled base64/jpeg) that CI can't test (native deps can't load under vitest). Any Expo/RN/fast-tflite/nitro bump could silently break the whole analysis path.
5. **[MEDIUM] RevenueCat: placeholder keys + zero device verification** of purchase/restore/entitlement-sync. Monetization unproven end-to-end.
6. **[LOW] Dead `config.freeTier`** (unreferenced) + stale trial doc/README references. Delete.
7. **[LOW] Forever-running `formai_*` migration** (no version stamp to retire it). Harmless.
8. **[LOW] 25 MB `movenet_thunder.tflite` committed direct** (not LFS) — bloats clone.
9. **[LOW] vitest cold-run flake** — no `vitest.config.ts` pins `fileParallelism`; intermittent-red-CI risk.

**Solid (not debt):** privacy enforcement (frames deleted pre-network, orphan sweep, numbers-only validator) is the strongest part; disciplined error handling (cleanups never throw, `tryCoaching`→null); tsc clean, only 2 narrow `as any`; pure `lib/` well-tested.

**Fresh-session quick wins:** commit `config.example.ts` (#1); add `vitest.config.ts` pinning pool (#9); delete `config.freeTier` + stale trial refs (#6).

--- 

Block B — replace §14. Release punch-list with this (adds binary done-criteria)

## 14. Release punch-list (with definition-of-done)

Each item is DONE only when its criterion is objectively true. "The code runs" is not a criterion.

ItemDONE when…StatusConfig templateconfig.example.ts committed with placeholders; a fresh git clone + documented steps builds without hand-editing gitignored files☐ (§13 #1)Threshold calibrationCALIBRATION.md §8 checklist — the free-five rows — are all checked; harness.test.ts green in vitest run☐ HIGHESTRevenueCat activationOn a real device in sandbox: buy → entitlement pro flips → gate opens; restore works; offering returns non-empty (monthly+yearly). Real keys in gitignored config.ts☐ (never run e2e)Gemini key rotationOld key revoked; new key set via wrangler secret put; deployed Worker returns 200 with new key; no EXPO_PUBLIC_GEMINI_* anywhere (grep-zero)☐Proxy hardening (WAF)Cloudflare rate-limit rule live on the Worker route; verified a burst returns 429☐Store build profileseas.json has preview + production; a production build completes☐ (dev-only now)Legal + privacy labelLegal hosted at a stable URL; ASC privacy label filled to match the numbers-only reality (§5); screenshots + copy uploaded☐On-device smoke5 free movements score; PB banner fires; History streak strip renders; formai_*→kritiq_* migration confirmed on a device that had the old build; low-confidence refilm path works☐SubmitProduction build → TestFlight accepted → submitted for review☐

Code quick-fixes (do alongside, low-risk): commit config.example.ts; add vitest.config.ts pinning fileParallelism (kills the cold-run flake, §3); delete dead config.freeTier + stale trial refs (§13 #6). Branch/LFS cleanup is gated — see §0.

## 15. Roadmap / next steps

**LEAD: make Kritiq more workout-relevant (user's desired direction).**

1. **Workout-session tracking (top priority feature).** Today each analysis is an isolated single-set record. Add a **session** concept — a workout containing multiple sets across multiple exercises — so users track a real training session, not one rep-set at a time. Implications to design: a `Session { id, startedAt, entries: AnalysisResult[] }` model layered above the existing `AnalysisResult` (history already stores per-set results — sessions group them); a "start/continue workout" flow on Home; per-session and per-set score rollups on Progress; session-level streaks/PBs. This reuses the existing scoring + storage + progress layers; the new surface is grouping + session UI. Reach for the lazy path: sessions are a grouping over existing history records, not a parallel store.
2. **More workout-oriented features** (build on sessions): set/rep counting within a clip, rest-timer, planned routines / templates, volume tracking, per-muscle-group summaries, week-over-week progression, session comparison ("your squat depth improved 8° vs last week").
3. **Threshold calibration** — collect labeled footage, build a calibration harness / golden dataset, replace every placeholder. This unblocks trustworthy scores and should run in parallel with sessions.
4. **RevenueCat activation** — products + offering + keys + sandbox verification.
5. **Proxy hardening** — Gemini key rotation + Cloudflare WAF rate-limit rule.
6. **Store submission** — EAS production profile, legal/privacy label, assets, TestFlight → submit.

Optional later: bench spec (only remaining coming-soon), Android verification, theme redesign (user is open to it — §11).

---

## 16. Repository, git/branch state & how to run

**Branch reality (verified via `git rev-parse`, 2026-07-06):**
- **`main` is canonical and matches `origin/main`.** `main`, `origin/main`, and `chore/rename-to-kritiq` all point at the **same SHA `4eaf295`** — the full Kritiq app (name Kritiq, `com.kritiq.app`, `kritiq_*` keys, `lib/movements`, RevenueCat, progress dashboard, pose overlay). Tree clean, HEAD on `main`.
- **One linear history — no "old FormAI vs new Kritiq" divergence.** The **SDK 54→55 upgrade is the foundation** of that history, not a side branch: `afd346d` (FormAI baseline) → `c713948` (Expo 54→55 dep alignment) → `d3b02f8` (rename FormAI→Kritiq) → `4912e35` (on-device pose rebuild begins) → … → `4eaf295`. So the app is **Kritiq built on top of the SDK 55 upgrade**; SDK 55 is fully in the canonical lineage. The early FormAI generation (direct video→Gemini) survives only as those first commits.
- **Redundant branches — safe to delete:** `chore/rename-to-kritiq` (identical SHA to `main`) and `chore/expo-sdk-55-upgrade` (`7d9d9ae`, an ancestor of `main` — already subsumed).
- Remote: `origin` has `main` + `chore/rename-to-kritiq` (same SHA).

**Current HEAD:** `4eaf295` — form-snapshot pose overlay on result (COCO-17 skeleton + weakest-joint highlight).

**STALE sources — do NOT trust at face value:**
- **`README.md`** describes the pre-rebuild FormAI app: claims SDK 52, "Gemini 2.0 Flash native video analysis", 3/week free tier, 3 exercises, files like `services/gemini.ts`. All wrong now. Treat as historical marketing copy.
- **`docs/superpowers/plans/2026-04-21-trial-paywall.md`** + its spec describe the REJECTED weekly→3-day-trial model. Current gating is the movement-gate.

**How to run / build / test:**
```bash
# From /Users/pariwesh/Projects/Kritiq

# Fresh checkout: recreate gitignored files first (NO template committed — TODO #1)
#   constants/config.ts   (coaching proxyUrl/proxyKey, revenueCat keys+entitlementId "pro", analysis knobs)
#   .env                  (EXPO_PUBLIC_COACH_PROXY_URL / _KEY)

npm install
npm test                 # vitest run → 161 tests (cold run may flake; re-run)
npx tsc --noEmit         # no npm script; app typecheck
npm run lint             # expo lint

# Device (New Arch + fast-tflite/nitro need a dev client, NOT Expo Go):
npx expo run:ios         # prebuilds /ios (CNG), builds+installs dev client
npx expo run:android
npx expo start           # then open in the installed dev client
# EAS dev build: eas build --profile development --platform ios
#   (no preview/production profile yet — add to eas.json for store builds)

# Coaching proxy (separate package)
cd proxy && npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY      # + optional PROXY_SHARED_SECRET
npm run typecheck        # tsc --noEmit
npm run dev              # wrangler dev (reads proxy/.dev.vars)
npm run deploy           # wrangler deploy
```
