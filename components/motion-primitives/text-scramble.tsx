"use client"

import React, { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

const DEFAULT_CHARACTER_SET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω"

export type TextScrambleProps = {
  children: string
  as?: React.ElementType
  duration?: number
  speed?: number
  characterSet?: string
  className?: string
  trigger?: boolean
  disabled?: boolean
  onScrambleComplete?: () => void
}

function randomCharacter(characterSet: string) {
  const index = Math.floor(Math.random() * characterSet.length)
  return characterSet[index] ?? ""
}

function TextScrambleComponent({
  children,
  as: Component = "p",
  duration = 0.8,
  speed = 0.04,
  characterSet = DEFAULT_CHARACTER_SET,
  className,
  trigger,
  disabled = false,
  onScrambleComplete,
}: TextScrambleProps) {
  const prefersReducedMotion = useReducedMotion()
  const [displayText, setDisplayText] = useState(children)
  const intervalRef = useRef<number | null>(null)
  const hasMountedRef = useRef(false)
  const previousTextRef = useRef(children)
  const previousTriggerRef = useRef(trigger)

  useEffect(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (prefersReducedMotion || disabled) {
      previousTextRef.current = children
      previousTriggerRef.current = trigger
      const frameId = window.requestAnimationFrame(() => {
        setDisplayText(children)
      })

      return () => window.cancelAnimationFrame(frameId)
    }

    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      previousTextRef.current = children
      previousTriggerRef.current = trigger
      return
    }

    const sourceText = previousTextRef.current
    const textChanged = sourceText !== children
    const triggerChanged = previousTriggerRef.current !== trigger

    previousTextRef.current = children
    previousTriggerRef.current = trigger

    if (!textChanged && !triggerChanged) return

    const sourceCharacters = Array.from(sourceText)
    const targetCharacters = Array.from(children)
    const maxLength = Math.max(sourceCharacters.length, targetCharacters.length)
    const totalSteps = Math.max(1, Math.ceil(duration / speed))
    let step = 0

    const update = () => {
      step += 1

      if (step >= totalSteps) {
        setDisplayText(children)
        if (intervalRef.current !== null) {
          window.clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        onScrambleComplete?.()
        return
      }

      const progress = step / totalSteps
      const revealCount = Math.floor(progress * maxLength)
      const shrinkingLength =
        sourceCharacters.length > targetCharacters.length
          ? targetCharacters.length +
            Math.ceil(
              (sourceCharacters.length - targetCharacters.length) * (1 - progress)
            )
          : maxLength

      const scrambled = Array.from(
        { length: shrinkingLength },
        (_, index) => {
          const nextCharacter = targetCharacters[index] ?? ""
          const sourceCharacter = sourceCharacters[index] ?? ""

          if (!nextCharacter) return sourceCharacter
          if (index < revealCount && nextCharacter) return nextCharacter
          if (/\s/.test(nextCharacter)) return nextCharacter
          if (/\s/.test(sourceCharacter)) return sourceCharacter

          return randomCharacter(characterSet)
        }
      ).join("")

      setDisplayText(scrambled)
    }

    update()
    intervalRef.current = window.setInterval(update, speed * 1000)

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [
    characterSet,
    children,
    duration,
    disabled,
    onScrambleComplete,
    prefersReducedMotion,
    speed,
    trigger,
  ])

  return (
    <Component aria-label={children} className={cn("inline-block", className)}>
      {displayText}
    </Component>
  )
}

export const TextScramble = React.memo(TextScrambleComponent)
