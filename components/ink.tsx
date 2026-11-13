"use client"

import { useState } from "react"

/**
 * Words that ink in after the copy has arrived: held in the copy's grey
 * through the entrance, then each letter, left to right, goes back to its
 * own colour (the ink-in keyframes in globals.css). Once the last letter
 * lands, the word is plain text again.
 *
 * - "hold": grey, waiting for the entrance to settle.
 * - "play": inking in, starting `delay` ms from now.
 * - "settled": plain text, as if it had always been there.
 */
export type InkMode = "hold" | "play" | "settled"

type InkTiming = { step?: number; duration?: number }

const letters = (text: string) => Array.from(text.replace(/\s/g, "")).length

/** How long a word takes to ink in, first letter to last, in ms. */
export function inkLength(
  text: string,
  { step = 45, duration = 420 }: InkTiming = {}
) {
  return letters(text) * step + duration
}

export function Ink({
  children: text,
  mode,
  delay = 0,
  step = 45,
  duration = 420,
}: InkTiming & { children: string; mode: InkMode; delay?: number }) {
  const [done, setDone] = useState(false)
  if (mode === "settled" || done) return text

  const last = letters(text) - 1
  let letter = 0
  return Array.from(text).map((char, index) => {
    if (/\s/.test(char)) return char
    const position = letter++
    return (
      <span
        key={index}
        data-ink=""
        style={
          mode === "hold"
            ? { color: "var(--muted-foreground)" }
            : {
                animation: `ink-in ${duration}ms ease-out ${delay + position * step}ms both`,
              }
        }
        onAnimationEnd={position === last ? () => setDone(true) : undefined}
      >
        {char}
      </span>
    )
  })
}
