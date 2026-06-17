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
