# Kritiq — CALIBRATION.md

_The plan for the one thing BUILD_STATE.md names as risk #1. Every scoring threshold and the no-person gate are self-labeled placeholders tuned against one device dump (n=1). This doc defines what "validated" means under a $0 / single-subject constraint, the method to get there, and the binary bar that gates public release. Where this file and BUILD_STATE.md §7/§13/§15 disagree on calibration, **this file wins** — and BUILD_STATE.md should be updated to point here._

**Constraint set (locked with the user):** validate before any public release · self-labeled only, $0 · single subject (you) · Mac-based tooling · numbers-only privacy architecture must survive.

---

## §1. The release gate (what "validated" means here)

"Validation" is three different questions. A $0 / n=1 budget answers two of them to a hard bar and the third only to *defensible*, not *proven*. Pretending otherwise secretly re-requires money or a user base. So the honest gate is:

| Tier | Question | Provable at $0/n=1? | Release bar |
|---|---|---|---|
| **T1 — Measurement** | Are the measured angles/values correct? (keypoints → geometry) | **Yes, fully** | Cross-estimator agreement **≤ 5°** median, **≤ 8°** p95, on the validation set, per scored dimension |
| **T2 — Behaviour** | Does a better rep score higher than a worse rep, monotonically, and stay stable under camera/clothing/lighting change? | **Yes, fully** | **Zero** ordinal violations on every graded ladder · score drift **≤ 6 pts** across nuisance variants of the same rep |
| **T3 — Standard** | Is the value→score threshold itself the *right* standard for "good form"? | **No** | Every threshold **cited to a published norm** (§3.3) and surfaced in-app as *beta / anchored* until population data closes it (§9) |

**RELEASE = T1 pass + T2 pass + T3 anchored-and-labeled.** T3 is deliberately *not* "proven correct" at launch — that is unreachable on these constraints and is closed post-launch. If you find yourself holding release for T3 certainty, you have silently re-required spend or users; don't. Ship the achievable bar with honest labeling.

The full binary checklist is §8.

---

## §2. Why three tiers (30-second version)

A score is `standard(measure(keypoints))`. Two things can be wrong independently:

- The **measure** can be wrong (bad keypoints, wrong angle math) — that's T1, and geometry doesn't need a population to check.
- The **standard** can be wrong (90° knee ≠ the correct definition of good depth) — that's T3, a judgment about what good form *is*, which genuinely needs an expert or a real user distribution.

T2 sits between them: even with an unproven standard, you can prove the score *orders reps correctly* and is *stable* — which is most of the trust a user actually needs ("it agreed my second set was cleaner"). T2 is your strongest and cheapest trust signal; prioritise it.

---

## §3. The $0 method

### 3.1 T1 — measurement ground truth (no expert, no spend)

Your engine works in **2D projection** (COCO-17, [y,x,score]), so the correct comparison is the 2D projected angle on a side-on frame — no 3D rig needed.

1. **Second independent estimator (primary).** Run **MediaPipe / BlazePose** (Python, Mac) over the *same* frames and compute the *same* angles. Two independent estimators agreeing ⇒ your keypoints are trustworthy; where they diverge you've localised your error. This is scriptable and doubles as your fixture generator (§6).
2. **Printed protractor on freeze-frames (absolute anchor).** For a handful of side-on key frames per movement, pause and measure the projected joint angle by hand. This is the only *absolute* reference in the $0 kit — the estimator cross-check tells you *agreement*, the protractor tells you *truth* on a small anchor set.
3. **OpenCap (optional gold).** Free, markerless, runs off your iPhone. Use only if you want a stronger 3D reference on a few clips; not required to pass the gate.

**T1 pass** = MediaPipe vs. MoveNet+your-transform angle deltas within the §1 bar on the validation set, with the protractor anchor confirming neither estimator is systematically off.

### 3.2 T2 — behaviour (the high-value $0 work)

Record **yourself** grading your own reps, best → worst, per movement (§7). Then:

- **Ordinal check:** the engine's `total` must order the ladder the same way you did. Any inversion is a violation and must be resolved (usually a threshold or key-frame-selection bug, occasionally a genuine tie — mark ties explicitly).
- **Failure-mode check:** inject known faults (shallow squat, forward lean, knees caving) and confirm the *right dimension* takes the penalty, not just the total.
- **Robustness check:** re-film the *same* rep quality across camera distance, camera height, lighting, and **baggy vs. fitted clothing** (pose estimation degrades on loose clothing — the axis n=1 most often misses). Score drift across these must stay within the §1 bar.

### 3.3 T3 — anchoring (defensible, not proven)

For every `value → score` map, write down the source that justifies the endpoints, e.g.:

