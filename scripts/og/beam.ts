/**
 * The night card's searchlight: components/home/beacon.ts's fragment shader
 * and beam trace, run on the CPU (no WebGL needed), line for line, against
 * the night painting and its depth mattes. Writes one raw RGB frame of light
 * per frame; render.py screens it over the scene, as the site does.
 *
 *   bun scripts/og/beam.ts <work dir> <first frame> <end frame>
 *
 * The work dir holds night.json (gen.ts) and the painting's resting part and
 * mattes as raw RGB (albedo.rgb, 2000x1100; mattes.rgb, 1000x550), which
 * build.sh decodes; frames go to <work dir>/beam/.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const [, , work, a0, a1] = process.argv
const data = JSON.parse(readFileSync(join(work, "night.json"), "utf8"))
const outDir = join(work, "beam")
mkdirSync(outDir, { recursive: true })

const W = 1200
const H = 630
const PW = 2000
const PH = 1100
const albedo = new Uint8Array(readFileSync(join(work, "albedo.rgb")))
const mattes = new Uint8Array(readFileSync(join(work, "mattes.rgb")))
const MW = 1000
const MH = 550

const CENTER_X = 1000
const CENTER_Y = 560
const FOCAL = 1500
const SKY = 30
const SPREAD = 0.06
const LENS = 11

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const fract = (x: number) => x - Math.floor(x)
const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** GL LINEAR, CLAMP_TO_EDGE: writes rgb (0–1) into out. */
function tex(
  buf: Uint8Array,
  w: number,
  h: number,
  u: number,
  v: number,
  out: number[]
) {
  const x = clamp(u, 0, 1) * w - 0.5
  const y = clamp(v, 0, 1) * h - 0.5
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const xa = clamp(x0, 0, w - 1)
  const xb = clamp(x0 + 1, 0, w - 1)
  const ya = clamp(y0, 0, h - 1)
  const yb = clamp(y0 + 1, 0, h - 1)
  for (let c = 0; c < 3; c++) {
    const p00 = buf[(ya * w + xa) * 3 + c]
    const p10 = buf[(ya * w + xb) * 3 + c]
    const p01 = buf[(yb * w + xa) * 3 + c]
    const p11 = buf[(yb * w + xb) * 3 + c]
    out[c] =
      ((p00 * (1 - fx) + p10 * fx) * (1 - fy) +
        (p01 * (1 - fx) + p11 * fx) * fy) /
      255
  }
}
const m3 = [0, 0, 0]
const nearness = (qx: number, qy: number) => {
  if (qy < 0) return 0
  tex(mattes, MW, MH, qx / PW, qy / PH, m3)
  return m3[2]
}
const depthOf = (n: number) => 1 / (1 / SKY + (1 - 1 / SKY) * n)
const depthAt = (qx: number, qy: number) => depthOf(nearness(qx, qy))

type V3 = [number, number, number]
const place = (qx: number, qy: number, z: number): V3 => [
  ((qx - CENTER_X) / FOCAL) * z,
  ((qy - CENTER_Y) / FOCAL) * z,
  z,
]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const len = (a: V3) => Math.hypot(a[0], a[1], a[2])
const norm = (a: V3): V3 => {
  const l = len(a) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const hash = (x: number, y: number) => {
  let px = fract(x * 123.34)
  let py = fract(y * 456.21)
  const d = px * (px + 45.32) + py * (py + 45.32)
  px += d
  py += d
  return fract(px * py)
}

function cone(x: V3, eye: V3, dir: V3, lens: number, e0: number, e1: number) {
  const l = sub(x, eye)
  const along = dot(l, dir)
  if (along <= 0) return 0
  const radius = lens + along * SPREAD
  const off =
    Math.hypot(
      l[0] - along * dir[0],
      l[1] - along * dir[1],
      l[2] - along * dir[2]
    ) / radius
  return Math.exp(-off * off * 2.2) * (1 - smoothstep(e0, e1, along))
}
function segmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) {
  const abx = bx - ax
  const aby = by - ay
  const k = clamp(
    ((px - ax) * abx + (py - ay) * aby) / Math.max(abx * abx + aby * aby, 1e-4),
    0,
    1
  )
  return Math.hypot(px - ax - abx * k, py - ay - aby * k)
}

