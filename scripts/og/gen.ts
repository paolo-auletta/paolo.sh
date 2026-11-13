/**
 * The motion of the OG loops (see build.sh). Writes, per frame, a list of
 * plain draw ops that render.py rasterizes over the homepage's paintings.
 * Everything is seeded or periodic, so each loop closes on itself.
 *
 *   bun scripts/og/gen.ts day|night <fps> > frames.json
 */
import { projectPoint, rasterizePlane } from "@/components/home/ascii-plane"
import {
  flightAt,
  getLayout,
  Wanderer,
  WIDE_PATH,
  type Key,
} from "@/components/home/flight"

const W = 1200
const H = 630
const FPS = Number(process.argv[3] ?? 20)

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const smoothstep = (a: number, b: number, t: number) => {
  const x = clamp01((t - a) / (b - a))
  return x * x * (3 - 2 * x)
}
/** Deterministic hash noise in [0, 1). */
const hash = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Draw ops, in output px. render.py knows how to draw each. */
type Op =
  /** One glyph, centred. */
  | { o: "g"; x: number; y: number; c: string; px: number; rgba: number[] }
  /** The plane's cells: x, y (centre), color, repeated. Drawn solid. */
  | { o: "cells"; px: number; cw: number; ch: number; cells: number[] }
  /** A soft round light, from full at r0 to nothing at r1. */
  | { o: "glow"; x: number; y: number; r0: number; r1: number; rgba: number[] }
  /** One of the Giant's eyes; lid 1 open, 0 shut. */
  | { o: "eye"; x: number; y: number; r: number; lid: number; rgba: number[] }

/** fx is drawn behind the land; top over everything but the name. */
type Frame = {
  fx: Op[]
  top: Op[]
  /** Night: the searchlight for beam.ts. */
  beam?: {
    eyes: { x: number; y: number }[]
    aim: { x: number; y: number }
    power: number
  }
}

// ---------------------------------------------------------------------------
// Day: the seaplane's swoop from the homepage intro (components/home/
// flight.ts, the very same flight model), on a path that keeps under the
// name: in from the left, a slow roll on the way down, a level pass at its
// closest, then banking up to the right into the distance. Then a breath of
// empty sky.

const DAY_PATH: Key[] = [
  [-0.12, 0.22, 0.5],
  [0.05, 0.29, 0.62],
  [0.18, 0.39, 0.82],
  [0.31, 0.47, 1.0],
  [0.45, 0.5, 1.1],
  [0.6, 0.45, 1.0],
  [0.74, 0.33, 0.8],
  [0.87, 0.22, 0.6],
  [1.0, 0.14, 0.45],
  [1.14, 0.08, 0.36],
]
/** Seconds of empty sky between laps. */
const DAY_GAP = 0.7
/** The plane's glyphs, a little larger than on the site: cards are seen small. */
const DAY_FONT = 9

