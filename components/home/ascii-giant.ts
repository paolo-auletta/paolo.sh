/**
 * A tiny signed-distance model of a giant steel robot (an homage to The Iron
 * Giant), ray-marched into a grid of ASCII characters the same way the day
 * scene's seaplane is.
 *
 * Pure math, no DOM: the caller supplies a pose and a cell grid and gets a
 * callback per covered cell with the glyph and its color.
 *
 * Model space: +x is toward the head, +y is out of the chest, ±z are the
 * arms. One unit is half his height.
 */

import {
  cellWindow,
  len3,
  sdCapsule,
  sdEllipsoid,
  sdRoundCone,
  type CellCallback,
  type CellRaster,
} from "@/components/home/ascii-sdf"

export type GiantPose = {
  /** Where the head points on screen. 0 = right, +π/2 = up. */
  heading: number
  /** How far the head leans out of the screen, toward the viewer. */
  lean: number
  /** Spin about his own long axis. */
  roll: number
  /** Phase of the limbs trailing in the wind. */
  flutter: number
}

// Materials ------------------------------------------------------------------

const MAT_STEEL = 0
const MAT_JOINT = 1
const MAT_HEAD = 2

/**
 * Four cel-shaded tones each (deep shadow, shadow, lit, moonlit edge), packed
 * 0xRRGGBB. Night colors: his shadows are the sky's own navy, so the dark
 * side of him sinks into it, and only what the moon catches reads as steel.
 */
const PALETTE: [number, number, number, number][] = [
  [0x151e3b, 0x2d3c68, 0x6177ae, 0xbccdf3], // plating
  [0x0c1226, 0x182241, 0x2f3d68, 0x5567a0], // neck, waist, upper limbs
  [0x192345, 0x334475, 0x6b80b8, 0xc9d8f8], // head
]

/** His eyes: the one color on him. */
export const GIANT_EYE = 0x7cb8ff

// The limbs' joints for the current pose, per side (z < 0, then z > 0):
// elbow, wrist, hand, knee, ankle, each as x, y, z.
const JOINTS = 15
const joints = new Float64Array(JOINTS * 2)

function setLimbs(flutter: number) {
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1
    const p = flutter + i * 2.1
    const o = i * JOINTS
    // Arms swept back along the body, hands trailing a little wide.
    const ex = 0.19
    const ey = -0.03 + 0.03 * Math.sin(p * 1.3)
    const ez = side * (0.425 + 0.025 * Math.sin(p))
    const wx = -0.1
    const wy = -0.02 + 0.06 * Math.sin(p * 1.3 + 0.8)
    const wz = side * (0.455 + 0.045 * Math.sin(p + 0.7))
    const fl = Math.hypot(wx - ex, wy - ey, wz - ez)
    joints[o] = ex
    joints[o + 1] = ey
    joints[o + 2] = ez
    joints[o + 3] = wx
    joints[o + 4] = wy
    joints[o + 5] = wz
    joints[o + 6] = wx + ((wx - ex) / fl) * 0.1
    joints[o + 7] = wy + ((wy - ey) / fl) * 0.1
    joints[o + 8] = wz + ((wz - ez) / fl) * 0.1
    // Legs together, knees and feet riding the wind.
    joints[o + 9] = -0.42
    joints[o + 10] = 0.025 * Math.sin(p * 1.1 + 1)
    joints[o + 11] = side * 0.115
    joints[o + 12] = -0.8
    joints[o + 13] = 0.055 * Math.sin(p * 1.1 + 1.9)
    joints[o + 14] = side * (0.122 + 0.018 * Math.sin(p * 0.9))
  }
}

let hitMaterial = MAT_STEEL

