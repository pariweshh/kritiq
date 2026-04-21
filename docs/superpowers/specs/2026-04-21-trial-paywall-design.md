# Trial Free Tier + Personalized Paywall Design

## Goal

Replace the weekly-limit free tier (3 analyses/week) with a 3-day unlimited trial that starts on the user's first completed analysis. After the trial, the paywall is a hard gate with zero free analyses. The paywall replaces its generic subtitle with a personalized message referencing how many analyses the user completed during their trial.

## Architecture

The free tier logic lives entirely in `services/storage.ts`. The paywall reads trial stats from storage on mount — no props or route params needed. `hooks/useAnalysis.ts` calls a renamed function to record the trial start date on first successful analysis.

## Tech Stack

React Native, Expo Router, AsyncStorage via `@react-native-async-storage/async-storage`, TypeScript

---

## Files Changed

| File | Change |
|---|---|
| `constants/types.ts` | Remove `weeklyAnalysesUsed`, `weekStartDate` from `UserState`; add `firstAnalysisDate?: number` |
| `constants/config.ts` | Replace `weeklyAnalysisLimit: 3` with `trialDurationDays: 3` |
| `services/storage.ts` | Rewrite `canAnalyze()`, rename `incrementAnalysisCount()` → `recordTrialStart()`, update `DEFAULT_USER_STATE` |
| `hooks/useAnalysis.ts` | Call `recordTrialStart()` instead of `incrementAnalysisCount()` |
| `app/paywall.tsx` | Load trial stats on mount, replace generic subtitle with dynamic personalized message |

---

## Detailed Behaviour

### Trial Logic (`services/storage.ts`)

**`canAnalyze()`** returns `{ allowed: boolean, isPremium: boolean }`.

Decision order:
1. `isPremium === true` → `{ allowed: true, isPremium: true }`
2. `firstAnalysisDate === undefined` → `{ allowed: true, isPremium: false }` (trial not yet started)
3. `Date.now() - firstAnalysisDate < trialDurationDays * 24 * 60 * 60 * 1000` → `{ allowed: true, isPremium: false }`
4. Otherwise → `{ allowed: false, isPremium: false }`

**`recordTrialStart()`** (renamed from `incrementAnalysisCount`):
- Reads `UserState`
- If `firstAnalysisDate` is already set, returns immediately (idempotent)
- Otherwise sets `firstAnalysisDate = Date.now()` and saves

Called from `useAnalysis.ts` after every successful analysis (idempotent, so safe to call repeatedly).

**`DEFAULT_USER_STATE`**:
```ts
{
  isPremium: false,
  onboardingComplete: false,
  // firstAnalysisDate intentionally absent — trial starts on first result
}
```

### UserState Type (`constants/types.ts`)

```ts
export interface UserState {
  isPremium: boolean
  firstAnalysisDate?: number // Unix ms — set on first completed analysis
  onboardingComplete: boolean
}
```

### Config (`constants/config.ts`)

```ts
freeTier: {
  trialDurationDays: 3,
  maxHistoryItems: 10,
}
```

### Personalized Paywall (`app/paywall.tsx`)

On mount, load:
- `analysisCount = (await getHistory()).length`
- `userState = await getUserState()`

Dynamic subtitle copy (replaces the current static subtitle string):

| `analysisCount` | Message |
|---|---|
| 0–3 | `"You've started building better form. Keep going."` |
| 4–9 | `"You've put in {N} analyses — you're building real momentum."` |
| 10+ | `"{N} analyses in 3 days. That kind of consistency is what separates good from great."` |

The rest of the paywall (diamond icon, FORMAI PRO heading, features list, plan cards, purchase button, footer) is unchanged.

---

## Error Handling

- If `getHistory()` or `getUserState()` throws on paywall mount, fall back to the static subtitle — no crash.
- `recordTrialStart()` is idempotent and safe to call on every successful analysis.
- Existing users upgrading from the weekly model will have no `firstAnalysisDate` set, so they get a fresh trial on their next analysis. `weeklyAnalysesUsed` and `weekStartDate` may exist in their stored JSON — these are ignored (extra keys in AsyncStorage JSON are harmless).

---

## Out of Scope

- RevenueCat wiring (existing TODO, not touched)
- Showing days remaining in the trial anywhere in the app
- Any migration script for existing users