- **Squat depth** — parallel (thigh parallel to floor ≈ knee flexion crossing ~90° from full extension) as the "full marks" anchor; cite a named strength-training reference (e.g. NSCA *Essentials of Strength Training and Conditioning*, specific edition/page) rather than leaving it as folklore.
- **Push-up / plank body line** — neutral trunk (hip sag/pike tolerance) against a physio trunk-alignment norm.
- **ROM movements (curl, press, lunge, glute bridge)** — joint ROM endpoints against a published range-of-motion reference (e.g. AAOS/physio ROM norms).

Rule: **no threshold ships without a citation in this section.** "Anchored" ≠ "proven" — it means a reviewer can see *why* 90° = 100 instead of it being a guess. Population closure is §9.

> Do **not** use a strong multimodal model as T3 ground truth. It's fine as *dev-time triage* to surface disagreements for you to check, but if the VLM is wrong you calibrate to wrong. Human anchor + published norm is the arbiter.

---

## §4. Harness architecture

Lives in `lib/calibration/` — **pure, device-free, CI-able** (consistent with BUILD_STATE.md §4: `lib/` is pure logic, node-unit-tested).

```
lib/calibration/
├── harness.ts          runFixtures() → CalibrationReport  (T1 error + T2 ordinal report)
├── fixtures/           *.json  ← labeled keypoint fixtures (NEVER video)
│   ├── squat/  pushup/  plank/  ...
└── harness.test.ts     vitest: asserts T1/T2 bars → red CI when calibration regresses
tools/calibration/
└── extract_and_crosscheck.py   video → MediaPipe keypoints → fixture JSON + T1 cross-check report
```

**Why fixtures, not video:** privacy (no footage in the repo — consistent with the whole product thesis) and clone size. A fixture is the *extracted keypoints* plus labels. Video is processed once on your machine, fixtures are committed, video is deleted.

**Why it's a vitest test too:** once green, `harness.test.ts` turns calibration into a **regression gate** — the day an Expo/RN/fast-tflite/nitro bump silently shifts your angles (BUILD_STATE.md §13 #4, the `services/pose.ts` fragility), CI goes red instead of users getting wrong scores.

---

## §5. Fixture format (the data contract)

One fixture = one labeled clip's extracted keypoints + labels. Not every fixture needs every label: **measurement fixtures** carry `groundTruthAngles` (T1); **ordinal fixtures** carry `group` + `rank` (T2); most carry both.

```jsonc
{
  "id": "squat_good_side_01",
  "movementId": "squat",              // descriptive; the harness resolves the spec via exerciseId
  "exerciseId": "bodyweight_squat",   // must match a spec in lib/movements/registry (getMovementForExercise)
  "capturedWith": "moveNet_thunder",  // estimator that produced THESE keypoints
  "aspectRatio": 1.7778,              // optional, source clip width/height; defaults to 1 (square) if omitted —
                                      // the geometry layer isotropizes angles using this, so an unset aspect
                                      // ratio on non-square footage will skew T1 angle comparisons
  "frames": [                         // per frame: 17 COCO keypoints, [y, x, score]
    [[0.51,0.48,0.93], [0.49,0.50,0.91], /* ...15 more... */],
    [[0.62,0.47,0.95], /* ... */]
  ],
  "labels": {
    "group": "squat_depth_ladder_A",  // T2: same subject/session, varying quality
    "rank": 1,                        // T2: 1 = best in group (ties allowed, mark below)
    "tie": false,
    "groundTruthAngles": {            // T1: dimensionId → degrees (align keys to the spec's dimension ids)
      "depth": 92.0,
      "torso": 28.5
    },
    "groundTruthSource": "protractor",// protractor | mediapipe | opencap
    "failureMode": null,              // null | shallow_depth | forward_lean | knees_cave | pike | sag | ...
    "nuisance": ["fitted","eye_level","good_light"]  // vary these for the robustness axis
  }
}
```

**Key alignment:** `groundTruthAngles` keys must be the movement spec's **dimension ids** (or a documented alias map in `harness.ts`). The harness compares `groundTruthAngles[dimId]` against the engine's emitted `dimension.value` for that id.

---

## §6. The MediaPipe cross-check tool

`tools/calibration/extract_and_crosscheck.py`. It:

1. Samples frames from a clip at the **same interior `1/(N+1)` timestamps** the app uses (BUILD_STATE.md §5), so keypoints are comparable frame-for-frame.
2. Runs **MediaPipe Pose**, maps 33 landmarks → COCO-17, and emits a **fixture JSON** (§5) you can drop into `lib/calibration/fixtures/`.
3. Computes the representative joint angles using a **line-for-line port of `lib/geometry/angles.ts`** — including the isotropic aspect-ratio scaling — and, given MoveNet keypoints exported from the app, prints a **side-by-side angle delta** (the T1 evidence). If `angles.ts` changes, re-port it or the comparison silently skews.

