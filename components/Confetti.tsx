/**
 * Confetti
 * Lightweight one-shot celebration burst built on RN Animated — no native
 * dependency. Plays once on mount; render it conditionally (e.g. on a new
 * personal best). Non-interactive: it never blocks touches underneath.
 */

import { colors } from "@/constants/theme"
import { useEffect, useRef } from "react"
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native"

const PIECE_COUNT = 16
const FALL_DISTANCE = 420
const DURATION = 1500
const { width } = Dimensions.get("window")

const PIECE_COLORS = [
  colors.accent.primary,
  colors.score.good,
  colors.score.fair,
  colors.accent.secondary,
]

interface Piece {
  left: number
  color: string
  drift: number
  delay: number
  spin: number
  size: number
}

function makePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    left: Math.random() * width,
    color: PIECE_COLORS[i % PIECE_COLORS.length],
    drift: (Math.random() - 0.5) * 140,
    delay: Math.random() * 280,
    spin: (Math.random() - 0.5) * 720,
    size: 6 + Math.random() * 6,
  }))
}

export default function Confetti() {
  const pieces = useRef(makePieces()).current
  const progress = useRef(
    pieces.map(() => new Animated.Value(0)),
  ).current

  useEffect(() => {
    const animations = progress.map((value, i) =>
      Animated.timing(value, {
        toValue: 1,
        duration: DURATION,
        delay: pieces[i].delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    )
    Animated.parallel(animations).start()
  }, [pieces, progress])

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, i) => {
        const translateY = progress[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-40, FALL_DISTANCE],
        })
        const translateX = progress[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.drift],
        })
        const rotate = progress[i].interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${piece.spin}deg`],
        })
        const opacity = progress[i].interpolate({
          inputRange: [0, 0.1, 0.75, 1],
          outputRange: [0, 1, 1, 0],
        })
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              top: 0,
              left: piece.left,
              width: piece.size,
              height: piece.size,
              borderRadius: 1,
              backgroundColor: piece.color,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        )
      })}
    </View>
  )
}
