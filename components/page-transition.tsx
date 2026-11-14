"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useLayoutEffect, useRef } from "react"

import { dropCover, pickUpCover } from "@/components/motion/carried-cover"
import {
  animateFill,
  ARRIVE_MS,
  LEAVE_MS,
  prefersReducedMotion,
} from "@/components/paper-fill"

/**
 * The homepage's paper is the bridge to every other page. Leaving, the paper
 * under the copy grows out until it is the whole page background, and only
 * then does the next page come in on it. Coming back, the homepage starts
 * fully papered and the paper draws back in to the copy, letting the scene
 * through again.
 *
 * Leaving by the album or the film in the homepage copy, with its preview
 * card open, the card is carried along (components/motion/carried-cover.ts)
 * and laid down in its place on the next page.
 *
 * The paper's fill itself lives in components/paper-fill.ts; this file owns
 * the link clicks that start it.
 */

/** ms: another page's content fading out before going home. */
const PAGE_OUT_MS = 160

/** Drops the leaving state: the page is shown again as it is. */
function clearLeaving() {
  const root = document.documentElement
  delete root.dataset.homeLeaving
  delete root.dataset.pageLeaving
}

/** Where a click is going, if it's a plain in-site navigation. */
function internalTarget(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null
  }
  const anchor =
    event.target instanceof Element ? event.target.closest("a[href]") : null
  if (!(anchor instanceof HTMLAnchorElement)) return null
  // A link that plays its own way out (the 404's fall) navigates itself.
  if (anchor.hasAttribute("data-own-transition")) return null
  if (anchor.target && anchor.target !== "_self") return null
  if (anchor.hasAttribute("download")) return null
  const url = new URL(anchor.href, location.href)
  if (url.origin !== location.origin) return null
  if (url.pathname === location.pathname) return null
  return url
}

/**
 * Mounted once in the root layout: catches clicks between the homepage and
 * the rest of the site and plays the paper transition around them.
 */
export function PageTransitions() {
  const router = useRouter()
  const pathname = usePathname()
  const busy = useRef(false)

  // The new page is in: drop the leaving state before it paints.
  useLayoutEffect(() => {
    clearLeaving()
    busy.current = false
  }, [pathname])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const url = internalTarget(event)
      if (!url || prefersReducedMotion()) return
      const fromHome = location.pathname === "/"
      const toHome = url.pathname === "/"
      if (fromHome === toHome) return

      // Hold the click back from Next's own Link handler: we navigate once
      // the paper has done its part.
      event.preventDefault()
      event.stopPropagation()
      if (busy.current) return
      busy.current = true

      const root = document.documentElement
      const href = url.pathname + url.search + url.hash
      if (fromHome) {
        root.dataset.homeLeaving = ""
        animateFill(1, LEAVE_MS)
        pickUpCover(url.pathname)
      } else {
        root.dataset.pageLeaving = ""
      }
      window.setTimeout(
        () => router.push(href),
        fromHome ? LEAVE_MS : PAGE_OUT_MS
      )
      // If the navigation never lands, give the page back.
      window.setTimeout(() => {
        if (!busy.current) return
        busy.current = false
        clearLeaving()
        dropCover()
        if (fromHome) animateFill(0, ARRIVE_MS)
      }, 4000)
    }

    document.addEventListener("click", onClick, { capture: true })
    return () =>
      document.removeEventListener("click", onClick, { capture: true })
  }, [router])

  return null
}
