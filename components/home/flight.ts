import type { PlanePose } from "@/components/home/ascii-plane"

/**
 * The homepage intro, on one clock (seconds).
 *
 *   0.0  sky only, high above the meadow
 *   0.25 the plane glides in from the high sky on the left while the camera
 *        starts to descend with it, unhurried, and rolls over once, slowly
 *   ~2.6 it reaches the bottom of its swoop, closest to us and fastest,
 *        levels out, and banks up to the right into the distance
 *   3.9  the paper washes in around the text
 *   4.3  the copy fades in
 *   4.45 the plane is gone (sooner on phones)
 *   4.9  the camera lands on the meadow
 *   5.1+ the plane comes back from the top right and wanders the sky,
 *        drifting between the open patches around the edges
 */
export const INTRO = {
  planeIn: 0.25,
  /** The latest the intro plane is gone; on phones it leaves sooner. */
  planeOut: 4.75,
  cameraStart: 0.6,
  cameraEnd: 4.9,
  paperStart: 3.9,
  paperEnd: 5.4,
  reveal: 4.3,
  wanderStart: 5.1,
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
 * The intro flight, as keys on screen: where the plane is (viewport
 * fractions) and how near it is (its size; 1 is the bottom of the swoop).
 * The keys are lifted into a real 3D space seen through a long lens and the
 * plane flies one smooth curve through them. Its pace comes from the flight
 * itself rather than from the keys: it gathers speed as it comes down,
 * carries it through the pass, and opens the throttle to climb away, while
 * the lens shrinks and slows it on screen as it leaves. So its speed and
 * heading never jump.
 */
export type Key = readonly [x: number, y: number, near: number]

/**
 * Wide screens: out of the high sky on the left, one long glide down and
 * toward us, a level pass at its closest, then banking up to the right
 * into the distance.
 */
export const WIDE_PATH: Key[] = [
  [-0.06, 0.04, 0.5],
  [0.07, 0.12, 0.6],
  [0.19, 0.27, 0.8],
  [0.31, 0.4, 0.97],
  [0.44, 0.46, 1.04],
  [0.6, 0.42, 0.92],
  [0.76, 0.29, 0.72],
  [0.93, 0.18, 0.56],
  [1.12, 0.11, 0.46],
]

/**
 * Phones, upright: the same flight drawn for a narrow frame, gliding across
 * the top of the sky rather than dropping straight down it, and leaving
 * more by going off into the distance than across.
 */
const COMPACT_PATH: Key[] = [
  [-0.1, 0.1, 0.5],
  [0.07, 0.14, 0.6],
  [0.25, 0.2, 0.78],
  [0.44, 0.25, 0.95],
  [0.6, 0.27, 1.0],
  [0.75, 0.262, 0.93],
  [0.87, 0.238, 0.75],
  [0.96, 0.21, 0.6],
  [1.04, 0.185, 0.49],
  [1.13, 0.165, 0.41],
]

/** How far off it is at size 1, in model units: a long, gentle lens. */
const LENS = 9
/**
 * Its speed through the air: v² = SPEED_FLOOR + the share of the drop it
 * has fallen, so it is slowest at the top and fastest at the bottom.
 */
const SPEED_FLOOR = 0.55
/**
 * How long a wide screen's flight takes, and its length as the pace is
 * measured (screen moves over the plane's size).
 */
const FLIGHT_SECONDS = 4.2
const FLIGHT_LENGTH = 17
/** How much growing or shrinking on screen counts as moving, in plane sizes. */
const GROWTH = 6
/** How much it speeds up again climbing away (throttle open). */
const THROTTLE = 1.1
/**
 * How much its depth counts when turning its velocity into a heading. Below
 * 1 it stays closer to side-on than it really would, where it reads best.
 */
const HEADING_DEPTH = 0.45
/** How hard it banks into a turn. */
const BANK = 0.55
/** The roll on the way down: where it starts and ends (share of the way). */
const ROLL = [0.11, 0.32] as const

type Track = {
  /** Intro-clock time of each sample. */
  time: Float64Array
  x: Float64Array
  y: Float64Array
  z: Float64Array
  /** Screen pixels per model unit at depth z = 1. */
  focal: number
  cx: number
  cy: number
  /** When the roll starts and ends. */
  roll: [number, number]
}

const SAMPLES = 1500
const tracks = new WeakMap<Layout, Track>()

/** The intro flight for a layout, sampled densely in time. */
function trackFor(layout: Layout): Track {
  const cached = tracks.get(layout)
  if (cached) return cached
  const { width, height } = layout
  const keys = width < 640 ? COMPACT_PATH : WIDE_PATH
  // The vanishing point, a little above the middle: it leaves toward it.
  const cx = width * 0.5
  const cy = height * 0.42
  const focal = (layout.planeScale / 1.7) * LENS
  const points = keys.map(([sx, sy, near]) => {
    const z = LENS / near
    return [
      ((sx * width - cx) * z) / focal,
      ((cy - sy * height) * z) / focal,
      z,
    ]
  })
  // Carry on straight past either end.
  const n = points.length
  const extend = (a: number[], b: number[]) => a.map((v, k) => 2 * v - b[k])
  const all = [
    extend(points[0], points[1]),
    ...points,
    extend(points[n - 1], points[n - 2]),
  ]

  const x = new Float64Array(SAMPLES)
  const y = new Float64Array(SAMPLES)
  const z = new Float64Array(SAMPLES)
  const segments = n - 1
  for (let i = 0; i < SAMPLES; i++) {
    const f = Math.min(segments - 1e-9, (i / (SAMPLES - 1)) * segments)
    const k = Math.floor(f)
    const p = centripetal(all[k], all[k + 1], all[k + 2], all[k + 3], f - k)
    x[i] = p[0]
    y[i] = p[1]
    z[i] = p[2]
  }

  // Fly it. Through a lens a plane at a steady airspeed crosses the screen
  // in proportion to its size there, so each step is measured on screen
  // (with how much it grows or shrinks) against its size, then sped up by
  // how far it has fallen and by the throttle on the way out.
  const screenX = (i: number) => cx + (x[i] * focal) / z[i]
  const screenY = (i: number) => cy - (y[i] * focal) / z[i]
  let top = Infinity
  let bottom = 0
  for (let i = 0; i < SAMPLES; i++) {
    top = Math.min(top, screenY(i))
    if (screenY(i) > screenY(bottom)) bottom = i
  }
  const drop = screenY(bottom) - top || 1
  const time = new Float64Array(SAMPLES)
  for (let i = 1; i < SAMPLES; i++) {
    const size = focal / z[i]
    const grow = (z[i - 1] / z[i] - 1) * GROWTH * size
    const step = Math.hypot(
      screenX(i) - screenX(i - 1),
      screenY(i) - screenY(i - 1),
      grow
    )
    const fallen = i <= bottom ? (screenY(i) - top) / drop : 1
    const throttle = 1 + THROTTLE * smoothstep(bottom, SAMPLES - 1, i)
    time[i] =
      time[i - 1] + step / (size * Math.sqrt(SPEED_FLOOR + fallen) * throttle)
  }
  // A longer flight takes longer, but not in proportion: a phone's shorter
  // one is a little brisker, so it never drags.
  const length = time[SAMPLES - 1]
  const seconds = Math.min(
    INTRO.planeOut - INTRO.planeIn,
    FLIGHT_SECONDS * Math.sqrt(length / FLIGHT_LENGTH)
  )
  const span = seconds / length
  for (let i = 0; i < SAMPLES; i++) time[i] = INTRO.planeIn + time[i] * span

  const roll: [number, number] = [
    time[Math.round(ROLL[0] * (SAMPLES - 1))],
    time[Math.round(ROLL[1] * (SAMPLES - 1))],
  ]
  const track = { time, x, y, z, focal, cx, cy, roll }
  tracks.set(layout, track)
  return track
}

/** Centripetal Catmull-Rom between b and c: no loops, no overshoot. */
function centripetal(
  a: number[],
  b: number[],
  c: number[],
  d: number[],
  u: number
) {
  const knot = (p: number[], q: number[]) =>
    Math.sqrt(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])) || 1e-4
  const t1 = knot(a, b)
  const t2 = t1 + knot(b, c)
  const t3 = t2 + knot(c, d)
  const t = t1 + (t2 - t1) * u
  return [0, 1, 2].map((k) => {
    const a1 = ((t1 - t) * a[k] + t * b[k]) / t1
    const a2 = ((t2 - t) * b[k] + (t - t1) * c[k]) / (t2 - t1)
    const a3 = ((t3 - t) * c[k] + (t - t2) * d[k]) / (t3 - t2)
    const b1 = ((t2 - t) * a1 + t * a2) / t2
    const b2 = ((t3 - t) * a2 + (t - t1) * a3) / (t3 - t1)
    return ((t2 - t) * b1 + (t - t1) * b2) / (t2 - t1)
  })
}