function map(x: number, y: number, z: number) {
  // Chest: a barrel, wide at the shoulders, tapering to the waist. The squash
  // in z only ever shortens distances, so the march stays safe.
  let d = sdRoundCone(x, y, z * 0.62, 0.47, 0, 0.205, 0.31, 0, 0.165)
  let m = MAT_STEEL
  let k: number

  // Head and neck.
  if (len3(x - 0.78, y, z) - 0.26 < d) {
    k = Math.min(
      sdEllipsoid(x - 0.85, y, z, 0.14, 0.125, 0.125),
      sdEllipsoid(x - 0.765, y - 0.035, z, 0.075, 0.128, 0.145)
    )
    if (k < d) {
      d = k
      m = MAT_HEAD
    }
    k = sdCapsule(x, y, z, 0.58, 0, 0, 0.72, 0, 0, 0.05)
    if (k < d) {
      d = k
      m = MAT_JOINT
    }
  }

  // Waist and hips.
  if (len3(x - 0.08, y, z) - 0.3 < d) {
    k = sdCapsule(x, y, z, 0.28, 0, 0, 0.06, 0, 0, 0.092)
    if (k < d) {
      d = k
      m = MAT_JOINT
    }
    k = sdEllipsoid(x + 0.03, y, z, 0.095, 0.125, 0.2)
    if (k < d) {
      d = k
      m = MAT_STEEL
    }
  }

  const side = z < 0 ? -1 : 1
  const o = z < 0 ? 0 : JOINTS

  // Arm: shoulder ball, thin upper arm, heavy forearm, fist.
  if (len3(x - 0.17, y, z - side * 0.44) - 0.5 < d) {
    const sz = side * 0.37
    k = len3(x - 0.46, y, z - sz) - 0.118
    if (k < d) {
      d = k
      m = MAT_STEEL
    }
    k = sdCapsule(
      x,
      y,
      z,
      0.46,
      0,
      sz,
      joints[o],
      joints[o + 1],
      joints[o + 2],
      0.05
    )
    if (k < d) {
      d = k
      m = MAT_JOINT
    }
    k = Math.min(
      sdCapsule(
        x,
        y,
        z,
        joints[o],
        joints[o + 1],
        joints[o + 2],
        joints[o + 3],
        joints[o + 4],
        joints[o + 5],
        0.088
      ),
      len3(x - joints[o + 6], y - joints[o + 7], z - joints[o + 8]) - 0.097
    )
    if (k < d) {
      d = k
      m = MAT_STEEL
    }
  }

  // Leg: thin thigh, heavy shin, foot.
  if (len3(x + 0.5, y, z - side * 0.13) - 0.58 < d) {
    k = sdCapsule(
      x,
      y,
      z,
      -0.04,
      0,
      side * 0.105,
      joints[o + 9],
      joints[o + 10],
      joints[o + 11],
      0.06
    )
    if (k < d) {
      d = k
      m = MAT_JOINT
    }
    k = Math.min(
      sdCapsule(
        x,
        y,
        z,
        joints[o + 9],
        joints[o + 10],
        joints[o + 11],
        joints[o + 12],
        joints[o + 13],
        joints[o + 14],
        0.095
      ),
      sdEllipsoid(
        x - joints[o + 12] + 0.07,
        y - joints[o + 13] - 0.05,
        z - joints[o + 14],
        0.075,
        0.13,
        0.095
      )
    )
    if (k < d) {
      d = k
      m = MAT_STEEL
    }
  }

  hitMaterial = m
  return d
}

// Bounding box of the model in any pose, for skipping rays that miss it.
const BOX_MIN = [-1.02, -0.3, -0.68]
const BOX_MAX = [1.02, 0.3, 0.68]

/**
 * Rasterizes the Giant, all in one glyph: he is shaded by color alone.
 * `onCell` is called once per covered cell, in no particular order.
 */
