import { describe, expect, it } from "vitest"

import { isProActive, type CustomerInfoLike } from "@/lib/purchases/entitlement"

const ENTITLEMENT = "pro"

function infoWith(...activeIds: string[]): CustomerInfoLike {
  return {
    entitlements: {
      active: Object.fromEntries(activeIds.map((id) => [id, { id }])),
    },
  }
}

describe("isProActive", () => {
  it("is true when the entitlement is active", () => {
    expect(isProActive(infoWith("pro"), ENTITLEMENT)).toBe(true)
  })

  it("ignores other active entitlements", () => {
    expect(isProActive(infoWith("plus", "lifetime"), ENTITLEMENT)).toBe(false)
  })

  it("is true when the target sits alongside others", () => {
    expect(isProActive(infoWith("plus", "pro"), ENTITLEMENT)).toBe(true)
  })

  it("is false when nothing is active", () => {
    expect(isProActive(infoWith(), ENTITLEMENT)).toBe(false)
  })

  it("is false for null or undefined info", () => {
    expect(isProActive(null, ENTITLEMENT)).toBe(false)
    expect(isProActive(undefined, ENTITLEMENT)).toBe(false)
  })

  it("matches the requested entitlement id exactly", () => {
    const info = infoWith("pro")
    expect(isProActive(info, "pro_monthly")).toBe(false)
    expect(isProActive(info, "pro")).toBe(true)
  })
})
