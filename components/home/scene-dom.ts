/**
 * What the homepage's two scenes read off the page around them: where the
 * copy sits, the colors CSS gives things, the type, the screen's density,
 * and (in development) a frozen moment to look at.
 */

export type Keep = { left: number; top: number; right: number; bottom: number }

/** Union of everything the paper must stay under, in viewport pixels. */
export function readKeepRect(): Keep {
  const rect = {
    left: Infinity,
    top: Infinity,
    right: -Infinity,
    bottom: -Infinity,
  }
  document.querySelectorAll<HTMLElement>("[data-paper-keep]").forEach((el) => {
    const box = el.getBoundingClientRect()
    if (!box.width || !box.height) return
    rect.left = Math.min(rect.left, box.left)
    rect.top = Math.min(rect.top, box.top)
    rect.right = Math.max(rect.right, box.right)
    rect.bottom = Math.max(rect.bottom, box.bottom)
  })
  if (!Number.isFinite(rect.left)) {
    const w = window.innerWidth
    const h = window.innerHeight
    return { left: w * 0.3, top: h * 0.3, right: w * 0.7, bottom: h * 0.6 }
  }
  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
  }
}

/**
 * An element's background as 0–1 RGB, whatever color space CSS uses, or
 * `fallback` when it can't be read.
 */
export function readBackgroundRgb(
  element: Element,
  fallback: [number, number, number]
): [number, number, number] {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) return fallback
  context.fillStyle = getComputedStyle(element).backgroundColor
  context.fillRect(0, 0, 1, 1)
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

/** The site's monospace face, for the scenes' glyphs. */
export function readMonoFont() {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-mono")
      .trim() || "monospace"
  )
}

/** Device pixels per CSS pixel, capped: past 2 nobody sees the difference. */
export function canvasPixelRatio() {
  return Math.min(window.devicePixelRatio || 1, 2)
}

/**
 * In development, `?t=<seconds>` freezes a scene at that moment of its
 * intro. NaN otherwise.
 */
export function readDebugTime() {
  return process.env.NODE_ENV === "development"
    ? Number.parseFloat(
        new URLSearchParams(window.location.search).get("t") ?? ""
      )
    : Number.NaN
}
