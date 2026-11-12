import type { PlanePose } from "@/components/home/ascii-plane"

/**
 * The homepage intro, on one clock (seconds).
 *
 *   0.0  sky only, high above the meadow
 *   0.3  the plane comes down from high above the top left in one smooth
 *        arc while the camera starts to descend: slow at first, faster and
 *        faster, rolling over once on the way down
 *   1.4  at the bottom of the arc it is level, and banks away into the
 *        distance on the right
 *   3.9  the paper washes in around the text
 *   4.3  the copy fades in
 *   4.9  the camera lands on the meadow
 *   4.9+ the plane comes back from the top right and wanders the sky,
 *        drifting between the open patches around the edges
 */
export const INTRO = {
  planeIn: 0.3,
  diveEnd: 1.4,
  planeOut: 4.1,
  cameraStart: 0.6,
  cameraEnd: 4.9,
  paperStart: 3.9,
  paperEnd: 5.4,
  reveal: 4.3,
  wanderStart: 4.9,
  /** A time well after everything has settled, for skipping the intro. */
  settled: 40,
} as const

type Point2 = { x: number; y: number }

export type Layout = {
  width: number
  height: number
  /** Open sky the plane likes to fly through once the page has settled. */
  skyTargets: Point2[]
  /** Off-screen points it sometimes wanders out to before coming back. */
  excursions: Point2[]
  /** Where the mountain ridge lands once we touch down, as a viewport fraction. */
  ridge: number
  /** Screen pixels per model unit for a plane at depth 0. */
  planeScale: number
}

export function getLayout(width: number, height: number): Layout {
  const compact = width < 640
  const at = (x: number, y: number) => ({ x: width * x, y: height * y })

  return {
    width,
    height,
    skyTargets: compact
      ? // Phones: the band of sky above the copy.
        [at(0.78, 0.07), at(0.22, 0.06), at(0.5, 0.04)]
      : [at(0.86, 0.14), at(0.13, 0.13), at(0.92, 0.42), at(0.08, 0.44)],
    excursions: [at(1.2, 0.18), at(-0.2, 0.22), at(0.55, -0.18)],
    // Phones anchor the meadow to the bottom edge instead (see sky-scene),
    // so the mountain sits behind the copy.
    ridge: compact ? 0 : 0.64,
    planeScale: Math.min(Math.max(width * 0.15, 115), 255),
  }
}

export type FlightFrame = {
  /** Screen position of the model origin. */
  x: number
  y: number
  /** Screen pixels per model unit. */
  scale: number
  pose: PlanePose
  /** Which phase is flying; the renderer picks a glyph size per phase. */
  phase: "intro" | "wander"
}

type Point = { x: number; y: number; z: number }

const TILT = 0.24
// Depth units → pixels, when turning velocity into a heading.
const DEPTH_TO_PX = 0.14
// How strongly depth shrinks the plane: its size goes as 1 / (1 + z · this).
const PERSPECTIVE = 0.7
/**
 * The depth at which the wandering plane's speed is measured: nearer, it
 * crosses the screen faster; farther, slower, as it would.
 */
const CRUISE_DEPTH = 1.6
/** How much nearer or farther than the cruise depth things look at depth z. */
const perspectiveAt = (z: number) =>
  (1 + CRUISE_DEPTH * PERSPECTIVE) / (1 + z * PERSPECTIVE)

const smoothstep = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}

/** Camera descent progress, 0 at the top of the sky and 1 on the meadow. */
export function cameraProgress(t: number) {
  const x = Math.min(
    1,
    Math.max(0, (t - INTRO.cameraStart) / (INTRO.cameraEnd - INTRO.cameraStart))
  )
  // Gentle start, long soft landing.
  return cubicBezier(0.42, 0, 0.12, 1, x)
}

/** CSS-style cubic-bezier easing, solved for x with Newton's method. */
function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number
) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  let s = x
  for (let i = 0; i < 8; i++) {
    const fx = ((ax * s + bx) * s + cx) * s - x
    const dx = (3 * ax * s + 2 * bx) * s + cx
    if (Math.abs(fx) < 1e-5 || dx === 0) break
    s -= fx / dx
  }
  s = Math.min(1, Math.max(0, s))
  return ((ay * s + by) * s + cy) * s
}

