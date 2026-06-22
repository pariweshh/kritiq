/**
 * PoseSkeleton
 * Draws a COCO-17 stick figure from a stored key pose (normalized keypoints —
 * numbers only, no footage) on a neutral background, fitting the figure into the
 * frame aspect-correctly. Joints in `highlight` are emphasized in the alert
 * color to point at the weakest scored area. SVG via react-native-svg.
 */

import { colors } from "@/constants/theme"
import type { KeypointName, Pose } from "@/lib/pose/types"
import { StyleSheet, View } from "react-native"
import Svg, { Circle, Line } from "react-native-svg"

const VIEW = 100
const PAD = 12
const MIN_VIS = 0.2

const EDGES: readonly [KeypointName, KeypointName][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_hip", "right_hip"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
  ["nose", "left_shoulder"],
  ["nose", "right_shoulder"],
]

interface PoseSkeletonProps {
  pose: Pose
  highlight?: readonly KeypointName[]
  height?: number
}

export default function PoseSkeleton({
  pose,
  highlight = [],
  height = 240,
}: PoseSkeletonProps) {
  // x is normalized to width, y to height; multiply x by the frame aspect ratio
  // so distances are comparable, then fit the figure's bounding box into the
  // padded square viewBox, preserving proportions.
  const pts = pose.keypoints.map((k) => ({
    name: k.name,
    ax: k.x * pose.aspectRatio,
    ay: k.y,
    score: k.score,
  }))
  const used = pts.filter((p) => p.score >= MIN_VIS)
  const box = used.length ? used : pts
  const minAx = Math.min(...box.map((p) => p.ax))
  const maxAx = Math.max(...box.map((p) => p.ax))
  const minAy = Math.min(...box.map((p) => p.ay))
  const maxAy = Math.max(...box.map((p) => p.ay))
  const bw = maxAx - minAx || 1
  const bh = maxAy - minAy || 1
  const inner = VIEW - PAD * 2
  const scale = Math.min(inner / bw, inner / bh)
  const offX = PAD + (inner - bw * scale) / 2
  const offY = PAD + (inner - bh * scale) / 2

  const project = (p: { ax: number; ay: number }) => ({
    x: offX + (p.ax - minAx) * scale,
    y: offY + (p.ay - minAy) * scale,
  })
  const at = (name: KeypointName) => {
    const found = pts.find((p) => p.name === name)
    return found ? { ...project(found), score: found.score } : null
  }
  const highlighted = new Set(highlight)

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${VIEW} ${VIEW}`}>
        {EDGES.map(([a, b], i) => {
          const pa = at(a)
          const pb = at(b)
          if (!pa || !pb || pa.score < MIN_VIS || pb.score < MIN_VIS) {
            return null
          }
          return (
            <Line
              key={`e${i}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={colors.text.tertiary}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          )
        })}
        {pts.map((p, i) => {
          if (p.score < MIN_VIS) return null
          const pos = project(p)
          const hot = highlighted.has(p.name)
          return (
            <Circle
              key={`j${i}`}
              cx={pos.x}
              cy={pos.y}
              r={hot ? 3.4 : 2}
              fill={hot ? colors.error : colors.accent.primary}
              opacity={hot ? 1 : 0.5 + 0.5 * p.score}
            />
          )
        })}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
})
