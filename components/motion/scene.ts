/**
 * A small timeline for page entrances. A Scene owns the animations an
 * entrance starts, knows when they have all settled, and then (or when the
 * page unmounts first) drops them and undoes any style it set, leaving the
 * DOM exactly as React rendered it.
 */

export type Effect = (root: HTMLElement) => () => void

type AnimateOptions = {
  duration: number
  delay?: number
  easing?: string
}

export class Scene {
  private animations: Animation[] = []
  private cleanups: (() => void)[] = []
  private pending = 1
  private done = false

  animate(element: Element, keyframes: Keyframe[], options: AnimateOptions) {
    const animation = element.animate(keyframes, {
      duration: options.duration,
      delay: options.delay ?? 0,
      easing: options.easing ?? "linear",
      fill: "both",
    })
    this.animations.push(animation)
    this.pending += 1
    animation.finished.then(
      () => this.release(),
      () => this.release()
    )
    return animation
  }

  /** Runs once, when the scene settles or is torn down. */
  onCleanup(cleanup: () => void) {
    this.cleanups.push(cleanup)
  }

  /** Call once the entrance has scheduled everything; returns the teardown. */
  go() {
    this.release()
    return () => this.finish()
  }

  private release() {
    this.pending -= 1
    if (this.pending > 0) return
    queueMicrotask(() => {
      if (this.pending === 0) this.finish()
    })
  }

  private finish() {
    if (this.done) return
    this.done = true
    for (const cleanup of this.cleanups.splice(0)) cleanup()
    // Every animation ends on the element's own style, so dropping them
    // changes nothing on screen.
    for (const animation of this.animations.splice(0)) animation.cancel()
  }
}

/** A stable pseudo-random number in [0, 1) for a seed. */
export const random = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** A style property set for the length of a scene, then put back. */
export function setStyle(
  element: HTMLElement | SVGElement,
  styles: Partial<Record<string, string>>
) {
  const previous: Record<string, string> = {}
  for (const [name, value] of Object.entries(styles)) {
    previous[name] = element.style.getPropertyValue(name)
    element.style.setProperty(name, value ?? "")
  }
  return () => {
    for (const [name, value] of Object.entries(previous)) {
      if (value) element.style.setProperty(name, value)
      else element.style.removeProperty(name)
    }
  }
}
