import { clamp01, mix, smooth01, smoothstep } from "@/components/home/math"
import { BEACON, EYE_CSS, GIANT } from "@/components/home/night/config"
import type { NightLayout } from "@/components/home/night/layout"

/**
 * The Giant's eyes, between the trees: two round lamps that flicker on,
 * follow the pointer, blink now and then, and blaze up as searchlights. A
 * double click lights them up fixed on that point; after a while without
 * another, they let go, blink, and go back to following the pointer.
 *
 * Their time is the wall clock, in s, handed in by the scene on each call:
 * they keep moving once the intro's clock has come to rest.
 */

/** Lights coming on unsteadily: [until s, brightness] in turn, then full. */
type Stutter = readonly (readonly [until: number, level: number])[]
const stutter = (s: number, steps: Stutter) => {
  for (const [until, level] of steps) if (s < until) return level
  return 1
}
/** The eyes as they first open. */
const EYES_ON: Stutter = [
  [0.07, 0.7],
  [0.16, 0.08],
  [0.3, 1],
  [0.37, 0.25],
]
/** A beam as it is lit. */
const BEAM_ON: Stutter = [
  [0.05, 0.55],
  [0.11, 0.1],
  [0.2, 1],
  [0.25, 0.4],
]

/**
 * His own blinks: one every `every` s, `at` s into each, `length` s long,
 * once the eyes have been open `after` s. Until `stillUntil` into each the
 * lids are sure to be still.
 */
const BLINK = { every: 5.3, at: 5.08, length: 0.22, after: 2, stillUntil: 5 }

/**
 * Letting a beam go, in s after: the lids close by `closed`, stay shut until
 * `shutUntil`, and are open again by `open`. He blinks on his own again
 * after `blinkAgain`, and is still enough to draw less often after `still`.
 */
const LET_GO = {
  closed: 0.12,
  shutUntil: 0.42,
  open: 0.62,
  still: 0.7,
  blinkAgain: 0.8,
}

type Point = { x: number; y: number }

type Beam = {
  aim: Point
  from: Point
  swungAt: number
  litAt: number
  lastAt: number
}

/** The space between his eyes, in px. */
const gapOf = (layout: NightLayout) => Math.max(16, 28 * layout.scale)

export class GiantEyes {
  /** The pointer, while it is over the page. */
  readonly pointer = { x: 0, y: 0, known: false }
  /** Where the eyes have turned, px off center. */
  private readonly gaze = { x: 0, y: 0 }
  private beam: Beam | null = null
  /** When the eyes last shut after letting a beam go. */
  private closedAt = -Infinity

  /** Whether a beam is lit. */
  get beaming() {
    return this.beam !== null
  }

  private aimAt(b: Beam, wall: number) {
    const k = smooth01(clamp01((wall - b.swungAt) / BEACON.swing))
    return { x: mix(b.from.x, b.aim.x, k), y: mix(b.from.y, b.aim.y, k) }
  }

  /** Where the beam points, if one is lit. */
  aim(wall: number) {
    return this.beam ? this.aimAt(this.beam, wall) : null
  }

  /** How bright the beam is: it stutters on like the eyes did, then holds. */
  private beamPower(b: Beam, wall: number) {
    const on = stutter(wall - b.litAt, BEAM_ON)
    const end = wall - b.lastAt - BEACON.hold
    return on * (1 - smoothstep(0, BEACON.fade, end))
  }

  /** After a beam: shut, held shut a moment, open again. */
  private lidAfterBeam(wall: number) {
    const b = wall - this.closedAt
    if (b < LET_GO.closed) return 1 - smoothstep(0, LET_GO.closed, b)
    if (b < LET_GO.shutUntil) return 0
    return smoothstep(LET_GO.shutUntil, LET_GO.open, b)
  }

  /**
   * Turns the eyes toward what they look at, `dt` s on, at scene time `t`
   * with the resting part's top at `photoTop`. Returns whether they are
   * still turning.
   */
  step(
    t: number,
    dt: number,
    photoTop: number,
    layout: NightLayout,
    wall: number
  ) {
    const { gaze } = this
    if (this.beam && wall - this.beam.lastAt > BEACON.hold + BEACON.fade) {
      this.beam = null
      this.closedAt = wall
    }
    const beam = this.beam
    const gap = gapOf(layout)
    const center = {
      x: layout.left + layout.eyes.x * layout.scale,
      y: photoTop + layout.eyes.y * layout.scale,
    }
    // Where they look: the beam's point, the pointer, or just about.
    const looking = beam
      ? this.aimAt(beam, wall)
      : wall - this.closedAt < LET_GO.shutUntil
        ? null
        : this.pointer.known
          ? this.pointer
          : {
              x: center.x + Math.sin((t - GIANT.eyes) * 0.45) * 400,
              y: center.y,
            }
    if (looking) {
      const dx = looking.x - center.x
      const dy = looking.y - center.y
      const reach = Math.hypot(dx, dy) + 240
      const target = {
        x: (dx / reach) * gap * 0.34,
        y: (dy / reach) * gap * 0.22,
      }
      const follow = 1 - Math.exp(-dt * (beam ? 14 : 8))
      gaze.x += (target.x - gaze.x) * follow
      gaze.y += (target.y - gaze.y) * follow
      return Math.hypot(target.x - gaze.x, target.y - gaze.y) > 0.05
    }
    return false
  }