/** Paper wash progress, 0 → 1. */
export function paperProgress(t: number) {
  return smoothstep(INTRO.paperStart, INTRO.paperEnd, t)
}

/**
 * The intro flight through 3D: x and y are viewport fractions, z is depth.
 *
 * The way down: roughly an arc, steep where it starts high above the top
 * left and level at its bottom, coming closer as it goes. Hand-placed rather
 * than a formula, so it reads as flown. The first and last points only set
 * the directions it starts and ends in.
 */
const DESCENT: [number, number, number][] = [
  [-0.22, -0.48, 2.2],
  [-0.13, -0.3, 2.1],
  [-0.04, -0.11, 1.92],
  [0.06, 0.1, 1.64],
  [0.17, 0.29, 1.3],
  [0.27, 0.42, 1.1],
  [0.37, 0.46, 1.0],
  [0.454, 0.42, 1.1],
]
const ARC_BOTTOM = DESCENT[DESCENT.length - 2]
/**
 * Out of the arc and away: level, then banking up to the right into the
 * distance. The first point only sets the direction it comes out of the arc
 * in (level, at the arc's speed).
 */
const EXIT: [number, number, number][] = [
  [-0.36, 0.4, 1.3],
  ARC_BOTTOM,
  [0.6, 0.4, 1.3],
  [0.76, 0.27, 2.0],
  [0.94, 0.17, 2.9],
  [1.34, 0.1, 4.2],
]

const progress = (t: number, from: number, to: number) =>
  Math.min(1, Math.max(0, (t - from) / (to - from)))

function introPoint(t: number, layout: Layout): Point {
  const { width, height } = layout
  if (t < INTRO.diveEnd) {
    // Easing into it, then faster and faster all the way down.
    const time = progress(t, INTRO.planeIn, INTRO.diveEnd)
    const [x, y, z] = catmullRom(DESCENT, time * (0.3 + 0.7 * time), true)
    // A little give in the glide: it lifts and settles, and swings a touch
    // nearer and farther, gone again by the bottom of the arc.
    const give = Math.sin(time * Math.PI)
    return {
      x: x * width,
      y: (y + 0.012 * give * Math.sin(time * 9.5 + 0.6)) * height,
      z: z + 0.07 * give * Math.sin(time * 6.2 + 1.1),
    }
  }
  const u = progress(t, INTRO.diveEnd, INTRO.planeOut)
  const [x, y, z] = catmullRom(EXIT, u)
  return { x: x * width, y: y * height, z }
}

/**
 * Catmull-Rom through all but the first point, which only sets the start's
 * direction (and, with `tail`, the last, which only sets the end's).
 */
