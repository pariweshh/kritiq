import type {
  AnalysisHistory,
  AnalysisResult,
  UserState,
} from "@/constants/types"
import config from "@/constants/config"
import {
  isNewBest,
  updatePersonalBests,
  type NewBestFlags,
} from "@/lib/progress/personalBests"
import { updateStreak } from "@/lib/progress/streaks"
import {
  emptyRecords,
  PROGRESS_VERSION,
  type ProgressRecords,
} from "@/lib/progress/types"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Keys are namespaced `kritiq_*`. Older builds wrote `formai_*`; reads migrate
// a legacy value forward once (then drop it) so existing on-device history and
// state survive the rename. `kritiq_records` is new (no legacy form).
const KEYS = {
  HISTORY: "kritiq_history",
  USER_STATE: "kritiq_user_state",
  RECORDS: "kritiq_records",
} as const

const LEGACY_KEYS = {
  HISTORY: "formai_history",
  USER_STATE: "formai_user_state",
} as const

const MAX_HISTORY_ITEMS = 50

/**
 * Read a key, migrating a legacy value forward on first access. Best-effort: a
 * failed legacy cleanup never blocks the read.
 */
async function readMigrating(
  key: string,
  legacyKey: string,
): Promise<string | null> {
  const current = await AsyncStorage.getItem(key)
  if (current !== null) return current

  const legacy = await AsyncStorage.getItem(legacyKey)
  if (legacy === null) return null

  await AsyncStorage.setItem(key, legacy)
  try {
    await AsyncStorage.removeItem(legacyKey)
  } catch {
    // A leftover legacy key is harmless.
  }
  return legacy
}

// ========================
// Analysis History
// ========================

export async function getHistory(): Promise<AnalysisResult[]> {
  try {
    const raw = await readMigrating(KEYS.HISTORY, LEGACY_KEYS.HISTORY)
    if (!raw) return []
    const data: AnalysisHistory = JSON.parse(raw)
    return data.analyses.sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}

export interface SaveAnalysisResult {
  /** Which records this analysis beat — drives the result-screen PB badge. */
  newBest: NewBestFlags
}

export async function saveAnalysis(
  result: AnalysisResult,
): Promise<SaveAnalysisResult> {
  // 1. Recent history — a capped, most-recent-first list.
  const existing = await getHistory()
  const updated = [result, ...existing].slice(0, MAX_HISTORY_ITEMS)
  await AsyncStorage.setItem(
    KEYS.HISTORY,
    JSON.stringify({ analyses: updated }),
  )

  // 2. Durable progress records — independent of the history cap so a personal
  //    best or longest streak is never lost when old analyses fall off the list.
  const records = await getRecords()
  const newBest = isNewBest(records.personalBests, result)
  const nextRecords: ProgressRecords = {
    version: PROGRESS_VERSION,
    personalBests: updatePersonalBests(records.personalBests, result),
    streak: updateStreak(records.streak, result.timestamp),
  }
  await saveRecords(nextRecords)

  return { newBest }
}

export async function clearHistory(): Promise<void> {
  // A full reset wipes derived progress too, so the UI never shows PBs or a
  // streak for analyses the user just cleared.
  await AsyncStorage.multiRemove([KEYS.HISTORY, KEYS.RECORDS])
}

// ========================
// Progress Records (Personal Bests + Streaks)
// ========================

export async function getRecords(): Promise<ProgressRecords> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.RECORDS)
    if (!raw) return emptyRecords()
    const parsed = JSON.parse(raw) as ProgressRecords
    // Forward-safe: an unrecognized version starts clean rather than crashing.
    if (parsed.version !== PROGRESS_VERSION) return emptyRecords()
    return parsed
  } catch {
    return emptyRecords()
  }
}

async function saveRecords(records: ProgressRecords): Promise<void> {
  await AsyncStorage.setItem(KEYS.RECORDS, JSON.stringify(records))
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
    const raw = await readMigrating(KEYS.USER_STATE, LEGACY_KEYS.USER_STATE)
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
  trialStarted: boolean
}> {
  const state = await getUserState()
  const trialStarted = state.firstAnalysisDate !== undefined

  if (state.isPremium) {
    return { allowed: true, isPremium: true, trialStarted }
  }

  if (!trialStarted) {
    return { allowed: true, isPremium: false, trialStarted: false }
  }

  const trialMs =
    config.freeTier.trialDurationDays * 24 * 60 * 60 * 1000
  const trialActive = Date.now() - state.firstAnalysisDate! < trialMs

  return { allowed: trialActive, isPremium: false, trialStarted }
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
