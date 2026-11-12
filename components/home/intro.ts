import { useEffect, useState, useSyncExternalStore } from "react"

/**
 * What the homepage's two intros share: the day scene (the seaplane) and the
 * night scene (the Giant) open the same way and give way to the same copy.
 */

/**
 * If the script only takes over after this long (ms since navigation), the
 * visitor is on a slow connection: skip the intro and settle straight into
 * the final scene. Keep it below the CSS fallback delay in globals.css.
 */
export const LATE_MOUNT_MS = 2200
/** Longest an intro waits for its painting before starting anyway. */
export const WORLD_WAIT_MS = 1500

let introPlayed = false

/**
 * The intro plays on a full page load, but not when coming back to the
 * homepage from another page in the same visit.
 */
export function useHomeIntro() {
  const [playIntro] = useState(() =>
    typeof window === "undefined" ? true : !introPlayed
  )

  useEffect(() => {
    introPlayed = true
  }, [])

  return playIntro
}

export type HomeTheme = "light" | "dark"

/** The theme the page loaded in: the one whose intro plays. */
let loadedTheme: HomeTheme | null = null

/** The theme on screen right now. Only in the browser. */
export function readTheme(): HomeTheme {
  const theme = document.documentElement.classList.contains("dark")
    ? "dark"
    : "light"
  loadedTheme ??= theme
  return theme
}

function watchTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  return () => observer.disconnect()
}

/**
 * The theme on screen, or null while it can't be known yet (on the server,
 * and for the first pass in the browser). `intro` is whether this theme's
 * scene may play its intro: only the theme the page loaded in does, so
 * switching themes later lands on a settled scene.
 */
export function useHomeTheme() {
  const theme = useSyncExternalStore(watchTheme, readTheme, () => null)
  return { theme, intro: theme === null || theme === loadedTheme }
}

/**
 * Whether to play the intro at all: not for reduced motion, a slow load
 * (the copy may already be showing on plain paper) or data saving.
 */
export function shouldAnimateIntro(playIntro: boolean) {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection
  const arrivedLate =
    performance.now() > LATE_MOUNT_MS || Boolean(connection?.saveData)
  return {
    reducedMotion,
    arrivedLate,
    animate: playIntro && !reducedMotion && !arrivedLate,
  }
}

/**
 * Takes the page over from the no-JS fallback in globals.css. Normally
 * that's immediate; after a late arrival the fallback may be showing, so the
 * copy's entrance is left to finish underneath it first, then the fallback
 * paper (`overlay`, if the scene has one) fades away. Returns the cleanup.
 */
export function takeOverHome(overlay: HTMLElement | null, late: boolean) {
  const root = document.documentElement
  // The scene is one screen: no rubber-band bounce pulling the copy off its
  // paper. Only on the homepage; other pages keep the native feel.
  const previousOverscroll = root.style.overscrollBehavior
  root.style.overscrollBehavior = "none"
  document.body.style.overscrollBehavior = "none"
  let handover = 0
  if (late) {
    handover = window.setTimeout(() => {
      const shown = overlay ? getComputedStyle(overlay).opacity : "0"
      if (overlay) overlay.style.opacity = shown
      root.dataset.homeReady = ""
      requestAnimationFrame(() => {
        if (!overlay) return
        overlay.style.transition = "opacity 0.9s ease"
        overlay.style.opacity = "0"
      })
    }, 1700)
  } else {
    root.dataset.homeReady = ""
  }
  return () => {
    root.style.overscrollBehavior = previousOverscroll
    document.body.style.overscrollBehavior = ""
    window.clearTimeout(handover)
  }
}
