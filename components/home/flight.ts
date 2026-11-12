import type { PlanePose } from "@/components/home/ascii-plane"

/**
 * The homepage intro, on one clock (seconds).
 *
 *   0.0  sky only, high above the meadow
 *   0.3  the plane flies in from the left while the camera starts to descend
 *   3.9  the paper washes in around the text
 *   4.3  the copy fades in
 *   4.9  the plane leaves on the right; the camera lands on the meadow
 *   5.6+ the plane comes back from the top right and wanders the sky,
 *        drifting between the open patches around the edges
 */
export const INTRO = {
  planeIn: 0.3,
  planeOut: 4.9,
  cameraStart: 0.6,
  cameraEnd: 4.9,
  paperStart: 3.9,
  paperEnd: 5.4,
  reveal: 4.3,
  wanderStart: 5.6,
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
    planeScale: Math.min(Math.max(width * 0.17, 130), 290),
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
// How strongly depth shrinks the plane.
const PERSPECTIVE = 0.55

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
 * The intro flight, as keyframes through 3D: in small and distant from the
 * left, swooping toward the camera mid-screen (behind the big cloud), then
 * banking away into the distance on the right. x and y are viewport
 * fractions, z is depth.
 */
const INTRO_PATH: [number, number, number][] = [
  [-0.32, 0.31, 2.4],
  [0.02, 0.24, 1.9],
  [0.26, 0.2, 1.1],
  [0.5, 0.27, 0.3],
  [0.72, 0.21, 1.5],
  [0.92, 0.15, 2.8],
  [1.34, 0.1, 4.2],
]

function introPoint(t: number, layout: Layout): Point {
  const u = Math.min(
    1,
    Math.max(0, (t - INTRO.planeIn) / (INTRO.planeOut - INTRO.planeIn))
  )
  // Ease the pace a little: lively entrance, a breath at the swoop.
  const v = u + 0.035 * Math.sin(u * Math.PI * 2)
  const [x, y, z] = catmullRom(INTRO_PATH, v)
  return { x: x * layout.width, y: y * layout.height, z }
}

function catmullRom(points: [number, number, number][], u: number) {
  const segments = points.length - 1
  const f = Math.min(segments - 1e-6, Math.max(0, u * segments))
  const i = Math.floor(f)
  const t = f - i
  const p0 = points[Math.max(0, i - 1)]
  const p1 = points[i]
  const p2 = points[i + 1]
  const p3 = points[Math.min(segments, i + 2)]
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

/** Extra roll on top of banking: a hello waggle, then an aileron roll. */
function introFlourish(t: number) {
  const waggle = smoothstep(0.7, 1.0, t) * (1 - smoothstep(1.6, 1.95, t))
  const hello = 0.22 * waggle * Math.sin((t - 0.7) * Math.PI * 2 * 1.6)
  const rollProgress = smoothstep(3.25, 4.15, t)
  return hello + rollProgress * Math.PI * 2
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
  const now = headingAt(t, layout)
  const later = headingAt(t + 0.12, layout)
  const turnRate = unwrap(later.yaw, now.yaw) - now.yaw

  // Bank into turns, plus the flourishes; the descent tips the nose down.
  const roll =
    Math.max(-0.9, Math.min(0.9, (turnRate / 0.12) * 0.28)) + introFlourish(t)
  const descent = Math.min(
    1,
    Math.max(0, (t - INTRO.cameraStart) / (INTRO.cameraEnd - INTRO.cameraStart))
  )
  const dive = -0.22 * Math.sin(Math.PI * descent)

  return {
    x: p.x,
    y: p.y,
    scale: layout.planeScale / (1 + p.z * PERSPECTIVE),
    phase: "intro",
    pose: {
      yaw: now.yaw,
      pitch: now.pitch * 0.6 + dive,
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
      z: 1.4 + r() * 1.0,
    }
    s.targetSince = s.t
  }

  private step(s: WanderState) {
    const { speed, depthPx } = this
    const dx = s.target.x - s.x
    const dz = (s.target.z - s.z) * depthPx
    const desired = Math.atan2(-dz, dx)
    // Turn toward the target, easing the turn rate so banks roll in and out.
    const wanted = (unwrap(desired, s.yaw) - s.yaw) * 1.3
    s.turn +=
      (Math.max(-0.9, Math.min(0.9, wanted)) - s.turn) * Math.min(1, STEP * 1.8)
    s.yaw += s.turn * STEP

    const climbWanted =
      Math.max(-0.4, Math.min(0.4, (s.target.y - s.y) / 180)) * speed
    s.climb += (climbWanted - s.climb) * Math.min(1, STEP * 1.1)

    s.x += Math.cos(s.yaw) * speed * STEP
    s.z -= (Math.sin(s.yaw) * speed * STEP) / depthPx
    s.z = Math.max(0.6, Math.min(4, s.z))
    s.y += s.climb * STEP
    s.t += STEP

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
        pitch: Math.atan2(-s.climb, this.speed) * 0.6,
        roll: Math.max(-0.6, Math.min(0.6, s.turn * 0.45)),
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
