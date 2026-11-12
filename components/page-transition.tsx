"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useLayoutEffect, useRef } from "react"

/**
 * The homepage's paper is the bridge to every other page. Leaving, the paper
 * under the copy grows out until it is the whole page background, and only
 * then does the next page come in on it. Coming back, the homepage starts
 * fully papered and the paper draws back in to the copy, letting the scene
 * through again.
 *
 * The scenes read the paper's fill from here every frame; this file owns the
 * timing and the link clicks that start it.
 */

/** ms: the paper spreading out to the edges before the next page. */
export const LEAVE_MS = 480
/** ms: the paper drawing back in to the copy on the way home. */
export const ARRIVE_MS = 820
/** ms: another page's content fading out before going home. */
const PAGE_OUT_MS = 160

type Fill = {
  from: number
  to: number
  /** null until a scene first reads it: the clock starts on the first frame. */
  start: number | null
  duration: number
}

let fill: Fill = { from: 0, to: 0, start: 0, duration: 0 }

/** Gentle at both ends, so the paper is still visibly moving near the end. */
const easeInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2

/** How much of the screen the paper covers beyond its resting shape, 0–1. */
export function paperFillAt(now: number) {
  if (fill.start === null) fill.start = now
  if (fill.duration <= 0) return fill.to
  const t = Math.min(1, Math.max(0, (now - fill.start) / fill.duration))
  return fill.from + (fill.to - fill.from) * easeInOut(t)
}

function animateFill(to: number, duration: number, from?: number) {
  const now = performance.now()
  fill = { from: from ?? paperFillAt(now), to, start: now, duration }
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * Coming back to the homepage: the scene's first frame is all paper, then it
 * draws back. Called while the homepage renders, before the scene draws.
 */
export function arriveHome() {
  if (prefersReducedMotion()) {
    fill = { from: 0, to: 0, start: 0, duration: 0 }
    return
  }
  fill = { from: 1, to: 0, start: null, duration: ARRIVE_MS }
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
    const root = document.documentElement
    delete root.dataset.homeLeaving
    delete root.dataset.pageLeaving
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
        delete root.dataset.homeLeaving
        delete root.dataset.pageLeaving
        if (fromHome) animateFill(0, ARRIVE_MS)
      }, 4000)
    }

    document.addEventListener("click", onClick, { capture: true })
    return () =>
      document.removeEventListener("click", onClick, { capture: true })
  }, [router])

  return null
}
