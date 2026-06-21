/**
 * Entitlement decision — the one pure rule that turns a RevenueCat CustomerInfo
 * into "is this user Pro right now".
 *
 * Kept pure + framework-free (the `lib/**` vitest include) so the SDK glue in
 * `services/purchases` stays thin and this logic is testable without loading the
 * native `react-native-purchases` module under Node. The input is typed
 * structurally rather than as the SDK's `CustomerInfo`, which satisfies it.
 */

/** The slice of a RevenueCat CustomerInfo this rule actually reads. */
export interface CustomerInfoLike {
  entitlements: {
    /** Entitlement ids the user currently has access to, keyed by id. */
    active: Record<string, unknown>
  }
}

/**
 * Whether the given customer info grants an active `entitlementId` (e.g. "pro").
 * Null/undefined info (not yet fetched, or fetch failed) reads as not active.
 */
export function isProActive(
  info: CustomerInfoLike | null | undefined,
  entitlementId: string,
): boolean {
  if (!info) return false
  return info.entitlements.active[entitlementId] !== undefined
}