export function rasterizeGiant(
  pose: GiantPose,
  raster: CellRaster,
  onCell: CellCallback
) {
  setLimbs(pose.flutter)
  const m = rotation(pose)
  // Ray direction (view -z) and light, both brought into model space.
  const dx = -m[6]
  const dy = -m[7]
  const dz = -m[8]
  // The moon: high on the left and a little behind him, so it rakes across
  // his top edges instead of lighting him flat.
  const lvx = -0.6
  const lvy = 0.76
  const lvz = 0.24
  const lx = m[0] * lvx + m[3] * lvy + m[6] * lvz
  const ly = m[1] * lvx + m[4] * lvy + m[7] * lvz
  const lz = m[2] * lvx + m[5] * lvy + m[8] * lvz

  const { originX, originY, scale, cellWidth, cellHeight } = raster
  const { col0, col1, row0, row1 } = cellWindow(raster, 1.25 * scale)
  const cols = Math.max(0, col1 - col0)
  const rows = Math.max(0, row1 - row0)
  const size = cols * rows
  if (!size) return
  if (colorBuffer.length < size) colorBuffer = new Int32Array(size * 2)
  colorBuffer.fill(-1, 0, size)

  const eps = (0.35 * Math.min(cellWidth, cellHeight)) / scale
  // Guard the divisions: an axis-aligned ray never crosses that pair of faces.
  const invDx = 1 / (dx || 1e-9)
  const invDy = 1 / (dy || 1e-9)
  const invDz = 1 / (dz || 1e-9)

  /** Entry and exit of a ray through the bounding box grown by `grow`. */
  let tNear = 0
  let tFar = 0
  const clip = (ox: number, oy: number, oz: number, grow: number) => {
    let t0 = (BOX_MIN[0] - grow - ox) * invDx
    let t1 = (BOX_MAX[0] + grow - ox) * invDx
    tNear = Math.min(t0, t1)
    tFar = Math.max(t0, t1)
    t0 = (BOX_MIN[1] - grow - oy) * invDy
    t1 = (BOX_MAX[1] + grow - oy) * invDy
    tNear = Math.max(tNear, Math.min(t0, t1))
    tFar = Math.min(tFar, Math.max(t0, t1))
    t0 = (BOX_MIN[2] - grow - oz) * invDz
    t1 = (BOX_MAX[2] + grow - oz) * invDz
    tNear = Math.max(tNear, Math.min(t0, t1))
    tFar = Math.min(tFar, Math.max(t0, t1))
    return tNear <= tFar && tFar >= 0
  }

  // Fine rays: one per cell, starting where the block's cone stopped.
  const shade = (col: number, row: number, tStart: number) => {
    const vy = -((row + 0.5) * cellHeight - originY) / scale
    const vx = ((col + 0.5) * cellWidth - originX) / scale
    const ox = m[0] * vx + m[3] * vy + m[6] * 3
    const oy = m[1] * vx + m[4] * vy + m[7] * 3
    const oz = m[2] * vx + m[5] * vy + m[8] * 3
    if (!clip(ox, oy, oz, 0)) return

    let t = Math.max(tNear, tStart, 0)
    let hit = false
    for (let i = 0; i < 72 && t < tFar; i++) {
      const d = map(ox + dx * t, oy + dy * t, oz + dz * t)
      if (d < eps) {
        hit = true
        break
      }
      t += d
    }
    if (!hit) return

    const px = ox + dx * t
    const py = oy + dy * t
    const pz = oz + dz * t
    map(px, py, pz)
    const material = hitMaterial
    const index = (row - row0) * cols + (col - col0)

    // The eyes: two round lamps on the face.
    if (material === MAT_HEAD && py > 0.045) {
      const ex = px - 0.865
      const ez = Math.abs(pz) - 0.058
      if (ex * ex + ez * ez < 0.04 * 0.04) {
        colorBuffer[index] = GIANT_EYE
        return
      }
    }

    // Tetrahedral normal: four samples instead of six.
    const e = 0.004
    const a1 = map(px + e, py - e, pz - e)
    const a2 = map(px - e, py - e, pz + e)
    const a3 = map(px - e, py + e, pz - e)
    const a4 = map(px + e, py + e, pz + e)
    const nx = a1 - a2 - a3 + a4
    const ny = -a1 - a2 + a3 + a4
    const nz = -a1 + a2 - a3 + a4
    const nl = len3(nx, ny, nz) || 1
    const ndl = (nx * lx + ny * ly + nz * lz) / nl
    const ndv = -(nx * dx + ny * dy + nz * dz) / nl
    // How far the surface faces the sky, which lights it faintly all over.
    const up = (m[3] * nx + m[4] * ny + m[5] * nz) / nl
    // Rim: edges turning away from us catch the moon, the lit side most.
    const rim =
      Math.pow(1 - Math.max(0, ndv), 3) * (0.35 + 0.65 * Math.max(0, ndl))
    const lum = Math.min(
      1,
      0.05 + 0.17 * (0.5 + 0.5 * up) + 0.6 * Math.max(0, ndl) + 0.55 * rim
    )
    // Cel bands: hard steps of tone, the way a painted cel is shaded.
    colorBuffer[index] =
      PALETTE[material][lum < 0.17 ? 0 : lum < 0.4 ? 1 : lum < 0.78 ? 2 : 3]
  }

  // Coarse pass: cone-trace one ray per block of cells. Rays are parallel, so
  // every ray in the block stays within `radius` of the center ray; while the
  // distance field exceeds that radius the whole block is provably empty.
  const BLOCK = 3
  const radius =
    (0.5 * Math.sqrt((BLOCK * cellWidth) ** 2 + (BLOCK * cellHeight) ** 2)) /
    scale
  for (let by = row0; by < row1; by += BLOCK) {
    for (let bx = col0; bx < col1; bx += BLOCK) {
      const vy = -((by + BLOCK / 2) * cellHeight - originY) / scale
      const vx = ((bx + BLOCK / 2) * cellWidth - originX) / scale
      const ox = m[0] * vx + m[3] * vy + m[6] * 3
      const oy = m[1] * vx + m[4] * vy + m[7] * 3
      const oz = m[2] * vx + m[5] * vy + m[8] * 3
      if (!clip(ox, oy, oz, radius)) continue
      const far = tFar

      let t = Math.max(tNear, 0)
      let occupied = false
      for (let i = 0; i < 48; i++) {
        if (t >= far) break
        const d = map(ox + dx * t, oy + dy * t, oz + dz * t)
        if (d <= radius * 1.05 || i === 47) {
          occupied = true
          break
        }
        t += d - radius
      }
      if (!occupied) continue

      for (let row = by; row < Math.min(row1, by + BLOCK); row++) {
        for (let col = bx; col < Math.min(col1, bx + BLOCK); col++) {
          shade(col, row, t)
        }
      }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = colorBuffer[r * cols + c]
      if (color < 0) continue
      // Drop strays: a lone glyph reads as noise, not as part of him.
      let neighbors = 0
      for (let y = Math.max(0, r - 1); y <= Math.min(rows - 1, r + 1); y++) {
        for (let x = Math.max(0, c - 1); x <= Math.min(cols - 1, c + 1); x++) {
          if (colorBuffer[y * cols + x] >= 0) neighbors++
        }
      }
      if (neighbors < 3) continue
      onCell(c + col0, r + row0, "#", color)
    }
  }
}