/** Where the plane is in the world at a time on the intro clock. */
function trackAt(track: Track, t: number) {
  const { time } = track
  const last = SAMPLES - 1
  // Past either end it carries on in a straight line.
  const edge = t < time[0] ? 0 : t > time[last] ? last - 1 : -1
  let lo = edge
  if (lo < 0) {
    lo = 0
    let hi = last
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (time[mid] <= t) lo = mid
      else hi = mid
    }
  }
  const hi = lo + 1
  const f = (t - time[lo]) / (time[hi] - time[lo] || 1)
  const lerp = (a: Float64Array) => a[lo] + (a[hi] - a[lo]) * f
  return [lerp(track.x), lerp(track.y), lerp(track.z)]
}

/**
 * Its heading as it looks: yaw (0 = to the right, +π/2 = toward us) and
 * pitch, from how it moves across the screen and how fast it grows there,
 * the same way its pace is measured.
 */
function headingOn(track: Track, t: number) {
  const h = 1 / 60
  const [ax, ay, az] = trackAt(track, t - h)
  const [bx, by, bz] = trackAt(track, t + h)
  const { focal } = track
  const vx = (bx / bz - ax / az) * focal
  const vy = (by / bz - ay / az) * focal
  const vz = (bz / az - 1) * GROWTH * HEADING_DEPTH * (focal / bz)
  return {
    yaw: Math.atan2(-vz, vx),
    pitch: Math.atan2(vy, Math.hypot(vx, vz)),
  }
}

