/**
 * How far the homepage's paper has spread past its resting shape: the
 * bridge to every other page. Leaving, it grows out until it is the whole
 * page background; coming back, the homepage starts fully papered and the
 * paper draws back in to the copy.
 *
 * This module owns the one fill there is. The scenes read it every frame;
 * the page transitions (components/page-transition.tsx) and the homepage
 * start it moving.
 */

/** ms: the paper spreading out to the edges before the next page. */
export const LEAVE_MS = 480
/** ms: the paper drawing back in to the copy on the way home. */
export const ARRIVE_MS = 820

type Fill = {
  from: number
  to: number
  /** null until a scene first reads it: the clock starts on the first frame. */
  start: number | null
  duration: number
}

let fill: Fill = { from: 0, to: 0, start: 0, duration: 0 }

/** Gentle at both ends, so the paper is still visibly moving near the end. */
export const easeInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2

/** How much of the screen the paper covers beyond its resting shape, 0–1. */
export function paperFillAt(now: number) {
  if (fill.start === null) fill.start = now
  if (fill.duration <= 0) return fill.to
  const t = Math.min(1, Math.max(0, (now - fill.start) / fill.duration))
  return fill.from + (fill.to - fill.from) * easeInOut(t)
}

/** Moves the fill to `to` over `duration` ms, from wherever it is now. */
export function animateFill(to: number, duration: number) {
  const now = performance.now()
  fill = { from: paperFillAt(now), to, start: now, duration }
}

export const prefersReducedMotion = () =>
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