// The CPU trace from beacon.ts.
const sample = (qx: number, qy: number) => {
  if (qy < 0) return { near: 0, pine: 0 }
  const x = Math.round(clamp(qx / PW, 0, 1) * (MW - 1))
  const y = Math.round(clamp(qy / PH, 0, 1) * (MH - 1))
  const i = (y * MW + x) * 3
  return { near: mattes[i + 2] / 255, pine: mattes[i + 1] / 255 }
}
function trace(
  eye: { x: number; y: number },
  aim: { x: number; y: number },
  photo: { left: number; top: number; width: number; height: number }
) {
  const toQ = (p: { x: number; y: number }) => ({
    x: ((p.x - photo.left) / photo.width) * PW,
    y: ((p.y - photo.top) / photo.height) * PH,
  })
  const qE = toQ(eye)
  const qA = toQ(aim)
  const zE = depthOf(sample(qE.x, qE.y).near) * 0.97
  const at = sample(qA.x, qA.y)
  const land = at.near > 0.004
  const target = land && (at.pine > 0.5 || qA.y < qE.y)
  const zA = !land
    ? zE * 1.2
    : target
      ? depthOf(at.near)
      : depthOf(at.near) * 0.95
  const toAim = Math.hypot(qA.x - qE.x, qA.y - qE.y)
  if (toAim < 1) return { zE, end: qA, endDepth: zA, hit: target }
  const dx = (qA.x - qE.x) / toAim
  const dy = (qA.y - qE.y) / toAim
  const toScreen = photo.width / PW
  const margin = 60
  let last = { x: qA.x, y: qA.y, z: zA }
  for (let d = 16; d < 6000; d += 3) {
    if (target && d >= toAim) return { zE, end: qA, endDepth: zA, hit: true }
    const k = d / toAim
    const inverse = 1 / zE + (1 / zA - 1 / zE) * k
    if (inverse <= 0 || 1 / inverse > 40) break
    const zb = 1 / inverse
    if (zb < 0.45) return { zE, end: last, endDepth: last.z, hit: false }
    const q = { x: qE.x + dx * d, y: qE.y + dy * d }
    const sx = photo.left + q.x * toScreen
    const sy = photo.top + q.y * toScreen
    last = { x: q.x, y: q.y, z: zb }
    if (sx < -margin || sy < -margin || sx > W + margin || sy > H + margin) {
      return { zE, end: last, endDepth: zb, hit: false }
    }
    const there = sample(q.x, q.y)
    if (there.near < 0.004) continue
    const rel = (zb - depthOf(there.near)) / zb
    const blocks =
      there.pine > 0.5
        ? rel > 0.02 && rel < 0.2
        : q.y < qE.y && rel > 0.03 && rel < 0.5
    if (blocks) return { zE, end: last, endDepth: zb, hit: true }
  }
  return { zE, end: last, endDepth: last.z, hit: false }
}

/** A touch brighter than the site's: a card is seen small. */
const BOOST = 1.5
const LIGHT: V3 = [
  (0x7c / 255) * BOOST,
  (0xb8 / 255) * BOOST,
  (0xff / 255) * BOOST,
]
const photo = data.photo
const toPhoto = (x: number, y: number) => [
  ((x - photo.left) / photo.width) * PW,
  ((y - photo.top) / photo.height) * PH,
]