let colorBuffer = new Int32Array(0)

/** Screen-pixel offset of a model-space point from the model origin. */
export function projectGiantPoint(
  pose: GiantPose,
  scale: number,
  x: number,
  y: number,
  z: number
) {
  const m = rotation(pose)
  return {
    x: (m[0] * x + m[1] * y + m[2] * z) * scale,
    y: -(m[3] * x + m[4] * y + m[5] * z) * scale,
  }
}

/** Row-major 3×3 model→view rotation: roll, then lean, then heading. */
function rotation({ heading, lean, roll }: GiantPose) {
  const cr = Math.cos(roll)
  const sr = Math.sin(roll)
  const cl = Math.cos(lean)
  const sl = Math.sin(lean)
  const ch = Math.cos(heading)
  const sh = Math.sin(heading)
  // Lean · roll: the head (+x) swings toward the viewer (+z).
  const a = [cl, -sl * sr, -sl * cr, 0, cr, -sr, sl, cl * sr, cl * cr]
  // Heading: a turn in the plane of the screen.
  return [
    ch * a[0] - sh * a[3],
    ch * a[1] - sh * a[4],
    ch * a[2] - sh * a[5],
    sh * a[0] + ch * a[3],
    sh * a[1] + ch * a[4],
    sh * a[2] + ch * a[5],
    a[6],
    a[7],
    a[8],
  ]
}