  /**
   * Where the eyes are on screen, how big, how bright a beam they cast and
   * how open their lids are (before his own blinks).
   */
  at(photoTop: number, layout: NightLayout, wall: number) {
    const { gaze, beam } = this
    const gap = gapOf(layout)
    const radius = gap * 0.21
    const x = layout.left + layout.eyes.x * layout.scale + gaze.x
    const y = photoTop + layout.eyes.y * layout.scale + gaze.y
    // Turned to one side, the far eye tucks in a little.
    const half =
      gap * 0.5 * (1 - 0.18 * Math.min(1, Math.abs(gaze.x) / (gap * 0.34)))
    return {
      left: { x: x - half, y },
      right: { x: x + half, y },
      radius,
      power: beam ? this.beamPower(beam, wall) : 0,
      lid: beam ? 1 : this.lidAfterBeam(wall),
    }
  }

  /**
   * A double click at x, y: the beams light up there, or swing there if
   * they already are. Only once he is there (scene time `clock`), eyes open.
   */
  double(x: number, y: number, clock: number, wall: number) {
    if (clock < GIANT.eyes + 0.5) return
    const beam = this.beam
    if (beam) {
      beam.from = this.aimAt(beam, wall)
      beam.aim = { x, y }
      beam.swungAt = wall
      // Already fading out: brought back up without stuttering on again.
      beam.lastAt = wall
      return
    }
    this.beam = {
      aim: { x, y },
      from: { x, y },
      swungAt: -Infinity,
      litAt: wall,
      lastAt: wall,
    }
    this.closedAt = -Infinity
  }

  /**
   * Whether nothing about the eyes will change for a while, `open` s after
   * they opened, given whether they are still turning: the scene can draw
   * less often.
   */
  still(open: number, moving: boolean, wall: number) {
    return (
      open % BLINK.every < BLINK.stillUntil &&
      !moving &&
      !this.beam &&
      wall - this.closedAt > LET_GO.still
    )
  }

  /** Draws the eyes, `open` s after they first opened. */
  draw(
    ctx: CanvasRenderingContext2D,
    open: number,
    photoTop: number,
    layout: NightLayout,
    wall: number
  ) {
    const {
      left: eyeLeft,
      right: eyeRight,
      radius,
      power,
      lid: shut,
    } = this.at(photoTop, layout, wall)
    const flicker = stutter(open, EYES_ON)
    const phase = open % BLINK.every
    // His own blinks, unless he is holding a beam or has just blinked.
    const idle = !this.beam && wall - this.closedAt > LET_GO.blinkAgain
    const lid =
      (idle && open > BLINK.after && phase > BLINK.at
        ? Math.abs(Math.cos(((phase - BLINK.at) / BLINK.length) * Math.PI))
        : 1) * shut
    const halo = 3.2 + 2.4 * power
    // Shut is shut: no sliver of light left between the lids.
    const seen = smoothstep(0.02, 0.2, lid)
    for (const eye of [eyeLeft, eyeRight]) {
      if (seen <= 0) break
      const glow = ctx.createRadialGradient(
        eye.x,
        eye.y,
        radius * 0.6,
        eye.x,
        eye.y,
        radius * halo
      )
      glow.addColorStop(
        0,
        `rgba(${EYE_CSS},${(0.42 + 0.5 * power) * flicker * lid})`
      )
      glow.addColorStop(1, `rgba(${EYE_CSS},0)`)
      ctx.fillStyle = glow
      ctx.fillRect(
        eye.x - radius * halo,
        eye.y - radius * halo,
        radius * halo * 2,
        radius * halo * 2
      )
      ctx.fillStyle = `rgba(${mix(226, 255, power) | 0},${mix(240, 255, power) | 0},255,${flicker * seen})`
      ctx.beginPath()
      ctx.ellipse(eye.x, eye.y, radius, radius * lid, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
