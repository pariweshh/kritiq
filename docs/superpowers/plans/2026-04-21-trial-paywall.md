# Trial Free Tier + Personalized Paywall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the weekly-limit free tier with a 3-day unlimited trial starting on first completed analysis, and replace the generic paywall subtitle with a personalized message based on how many analyses the user completed.

**Architecture:** All free-tier logic lives in `services/storage.ts`. `UserState` gains `firstAnalysisDate` and loses the weekly counter fields. The paywall reads trial stats from storage on mount — no route params needed. Changes flow types → config → storage → hook → paywall.

**Tech Stack:** TypeScript, React Native, Expo Router, AsyncStorage (`@react-native-async-storage/async-storage`)

---

## Files

| File | Change |
|---|---|
| `constants/types.ts` | Remove `weeklyAnalysesUsed`, `weekStartDate`; add `firstAnalysisDate?: number` |
| `constants/config.ts` | Replace `weeklyAnalysisLimit` with `trialDurationDays: 3` |
| `services/storage.ts` | Rewrite `canAnalyze()`, rename `incrementAnalysisCount` → `recordTrialStart`, update `DEFAULT_USER_STATE` |
| `hooks/useAnalysis.ts` | Replace `incrementAnalysisCount` call with `recordTrialStart` |
| `app/paywall.tsx` | Load trial stats on mount, replace static subtitle with dynamic copy |

---

### Task 1: Update `UserState` type

**Files:**
- Modify: `constants/types.ts`

No test suite — TypeScript compilation is the verification step throughout this plan.

- [ ] **Step 1: Replace the `UserState` interface**

Open `constants/types.ts`. Replace the entire `UserState` interface:

```ts
export interface UserState {
  isPremium: boolean
  weeklyAnalysesUsed: number
  weekStartDate: string // ISO date of current week start
  onboardingComplete: boolean
}
```

with:

```ts
export interface UserState {
  isPremium: boolean
  firstAnalysisDate?: number // Unix ms — set on first completed analysis
  onboardingComplete: boolean
}
```

- [ ] **Step 2: Verify TypeScript catches the now-stale usages**

```bash
cd /Users/pariwesh/projects/FORM-AI && npx tsc --noEmit 2>&1
```

Expected: errors pointing to `services/storage.ts` referencing `weeklyAnalysesUsed` and `weekStartDate`. This confirms the type is enforced. Tasks 2–3 will fix them.

- [ ] **Step 3: Commit**

```bash
cd /Users/pariwesh/projects/FORM-AI && git add constants/types.ts && git commit -m "feat(types): replace weekly counter fields with firstAnalysisDate on UserState"
```

---

### Task 2: Update config

**Files:**
- Modify: `constants/config.ts`

- [ ] **Step 1: Replace the `freeTier` config block**

Open `constants/config.ts`. Replace:

```ts
  // Free tier limits
  freeTier: {
    weeklyAnalysisLimit: 3,
    maxHistoryItems: 10, // Premium gets 50
  },
```

with:

```ts
  // Free tier limits
  freeTier: {
    trialDurationDays: 3,
    maxHistoryItems: 10, // Premium gets 50
  },
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/pariwesh/projects/FORM-AI && npx tsc --noEmit 2>&1
```

Expected: same errors as Task 1 Step 2 — no new errors, none resolved yet (storage.ts still broken).

- [ ] **Step 3: Commit**

```bash
cd /Users/pariwesh/projects/FORM-AI && git add constants/config.ts && git commit -m "feat(config): replace weeklyAnalysisLimit with trialDurationDays"
```

---

### Task 3: Rewrite free-tier logic in storage service

**Files:**
- Modify: `services/storage.ts`

- [ ] **Step 1: Replace the full storage service**

Replace the entire contents of `services/storage.ts` with:

```ts
import type {
  AnalysisHistory,
  AnalysisResult,
  UserState,
} from "@/constants/types"
import config from "@/constants/config"
import AsyncStorage from "@react-native-async-storage/async-storage"

const KEYS = {
  HISTORY: "formai_history",
  USER_STATE: "formai_user_state",
} as const

// ========================
// Analysis History
// ========================

export async function getHistory(): Promise<AnalysisResult[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.HISTORY)
    if (!raw) return []
    const data: AnalysisHistory = JSON.parse(raw)
    return data.analyses.sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}

export async function saveAnalysis(result: AnalysisResult): Promise<void> {
  const existing = await getHistory()
  // Keep last 50 analyses
  const updated = [result, ...existing].slice(0, 50)
  await AsyncStorage.setItem(
    KEYS.HISTORY,
    JSON.stringify({ analyses: updated }),
  )
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.HISTORY)
}

// ========================
// User State & Trial
// ========================

const DEFAULT_USER_STATE: UserState = {
  isPremium: false,
  onboardingComplete: false,
}

export async function getUserState(): Promise<UserState> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_STATE)
    if (!raw) return DEFAULT_USER_STATE
    return JSON.parse(raw) as UserState
  } catch {
    return DEFAULT_USER_STATE
  }
}

export async function saveUserState(state: UserState): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_STATE, JSON.stringify(state))
}

export async function recordTrialStart(): Promise<void> {
  const state = await getUserState()
  if (state.firstAnalysisDate !== undefined) return
  state.firstAnalysisDate = Date.now()
  await saveUserState(state)
}

export async function canAnalyze(): Promise<{
  allowed: boolean
  isPremium: boolean
}> {
  const state = await getUserState()

  if (state.isPremium) {
    return { allowed: true, isPremium: true }
  }

  // Trial not yet started — allow and let recordTrialStart() begin the clock
  if (state.firstAnalysisDate === undefined) {
    return { allowed: true, isPremium: false }
  }

  const trialMs =
    config.freeTier.trialDurationDays * 24 * 60 * 60 * 1000
  const trialActive = Date.now() - state.firstAnalysisDate < trialMs

  return { allowed: trialActive, isPremium: false }
}

export async function setOnboardingComplete(): Promise<void> {
  const state = await getUserState()
  state.onboardingComplete = true
  await saveUserState(state)
}

export async function setPremiumStatus(isPremium: boolean): Promise<void> {
  const state = await getUserState()
  state.isPremium = isPremium
  await saveUserState(state)
}
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
cd /Users/pariwesh/projects/FORM-AI && npx tsc --noEmit 2>&1
```

