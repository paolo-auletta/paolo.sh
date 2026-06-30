"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

type PagePrefetcherProps = {
  hrefs: string[]
}

function getUniqueHrefs(hrefs: string[]) {
  return Array.from(new Set(hrefs))
}

export function PagePrefetcher({ hrefs }: PagePrefetcherProps) {
  const router = useRouter()
  const hasPrefetched = useRef(false)

  useEffect(() => {
    if (hasPrefetched.current || hrefs.length === 0) {
      return
    }

    hasPrefetched.current = true

    const uniqueHrefs = getUniqueHrefs(hrefs)
    const timeoutIds = new Set<number>()
    let idleCallbackId: number | undefined
    let isCancelled = false

    const prefetchPages = () => {
      uniqueHrefs.forEach((href, index) => {
        const timeoutId = window.setTimeout(() => {
          timeoutIds.delete(timeoutId)

          if (!isCancelled) {
            router.prefetch(href)
          }
        }, index * 120)

        timeoutIds.add(timeoutId)
      })
    }

    const scheduleIdleCallback =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback.bind(window)
        : undefined
    const cancelIdleCallback =
      typeof window.cancelIdleCallback === "function"
        ? window.cancelIdleCallback.bind(window)
        : undefined

    if (scheduleIdleCallback) {
      idleCallbackId = scheduleIdleCallback(prefetchPages, {
        timeout: 2000,
      })
    } else {
      const timeoutId = window.setTimeout(prefetchPages, 500)
      timeoutIds.add(timeoutId)
    }

    return () => {
      isCancelled = true

      if (idleCallbackId !== undefined && cancelIdleCallback) {
        cancelIdleCallback(idleCallbackId)
      }

      timeoutIds.forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
    }
  }, [hrefs, router])

  return null
}