function day() {
  // The intro flies WIDE_PATH on a wide screen; for the card, ours.
  WIDE_PATH.splice(0, WIDE_PATH.length, ...DAY_PATH)
  const layout = getLayout(W, H)
  const wanderer = new Wanderer(layout)
  const cw = DAY_FONT * 0.6
  const ch = DAY_FONT * 0.85

  const raw = (t: number) => (t < 6 ? flightAt(t, layout, wanderer) : null)
  // The stretch of the flight that is on screen: the loop is that and the
  // gap, so the plane is never long gone.
  let seenFrom = Infinity
  let seenTo = 0
  for (let t = 0; t < 6; t += 0.01) {
    const f = raw(t)
    if (!f) continue
    const r = 0.6 * f.scale
    if (f.x + r < 0 || f.x - r > W || f.y + r < 0 || f.y - r > H) continue
    if (f.scale < 18) continue
    seenFrom = Math.min(seenFrom, t)
    seenTo = Math.max(seenTo, t)
  }
  const start = seenFrom - 0.05
  const period = Math.round((seenTo - start + DAY_GAP) * FPS) / FPS
  const flight = (t: number) => raw(t + start)
  const N = Math.round(period * FPS)

  // The engine's smoke (components/home/smoke.ts), emitted on a fixed
  // schedule and aged in closed form, so the last lap's tail carries into
  // the next one seamlessly.
  type Puff = {
    e: number
    x: number
    y: number
    vx: number
    vy: number
    life: number
    size: number
    seed: number
    bits: { dx: number; dy: number; jitter: number }[]
  }
  const puffs: Puff[] = []
  for (let e = 0, k = 0; e < period; k++) {
    const f = flight(e)
    if (f) {
      const ex = projectPoint(f.pose, f.scale, -0.2, 0.4, 0)
      const spread = 0.35 + hash(k, 1) * 0.65
      puffs.push({
        e,
        x: f.x + ex.x + (hash(k, 3) - 0.5) * 4,
        y: f.y + ex.y + (hash(k, 4) - 0.5) * 4,
        vx: (hash(k, 5) - 0.5) * 22 * spread,
        vy: (hash(k, 6) - 0.5) * 22 * spread,
        life: 1.1 + hash(k, 7) * 1.2,
        size: (0.8 + hash(k, 8) * 0.5) * Math.min(1.25, f.scale / 180 + 0.35),
        seed: hash(k, 9) * 1000,
        bits: Array.from({ length: 3 + ((hash(k, 2) * 4) | 0) }, (_, i) => {
          const angle = hash(k, 10 + i) * Math.PI * 2
          const radius = i === 0 ? 0 : 0.35 + hash(k, 20 + i) * 0.65
          return {
            dx: Math.cos(angle) * radius,
            dy: Math.sin(angle) * radius * 0.7,
            jitter: hash(k, 30 + i) * 2.2,
          }
        }),
      })
    }
    const rate = 24 + 12 * Math.sin((e * 1000) / 310)
    e += (1 + (hash(k, 0) - 0.5) * 0.6) / rate
  }
  const RAMP = "%#*+=~-:·."

  const frames: Frame[] = []
  // Poster: the plane at its closest.
  let poster = 0
  let posterScale = 0
  for (let i = 0; i < N; i++) {
    const t = i / FPS
    const fx: Op[] = []
    for (const p of puffs) {
      for (const lap of [0, -period]) {
        const age = t - (p.e + lap)
        if (age < 0 || age >= p.life) continue
        const d = 1 - Math.exp(-1.6 * age)
        const x = p.x + (p.vx * d) / 1.6
        const y = p.y + ((p.vy + 3.75) * d) / 1.6 - 3.75 * age
        const k = age / p.life
        const px = (10 + 4 * k) * p.size
        const spread = (2 + 20 * Math.sqrt(k)) * p.size
        const shown = Math.min(p.bits.length, 1 + Math.floor(k * 9))
        const alpha = 0.85 * Math.pow(1 - k, 1.25) * Math.min(1, age * 12)
        const wx = Math.sin(p.seed + age * 7) * 2.5 * k
        const wy = Math.cos(p.seed * 1.7 + age * 5) * 2 * k
        const rgba = [252 - 46 * k, 248 - 30 * k, 240 - 6 * k, alpha]
        for (let b = 0; b < shown; b++) {
          const bit = p.bits[b]
          const density = Math.min(
            RAMP.length - 1,
            Math.floor((k * 0.85 + bit.jitter * 0.12) * RAMP.length)
          )
          fx.push({
            o: "g",
            x: x + wx + bit.dx * spread,
            y: y + wy + bit.dy * spread,
            c: RAMP[density],
            px,
            rgba,
          })
        }
      }
    }
    const f = flight(t)
    if (f) {
      if (f.scale > posterScale) {
        posterScale = f.scale
        poster = i
      }
      // The glyph grid travels with the plane, as on the site.
      const reach = 1.75 * f.scale
      const ax = Math.ceil(reach / cw + 1) * cw
      const ay = Math.ceil(reach / ch + 1) * ch
      const sx = f.x - ax
      const sy = f.y - ay
      const cells: number[] = []
      rasterizePlane(
        f.pose,
        {
          originX: ax,
          originY: ay,
          scale: f.scale,
          cellWidth: cw,
          cellHeight: ch,
          viewWidth: W - sx,
          viewHeight: H - sy,
        },
        (col, row, _glyph, color) => {
          cells.push(sx + (col + 0.5) * cw, sy + (row + 0.5) * ch, color)
        }
      )
      fx.push({ o: "cells", px: DAY_FONT, cw, ch, cells })
    }
    frames.push({ fx, top: [] })
  }
  return { fps: FPS, poster, frames }
}

// ---------------------------------------------------------------------------
// Night: only the Giant's eyes, between the pines where he landed, sweeping
// their searchlight like a pendulum: over the pines on the left, up across
// the sky, out over the ridge on the right, and back, with one slow blink.