Expected: the storage errors are gone. Remaining errors (if any) will point to `hooks/useAnalysis.ts` referencing the deleted `incrementAnalysisCount` export. Task 4 fixes that.

- [ ] **Step 3: Commit**

```bash
cd /Users/pariwesh/projects/FORM-AI && git add services/storage.ts && git commit -m "feat(storage): replace weekly counter with 3-day trial logic"
```

---

### Task 4: Update `useAnalysis` hook

**Files:**
- Modify: `hooks/useAnalysis.ts`

- [ ] **Step 1: Replace the import and call site**

Open `hooks/useAnalysis.ts`. In the import from `@/services/storage`, replace `incrementAnalysisCount` with `recordTrialStart`:

```ts
import {
  canAnalyze,
  recordTrialStart,
  saveAnalysis,
} from "@/services/storage"
```

Then in the `analyze` function body, replace:

```ts
        if (!isPremium) {
          await incrementAnalysisCount()
        }
```

with:

```ts
        await recordTrialStart()
```

(`recordTrialStart` is idempotent — safe to call on every analysis, including for premium users. It only writes once.)

- [ ] **Step 2: Verify TypeScript is clean**

```bash
cd /Users/pariwesh/projects/FORM-AI && npx tsc --noEmit 2>&1
```

Expected: zero errors introduced by this change.

- [ ] **Step 3: Commit**

```bash
cd /Users/pariwesh/projects/FORM-AI && git add hooks/useAnalysis.ts && git commit -m "feat(hook): call recordTrialStart instead of incrementAnalysisCount"
```

---

### Task 5: Personalize the paywall screen

**Files:**
- Modify: `app/paywall.tsx`

- [ ] **Step 1: Add imports and trial stats loader**

Open `app/paywall.tsx`. Add `useEffect` and `useState` to the React import (they may already be there — if so, skip adding them):

```ts
import { useEffect, useState } from "react"
```

Add storage imports after the existing imports:

```ts
import { getHistory, getUserState } from "@/services/storage"
```

- [ ] **Step 2: Add state and effect inside `PaywallScreen`**

Inside the `PaywallScreen` component, after the existing `useState` calls, add:

```ts
  const [analysisCount, setAnalysisCount] = useState(0)

  useEffect(() => {
    Promise.all([getHistory(), getUserState()])
      .then(([history]) => {
        setAnalysisCount(history.length)
      })
      .catch(() => {
        // fall back to 0 — static subtitle will show
      })
  }, [])
```

- [ ] **Step 3: Add the dynamic subtitle helper**

Add this function just above the `PaywallScreen` component (outside it):

```ts
function getTrialSubtitle(count: number): string {
  if (count >= 10) {
    return `${count} analyses in 3 days. That kind of consistency is what separates good from great.`
  }
  if (count >= 4) {
    return `You've put in ${count} analyses — you're building real momentum.`
  }
  return "You've started building better form. Keep going."
}
```

- [ ] **Step 4: Replace the static subtitle**

In the JSX, find the static `<Text style={styles.subtitle}>` element:

```tsx
        <Text style={styles.subtitle}>
          Unlock unlimited form analyses{"\n"}and track your progress over time.
        </Text>
```

Replace with:

```tsx
        <Text style={styles.subtitle}>{getTrialSubtitle(analysisCount)}</Text>
```

- [ ] **Step 5: Verify TypeScript is clean**

```bash
cd /Users/pariwesh/projects/FORM-AI && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/pariwesh/projects/FORM-AI && git add app/paywall.tsx && git commit -m "feat(paywall): personalize subtitle with trial analysis count"
```

---

## Self-Review

**Spec coverage:**
- ✅ `UserState` updated: Task 1
- ✅ Config updated: Task 2
- ✅ `canAnalyze()` rewritten with 3-day trial logic: Task 3
- ✅ `recordTrialStart()` replaces `incrementAnalysisCount()`: Tasks 3 + 4
- ✅ `DEFAULT_USER_STATE` updated (no weekly fields): Task 3
- ✅ Paywall reads `getHistory().length` on mount: Task 5
- ✅ Dynamic subtitle with 3 tiers (0–3, 4–9, 10+): Task 5
- ✅ Error fallback on paywall load (catch → count stays 0): Task 5
- ✅ Existing users with old `weeklyAnalysesUsed` keys: safe — `getUserState()` returns the stored JSON and TypeScript ignores extra keys; `DEFAULT_USER_STATE` no longer includes them so new users are clean

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:**
- `recordTrialStart` defined in Task 3, imported in Task 4 — matches exactly
- `canAnalyze()` return type is `{ allowed: boolean, isPremium: boolean }` in Task 3; destructured as `{ allowed, isPremium }` in `useAnalysis.ts` — compatible (existing usage unchanged)
- `getHistory()` returns `AnalysisResult[]` — `.length` access in Task 5 is valid
