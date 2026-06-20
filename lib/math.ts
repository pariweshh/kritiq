/** Tiny shared numeric helpers for the pure logic layer. */

export function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1)
}