/** The night painting as render.py crops it (world px, and the scale). */
const NIGHT = {
  top: 1950,
  scale: 0.6,
  /** Where the painting's resting part (the photo the mattes cover) starts. */
  photoTop: 2100,
  /** Where he lands, in that part's px: his eyes open here. */
  landing: { x: 1180, y: 712 },
}
const SWEEP = {
  period: 8,
  /** The beam's angle, from the right, counter-clockwise (degrees). */
  from: 25,
  to: 163,
  /** How far off its aim point is, px. */
  reach: 620,
  /** When he blinks, as a share of the loop. */
  blinkAt: 0.33,
}
/** Wider apart than on the site (16 px here): cards are seen small. */
const EYE_GAP = 24

function night() {
  const s = NIGHT.scale
  const photoTop = (NIGHT.photoTop - NIGHT.top) * s
  const center = { x: NIGHT.landing.x * s, y: photoTop + NIGHT.landing.y * s }
  const N = Math.round(SWEEP.period * FPS)
  const rad = Math.PI / 180

  // A pendulum, slow at either end.
  const angleAt = (t: number) =>
    ((SWEEP.from + SWEEP.to) / 2) * rad +
    ((SWEEP.to - SWEEP.from) / 2) *
      rad *
      Math.sin((2 * Math.PI * t) / SWEEP.period)
  const aimAt = (t: number) => {
    const a = angleAt(t)
    return {
      x: center.x + SWEEP.reach * Math.cos(a),
      y: center.y - SWEEP.reach * Math.sin(a),
    }
  }

  const frames: Frame[] = []
  for (let i = 0; i < N; i++) {
    const t = i / FPS
    // The eyes turn toward the beam's point, a touch behind it, the way they
    // follow the pointer on the site (giant-night.tsx, stepEyes).
    const look = aimAt(t - 0.06)
    const dx = look.x - center.x
    const dy = look.y - center.y
    const reach = Math.hypot(dx, dy) + 240
    const gx = (dx / reach) * EYE_GAP * 0.34
    const gy = (dy / reach) * EYE_GAP * 0.22
    const half =
      EYE_GAP * 0.5 * (1 - 0.18 * Math.min(1, Math.abs(gx) / (EYE_GAP * 0.34)))
    const b = t - SWEEP.blinkAt * SWEEP.period
    const lid = b > 0 && b < 0.3 ? Math.abs(Math.cos((b / 0.3) * Math.PI)) : 1
    const power = 0.15 + 0.85 * smoothstep(0, 0.6, lid)
    const radius = EYE_GAP * 0.21
    const halo = 3.2 + 2.4 * power
    const seen = smoothstep(0.02, 0.2, lid)
    const eyes = [
      { x: center.x + gx - half, y: center.y + gy },
      { x: center.x + gx + half, y: center.y + gy },
    ]
    const top: Op[] = []
    for (const e of eyes) {
      top.push({
        o: "glow",
        x: e.x,
        y: e.y,
        r0: radius * 0.6,
        r1: radius * halo,
        rgba: [0x7c, 0xb8, 0xff, (0.42 + 0.5 * power) * lid],
      })
      top.push({
        o: "eye",
        x: e.x,
        y: e.y,
        r: radius,
        lid,
        rgba: [mix(226, 255, power), mix(240, 255, power), 255, seen],
      })
    }
    frames.push({
      fx: [],
      top,
      beam: { eyes, aim: aimAt(t), power: power * smoothstep(0.05, 0.5, lid) },
    })
  }

  // Poster: the beam up across the sky to the right, on its way down.
  let poster = 0
  let best = Infinity
  for (let i = 0; i < N; i++) {
    const t = i / FPS
    const off = Math.abs(angleAt(t) - 58 * rad)
    if (angleAt(t + 0.01) < angleAt(t) && off < best) {
      best = off
      poster = i
    }
  }
  return {
    fps: FPS,
    poster,
    frames,
    photo: { left: 0, top: photoTop, width: 2000 * s, height: 1100 * s },
  }
}

const scene = process.argv[2]
if (scene !== "day" && scene !== "night") {
  console.error("usage: bun scripts/og/gen.ts day|night <fps>")
  process.exit(1)
}
console.log(JSON.stringify(scene === "day" ? day() : night()))