/**
 * One slow aileron roll on the way down, eased in and out, so it comes out
 * of it level well before the bottom of the swoop.
 */
function introRoll(track: Track, t: number) {
  return smoothstep(track.roll[0], track.roll[1], t) * Math.PI * 2
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
  if (t < INTRO.planeIn - 0.05) return null

  const track = trackFor(layout)
  if (t > track.time[SAMPLES - 1] + 0.05) return null
  const [x, y, z] = trackAt(track, t)

  const now = headingOn(track, t)
  // Bank into turns, rolling in and out with them.
  const dt = 0.15
  const before = headingOn(track, t - dt)
  const after = headingOn(track, t + dt)
  const turn = (unwrap(after.yaw, before.yaw) - before.yaw) / (2 * dt)
  const bank = Math.max(-0.8, Math.min(0.8, turn * BANK))
  // A breath of air under the wings: they rock a touch as it glides.
  const rock = 0.05 * Math.sin(t * 2.6 + 0.4)

  return {
    x: track.cx + (x * track.focal) / z,
    y: track.cy - (y * track.focal) / z,
    scale: track.focal / z,
    phase: "intro",
    pose: {
      yaw: now.yaw,
      pitch: now.pitch * 0.8,
      roll: bank + rock + introRoll(track, t),
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
