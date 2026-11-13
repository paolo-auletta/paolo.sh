"use client"

import { useEffect, useState } from "react"

const animatedPageKeys = new Set<string>()

export function usePageEntranceAnimation(
  pageKey: string,
  resetLocalAnimationAfterMs = 2200
) {
  const [shouldAnimate, setShouldAnimate] = useState(() => {
    if (typeof window === "undefined") {
      return true
    }

    if (animatedPageKeys.has(pageKey)) {
      return false
    }

    return true
  })

  useEffect(() => {
    animatedPageKeys.add(pageKey)

    if (!shouldAnimate) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShouldAnimate(false)
    }, resetLocalAnimationAfterMs)

    return () => window.clearTimeout(timeoutId)
  }, [pageKey, resetLocalAnimationAfterMs, shouldAnimate])

  return shouldAnimate
}