const a = [0, 0, 0]
for (let f = Number(a0); f < Math.min(Number(a1), data.frames.length); f++) {
  const { eyes, aim, power } = data.frames[f].beam
  const out = new Uint8Array(W * H * 3)
  if (power > 0.001) {
    const center = {
      x: (eyes[0].x + eyes[1].x) / 2,
      y: (eyes[0].y + eyes[1].y) / 2,
    }
    const beam = trace(center, aim, photo)
    const [qLx, qLy] = toPhoto(eyes[0].x, eyes[0].y)
    const [qRx, qRy] = toPhoto(eyes[1].x, eyes[1].y)
    const qEx = (qLx + qRx) / 2
    const qEy = (qLy + qRy) / 2
    const zE = beam.zE
    const eyeL = place(qLx, qLy, zE)
    const eyeR = place(qRx, qRy, zE)
    const eye: V3 = [(eyeL[0] + eyeR[0]) / 2, (eyeL[1] + eyeR[1]) / 2, zE]
    const lens = (LENS / FOCAL) * zE
    const tip = place(beam.end.x, beam.end.y, beam.endDepth)
    const dir = norm(sub(tip, eye))
    const dirL = norm(sub(tip, eyeL))
    const dirR = norm(sub(tip, eyeR))
    const span = len(sub(tip, eye))
    const fade = beam.hit ? [span * 1.12, span * 1.45] : [span, span * 1.3]
    const airFade = beam.hit ? [span * 0.97, span * 1.03] : fade
    const end = fade[1]
    const reach =
      ((lens + end * SPREAD) / Math.min(zE, beam.endDepth)) * FOCAL * 2.2 + 40
    const zTip = beam.endDepth

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const p0 = px + 0.5
        const p1 = py + 0.5
        const [qx, qy] = toPhoto(p0, p1)
        if (segmentDistance(qx, qy, qEx, qEy, beam.end.x, beam.end.y) > reach)
          continue
        const n = nearness(qx, qy)
        const sky = n < 0.004
        const z = sky ? SKY : depthOf(n)
        const surface = place(qx, qy, z)
        let lr = 0
        let lg = 0
        let lb = 0
        if (!sky) {
          const spot = Math.max(
            cone(surface, eyeL, dirL, lens, fade[0], fade[1]),
            cone(surface, eyeR, dirR, lens, fade[0], fade[1])
          )
          if (spot > 0.003) {
            const pxv = place(qx + 3, qy, depthAt(qx + 3, qy))
            const pyv = place(qx, qy + 3, depthAt(qx, qy + 3))
            let normal = norm(cross(sub(pyv, surface), sub(pxv, surface)))
            if (normal[2] > 0) normal = [-normal[0], -normal[1], -normal[2]]
            const toEye = sub(eye, surface)
            const dist = len(toEye)
            let facing = dot(normal, [
              toEye[0] / dist,
              toEye[1] / dist,
              toEye[2] / dist,
            ])
            facing = facing > 0 ? facing : -facing * 0.6
            let blocked = 0
            const jitter = hash(p0, p1)
            const skip = Math.min(
              0.5,
              14 / Math.max(Math.hypot(qEx - qx, qEy - qy), 1)
            )
            for (let i = 0; i < 24; i++) {
              const k = mix(skip, 0.97, (i + jitter) / 24)
              const sx = mix(qx, qEx, k)
              const sy = mix(qy, qEy, k)
              const zr = 1 / mix(1 / z, 1 / zE, k)
              let mb = 0
              let mg = 0
              if (sy >= 0) {
                tex(mattes, MW, MH, sx / PW, sy / PH, m3)
                mg = m3[1]
                mb = m3[2]
              }
              const rel = (zr - depthOf(mb)) / zr
              const thick = mix(0.5, 0.14, mg)
              blocked +=
                smoothstep(0.06, 0.12, rel) *
                (1 - smoothstep(thick, thick + 0.08, rel))
            }
            const lit = 1 - smoothstep(0, 5, blocked)
            tex(albedo, PW, PH, qx / PW, qy / PH, a)
            const falloff = 1 / (1 + 0.05 * dist * dist)
            const k = spot * mix(0.4, 1, facing) * lit * falloff * 1.6
            lr += (a[0] * 2.6 + 0.09) * k
            lg += (a[1] * 2.6 + 0.09) * k
            lb += (a[2] * 2.6 + 0.09) * k
          }
        }
        const pad = lens + end * SPREAD + 0.15
        const zNear = Math.max(0.2, Math.min(eye[2], zTip) - pad)
        const zFar = Math.min(z, Math.max(eye[2], zTip) + pad)
        if (zFar > zNear) {
          const vx = (qx - CENTER_X) / FOCAL
          const vy = (qy - CENTER_Y) / FOCAL
          const dz = (zFar - zNear) / 40
          const jitter = hash(p0 + 3.1, p1 + 3.1)
          let haze = 0
          for (let i = 0; i < 40; i++) {
            const zz = zNear + (i + jitter) * dz
            const x: V3 = [vx * zz, vy * zz, zz]
            const l = sub(x, eye)
            const along = Math.max(dot(l, dir), 0)
            const radius = lens + along * SPREAD
            haze +=
              (cone(x, eyeL, dirL, lens, airFade[0], airFade[1]) +
                cone(x, eyeR, dirR, lens, airFade[0], airFade[1])) /
              (radius * (1 + 0.35 * along))
          }
          const h = Math.min(haze * dz * 0.055, 1.6)
          lr += h
          lg += h
          lb += h
        }
        const o = (py * W + px) * 3
        out[o] = Math.round(Math.min(lr * LIGHT[0] * power, 1) * 255)
        out[o + 1] = Math.round(Math.min(lg * LIGHT[1] * power, 1) * 255)
        out[o + 2] = Math.round(Math.min(lb * LIGHT[2] * power, 1) * 255)
      }
    }
  }
  writeFileSync(join(outDir, `b${String(f).padStart(4, "0")}.rgb`), out)
}