function catmullRom(
  points: [number, number, number][],
  u: number,
  tail = false
) {
  const segments = points.length - (tail ? 3 : 2)
  const f = Math.min(segments - 1e-6, Math.max(0, u * segments))
  const i = Math.floor(f) + 1
  const t = f - (i - 1)
  const p0 = points[i - 1]
  const p1 = points[i]
  const p2 = points[i + 1]
  const p3 = points[Math.min(points.length - 1, i + 2)]
  const t2 = t * t
  const t3 = t2 * t
  return [0, 1, 2].map(
    (k) =>
      0.5 *
      (2 * p1[k] +
        (-p0[k] + p2[k]) * t +
        (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
        (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)
  ) as [number, number, number]
}

/**
 * The aileron roll, a full turn about its own length, on the way down: done
 * before the bottom of the arc, so it comes out of it level.
 */
function introFlourish(t: number) {
  const span = INTRO.diveEnd - INTRO.planeIn
  return (
    smoothstep(INTRO.planeIn + span * 0.32, INTRO.planeIn + span * 0.9, t) *
    Math.PI *
    2
  )
}

function pointAt(t: number, layout: Layout) {
  return introPoint(t, layout)
}

function headingAt(t: number, layout: Layout) {
  const h = 1 / 120
  const a = pointAt(t - h, layout)
  const b = pointAt(t + h, layout)
  const vx = b.x - a.x
  const vy = b.y - a.y
  const vz = (b.z - a.z) * layout.width * DEPTH_TO_PX
  return {
    yaw: Math.atan2(-vz, vx),
    pitch: Math.atan2(-vy, Math.hypot(vx, vz)),
  }
}

function unwrap(a: number, reference: number) {
  let d = a - reference
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return reference + d
}

export function flightAt(
  t: number,
  layout: Layout,
  wanderer: Wanderer
): FlightFrame | null {
  if (t >= INTRO.wanderStart) return wanderer.frameAt(t)
  if (t < INTRO.planeIn - 0.05 || t > INTRO.planeOut + 0.1) return null

  const p = pointAt(t, layout)
  const frame = {
    x: p.x,
    y: p.y,
    scale: layout.planeScale / (1 + p.z * PERSPECTIVE),
    phase: "intro" as const,
  }

  const now = headingAt(t, layout)
  const later = headingAt(t + 0.12, layout)
  const turnRate = unwrap(later.yaw, now.yaw) - now.yaw
  // Bank into turns, plus the roll on the way out.
  const roll =
    Math.max(-0.9, Math.min(0.9, (turnRate / 0.12) * 0.28)) + introFlourish(t)

  return {
    ...frame,
    pose: {
      yaw: now.yaw,
      pitch: now.pitch * (t < INTRO.diveEnd ? 0.85 : 0.6),
      roll,
      tilt: TILT,
      prop: t * 19,
    },
  }
}

type WanderState = {
  t: number
  x: number
  y: number
  z: number
  yaw: number
  turn: number
  climb: number
  target: { x: number; y: number; z: number }
  targetSince: number
  lastSky: number
  /** Called over by a double click: heading for that point, fast. */
  chase: boolean
  /** Speed against the cruise, easing up for a chase and back after. */
  boost: number
}

const STEP = 1 / 60

/**
 * After the intro the plane wanders: a steady cruise with a limited turn rate,
 * steering toward waypoints picked mostly in the open sky around the edges and
 * now and then off-screen. Seeded, so any moment can be reproduced by
 * replaying the simulation up to it.
 */
export class Wanderer {
  private state: WanderState
  private random: () => number
  private readonly speed: number
  private readonly depthPx: number
  private readonly layout: Layout

  constructor(layout: Layout) {
    this.layout = layout
    this.random = mulberry32(1203)
    this.speed = Math.min(Math.max(layout.width * 0.07, 70), 115)
    this.depthPx = layout.width * DEPTH_TO_PX
    this.state = this.initial()
  }

  private initial(): WanderState {
    const { width, height, skyTargets } = this.layout
    // Come back in from beyond the top right corner, heading for the first
    // patch of sky.
    return {
      t: INTRO.wanderStart,
      x: width * 1.12,
      y: -height * 0.12,
      z: 2.4,
      yaw: Math.PI - 0.35,
      turn: 0,
      climb: 0,
      target: { ...skyTargets[0], z: 1.6 },
      targetSince: INTRO.wanderStart,
      lastSky: 0,
      chase: false,
      boost: 1,
    }
  }

  private pickTarget(s: WanderState) {
    const { width, height, skyTargets, excursions } = this.layout
    const r = this.random
    const roll = r()
    if (roll < 0.14) {
      // Now and then, leave the screen for a while.
      const point = excursions[Math.floor(r() * excursions.length)]
      s.target = { ...point, z: 1.6 + r() * 1.4 }
      s.targetSince = s.t
      return
    }
    // Mostly linger on the side it's already on; sometimes cross over.
    const left = s.x < width / 2
    const sameSide = skyTargets
      .map((point, index) => ({ point, index }))
      .filter(({ point }) => point.x < width / 2 === left)
    const pool =
      roll < 0.36 || sameSide.length === 0
        ? skyTargets.map((point, index) => ({ point, index }))
        : sameSide
    let choice = pool[Math.floor(r() * pool.length)]
    if (choice.index === s.lastSky && pool.length > 1) {
      choice = pool[(pool.indexOf(choice) + 1) % pool.length]
    }
    s.lastSky = choice.index
    s.target = {
      x: choice.point.x + (r() - 0.5) * width * 0.12,
      y: choice.point.y + (r() - 0.5) * height * 0.1,
      // Anywhere from fairly close to well off in the distance.
      z: 0.8 + r() * 2.8,
    }
    s.targetSince = s.t
  }

  /**
   * Called over to a point on the screen: it turns and heads there quickly,
   * then eases back into its wandering. It stays about as far off as it is.
   */
  flyTo(x: number, y: number) {
    const s = this.state
    s.target = { x, y, z: Math.max(0.9, Math.min(2, s.z)) }
    s.targetSince = s.t
    s.chase = true
  }

  private step(s: WanderState) {
    const { depthPx } = this
    const chase = s.chase
    s.boost += ((chase ? 2.6 : 1) - s.boost) * Math.min(1, STEP * 2.5)
    const speed = this.speed * s.boost
    // On screen, the way to the target looks shorter the farther off it is.
    const near = perspectiveAt(s.z)
    const dx = s.target.x - s.x
    const dy = s.target.y - s.y
    const dz = (s.target.z - s.z) * depthPx
    const desired = Math.atan2(-dz, dx / near)
    // Turn toward the target, easing the turn rate so banks roll in and out;
    // called over, it turns harder.
    const maxTurn = chase ? 2.4 : 0.9
    const wanted = (unwrap(desired, s.yaw) - s.yaw) * (chase ? 2.4 : 1.3)
    s.turn +=
      (Math.max(-maxTurn, Math.min(maxTurn, wanted)) - s.turn) *
      Math.min(1, STEP * (chase ? 5 : 1.8))
    s.yaw += s.turn * STEP

    const maxClimb = chase ? 0.9 : 0.4
    const climbWanted =
      Math.max(-maxClimb, Math.min(maxClimb, dy / (chase ? 110 : 180))) * speed
    s.climb += (climbWanted - s.climb) * Math.min(1, STEP * (chase ? 3.5 : 1.1))

    s.x += Math.cos(s.yaw) * speed * STEP * near
    s.z -= (Math.sin(s.yaw) * speed * STEP) / depthPx
    s.z = Math.max(0.6, Math.min(4, s.z))
    s.y += s.climb * STEP * near
    s.t += STEP

    if (chase) {
      // There (on screen; how far off doesn't matter), or it gave up.
      if (Math.hypot(dx, dy) < 80 || s.t - s.targetSince > 6) {
        s.chase = false
        this.pickTarget(s)
      }
      return
    }
    if (Math.hypot(dx, dz) < 70 || s.t - s.targetSince > 9) this.pickTarget(s)
  }

  frameAt(t: number): FlightFrame {
    if (t < this.state.t) {
      this.random = mulberry32(1203)
      this.state = this.initial()
    }
    while (this.state.t + STEP <= t) this.step(this.state)
    const s = this.state

    return {
      x: s.x,
      y: s.y,
      // Smaller than in the intro: it's a background detail now.
      scale: (this.layout.planeScale * 0.72) / (1 + s.z * PERSPECTIVE),
      phase: "wander",
      pose: {
        yaw: s.yaw,
        pitch: Math.atan2(-s.climb, this.speed * s.boost) * 0.6,
        // Banks harder in the quick turns of a chase.
        roll: Math.max(-0.95, Math.min(0.95, s.turn * 0.45)),
        tilt: TILT,
        prop: t * 19,
      },
    }
  }
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A still, pleasant pose for reduced-motion visitors. */
export function restingFlight(layout: Layout): FlightFrame {
  return {
    x: layout.skyTargets[0].x,
    y: layout.skyTargets[0].y,
    scale: (layout.planeScale * 0.72) / (1 + 1.8 * PERSPECTIVE),
    phase: "wander",
    pose: { yaw: 2.6, pitch: 0, roll: 0.25, tilt: TILT, prop: 0.4 },
  }
}
