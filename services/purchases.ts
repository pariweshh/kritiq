/**
 * RevenueCat IAP wrapper — the ONE module that touches `react-native-purchases`.
 *
 * Device-only (like the other `services/*`), so it stays out of the vitest
 * `lib/**` include. The entitlement decision lives in the pure, tested
 * `lib/purchases/entitlement`; everything here is SDK glue: configure, fetch
 * offerings, purchase/restore, and keep the cached `UserState.isPremium` mirror
 * synced to the live entitlement. The paywall consumes a flattened `ProPackage`
 * view-model so it never imports the SDK types itself.
 */

import { Platform } from "react-native"
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases"

import config from "@/constants/config"
import { isProActive } from "@/lib/purchases/entitlement"
import { setPremiumStatus } from "@/services/storage"

const ENTITLEMENT_ID = config.revenueCat.entitlementId

/** A purchasable plan, flattened so the paywall never touches the SDK types. */
export interface ProPackage {
  /** RevenueCat package identifier — pass back to `purchaseProPackageById`. */
  id: string
  label: string
  period: string
  /** Localized, store-formatted price (e.g. "$29.99"). */
  priceString: string
  /** Numeric price for client-side savings math. */
  price: number
}

let configured = false
const packageCache = new Map<string, PurchasesPackage>()

function apiKeyForPlatform(): string {
  return Platform.select({
    ios: config.revenueCat.appleApiKey,
    android: config.revenueCat.googleApiKey,
    default: config.revenueCat.appleApiKey,
  })
}

/** An unfilled config key — keeps a fresh checkout from configuring with junk. */
function isPlaceholderKey(key: string): boolean {
  return key.trim() === "" || key.startsWith("YOUR_")
}

/** True once a real (non-placeholder) key has configured the SDK. */
export function isPurchasesConfigured(): boolean {
  return configured
}

/**
 * Configure RevenueCat once. No-ops (with a dev warning) when the key is still a
 * placeholder, so the app runs before the real keys are set offline.
 */
export function configurePurchases(): void {
  if (configured) return

  const apiKey = apiKeyForPlatform()
  if (isPlaceholderKey(apiKey)) {
    if (__DEV__) {
      console.warn(
        "[purchases] RevenueCat key is a placeholder — IAP disabled. Set constants/config.ts revenueCat keys.",
      )
    }
    return
  }

  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG)
  Purchases.configure({ apiKey })
  configured = true
}

function labelFor(type: PACKAGE_TYPE, fallback: string): string {
  switch (type) {
    case PACKAGE_TYPE.ANNUAL:
      return "Yearly"
    case PACKAGE_TYPE.MONTHLY:
      return "Monthly"
    case PACKAGE_TYPE.WEEKLY:
      return "Weekly"
    case PACKAGE_TYPE.LIFETIME:
      return "Lifetime"
    default:
      return fallback
  }
}

function periodFor(type: PACKAGE_TYPE): string {
  switch (type) {
    case PACKAGE_TYPE.ANNUAL:
      return "/year"
    case PACKAGE_TYPE.MONTHLY:
      return "/month"
    case PACKAGE_TYPE.WEEKLY:
      return "/week"
    default:
      return ""
  }
}

function toProPackage(pkg: PurchasesPackage): ProPackage {
  return {
    id: pkg.identifier,
    label: labelFor(pkg.packageType, pkg.product.title),
    period: periodFor(pkg.packageType),
    priceString: pkg.product.priceString,
    price: pkg.product.price,
  }
}

/**
 * The current offering's packages, flattened. Empty when not configured or the
 * fetch fails — the paywall renders an "unavailable" state in that case.
 */
export async function getProPackages(): Promise<ProPackage[]> {
  if (!configured) return []
  try {
    const offerings = await Purchases.getOfferings()
    const available = offerings.current?.availablePackages ?? []
    packageCache.clear()
    for (const pkg of available) packageCache.set(pkg.identifier, pkg)
    return available.map(toProPackage)
  } catch {
    return []
  }
}

async function syncFromInfo(info: CustomerInfo): Promise<boolean> {
  const isPro = isProActive(info, ENTITLEMENT_ID)
  await setPremiumStatus(isPro)
  return isPro
}

/**
 * Purchase a package by id (from a prior `getProPackages`). Returns whether the
 * "pro" entitlement is now active and persists that to storage. Re-throws SDK
 * errors — callers use `isUserCancelled` to tell a back-out from a real failure.
 */
export async function purchaseProPackageById(id: string): Promise<boolean> {
  const pkg = packageCache.get(id)
  if (!pkg) {
    throw new Error("That plan is no longer available. Please try again.")
  }
  const { customerInfo } = await Purchases.purchasePackage(pkg)
  return syncFromInfo(customerInfo)
}

/** Whether a thrown purchase error is just the user backing out of the sheet. */
export function isUserCancelled(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { userCancelled?: boolean }).userCancelled === true
  )
}

/** Restore prior purchases; returns + persists whether "pro" is now active. */
export async function restorePro(): Promise<boolean> {
  const info = await Purchases.restorePurchases()
  return syncFromInfo(info)
}

/**
 * Pull the latest entitlement and persist it to the cached mirror. Best-effort:
 * a failed refresh leaves the existing mirror untouched.
 */
export async function syncEntitlementToStorage(): Promise<void> {
  if (!configured) return
  try {
    const info = await Purchases.getCustomerInfo()
    await syncFromInfo(info)
  } catch {
    // Best-effort: keep whatever was last cached.
  }
}

/**
 * Subscribe to entitlement changes. RevenueCat fires the listener on configure,
 * every purchase/restore, and on foreground refresh — so a purchase on another
 * device or a lapsed subscription updates the cached mirror with no polling.
 * Returns a cleanup that removes the listener.
 */
export function addProEntitlementListener(): () => void {
  if (!configured) return () => {}
  const listener = (info: CustomerInfo): void => {
    void syncFromInfo(info)
  }
  Purchases.addCustomerInfoUpdateListener(listener)
  return () => Purchases.removeCustomerInfoUpdateListener(listener)
}