**The MoveNet export hook is `services/keypointExport.ts`:** set `EXPO_PUBLIC_EXPORT_KEYPOINTS=1` in `.env`, analyze a clip in the dev client, and the fixture JSON (numbers only) is logged to the Metro console between `[kritiq:fixture:begin/end]` markers — copy it into `lib/calibration/fixtures/<movement>/` and/or pass it to the tool via `--movenet`. It fires before the no-person gate, so should-fail clips can become gate fixtures too. Dev builds only (`__DEV__`); it cannot ship.

---

## §7. Per-movement recording protocol (self-labeled)

Per movement, film on your Mac/phone side-on unless noted. Minimum viable set:

| Set | Purpose | What to film |
|---|---|---|
| **Ladder (T2)** | ordinal | 4–6 reps, deliberately best → worst, same session/clothing/angle |
| **Failure modes (T2)** | dimension attribution | 1 clip per known fault for that movement (see spec's dimensions) |
| **Anchor (T1)** | absolute truth | 2–3 side-on clips where you'll protractor the key frame; also run MediaPipe |
| **Nuisance (T2 robustness)** | stability | re-film ONE fixed-quality rep across: near/far, low/eye/high camera, dim/bright, baggy/fitted |

That's ~12–18 clips per movement, ~120–180 total for the 10 registered movements — a weekend of filming, all async, all you. Start with the **5 free movements** (squat, pushup, plank, reverse_lunge — squat covers both exercise ids); they gate launch under model B (everyone scores these free), so they must pass first.

Also calibrate the **no-person gate** (`CONF_FLOOR` 0.35 / `MIN_BODY_EXTENT` 0.45 / `MIN_SCORABLE_FRAMES` 3): film empty frames, partial-body, and off-angle clips that *should* fail, plus valid clips that *should* pass — the gate has a real false-reject / false-accept tradeoff and is currently n=1.

---

## §8. Definition of done (binary — this is the gate)

Calibration is complete when **all** of these are true:

- [ ] **T1** — for the 5 free movements, every scored dimension: MediaPipe vs. MoveNet angle delta ≤ 5° median / ≤ 8° p95 on the anchor + validation fixtures, protractor anchor confirms no systematic offset.
- [ ] **T2 ordinal** — zero unresolved ordinal violations across every ladder for the 5 free movements.
- [ ] **T2 failure attribution** — each injected fault penalises the correct dimension (not just the total).
- [ ] **T2 robustness** — score drift ≤ 6 pts across all nuisance variants of a fixed rep.
- [ ] **Gate** — no-person gate: 0 false-accepts and ≤ 1 false-reject on the gate fixture set; thresholds justified in-file, not n=1.
- [ ] **T3 anchored** — every threshold for the 5 free movements has a citation in §3.3; in-app copy labels scores as beta/anchored.
- [ ] **`harness.test.ts` green** in `npx vitest run`, wired into the gate list.
- [ ] Pro movements (6): same bars met **before** their Pro paywall goes live (they can trail the free five).

When the free-five rows are checked, you can ship. BUILD_STATE.md §3 / §13#3 / §15 get updated to reflect it.

---

## §9. Closing T3 after launch (population calibration, still $0)

The only realistic path to *proven* thresholds without spending is a real user distribution — and your numbers-only architecture makes a privacy-preserving version possible:

- Emit **opt-in, aggregate-only** telemetry: bucketed histograms of per-dimension `value` and `total` (e.g. 5° / 5-pt bins), **no per-user records, no session linkage, no PII**. If everyone clusters at 40 (too harsh) or 95 (too loose), the standard is wrong.
- This is a **choice, not a mandate** — it cuts against the current "proxy logs nothing" stance (BUILD_STATE.md §10). If you add it: opt-in default-off, disclosed on the privacy screen, aggregate at the edge. Keep A/B honest with your positioning.

Alternative if you'd rather never add telemetry: a one-time cheap expert pass later (the $ option you declined for now) reopens T3 without touching the app.

---

## §10. For the coding agent (Fable / Claude Code)

- The harness and cross-check tool are **stubs** — wire real import paths and signatures to the actual repo; don't assume mine match.
- **Do not invent or change scoring thresholds without a fixture that justifies the change.** A threshold edit is only valid if a committed fixture + the harness show it fixes a T1 error or T2 violation. This is the scope-lock for calibration work.
- **Do not add §9 telemetry without explicit approval** — it changes the privacy posture.
- Calibration is done **only** when §8 passes — that's the finish line, not "the harness runs."
- When a tier closes, **update BUILD_STATE.md** (§3 status, §13#3, §15) so the single source of truth stays true.
