"use client"

import { usePathname } from "next/navigation"
import { useLayoutEffect } from "react"

/**
 * Where the visitor has just been, so a page can tell how it was entered:
 * from the homepage, from a sibling page, or as the first page of a visit.
 *
 * <NavigationHistory /> (mounted once, in the root layout) records each page
 * after it commits. While the next page renders, the record still holds the
 * page it is replacing. So `previousPathname()`, read during render (in a
 * useState initializer, say), is the page the visitor came from, or null
 * on a fresh load. The server renders as for a fresh load, which the first
 * client render matches.
 */

let committed: string | null = null

export function previousPathname() {
  return committed
}

export function NavigationHistory() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    committed = pathname
  }, [pathname])

  return null
}
