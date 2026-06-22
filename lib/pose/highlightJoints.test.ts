import { describe, expect, it } from "vitest"
import { metricHighlightJoints } from "@/lib/pose/highlightJoints"

describe("metricHighlightJoints", () => {
  it("maps knee_tracking to both knees", () => {
    expect(metricHighlightJoints("knee_tracking")).toEqual([
      "left_knee",
      "right_knee",
    ])
  })

  it("maps depth to hips and knees", () => {
    const joints = metricHighlightJoints("depth")
    expect(joints).toContain("left_knee")
    expect(joints).toContain("left_hip")
  })

  it("returns [] for non-spatial metrics like tempo", () => {
    expect(metricHighlightJoints("tempo")).toEqual([])
  })

  it("returns [] for unknown ids", () => {
    expect(metricHighlightJoints("nope")).toEqual([])
  })
})
