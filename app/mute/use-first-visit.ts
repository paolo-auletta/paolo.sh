"use client"

import { useEffect, useState } from "react"

const visited = new Set<string>()

/**
 * True on a page's first visit in this session, until its entrance has had
 * time to play (2.2s). Coming back to the page shows it straight away.
 */
export function useFirstVisit(pageKey: string) {
  const [first, setFirst] = useState(() => !visited.has(pageKey))

  useEffect(() => {
    visited.add(pageKey)
    if (!first) return
    const timeoutId = window.setTimeout(() => setFirst(false), 2200)
    return () => window.clearTimeout(timeoutId)
  }, [pageKey, first])

  return first
}
