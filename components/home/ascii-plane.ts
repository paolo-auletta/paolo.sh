/**
 * A tiny signed-distance model of a red flying boat (an homage to Porco
 * Rosso's seaplane), ray-marched into a grid of ASCII characters.
 *
 * Pure math, no DOM: the caller supplies a pose and a cell grid and gets a
 * callback per covered cell with the glyph and its color.
 *
 * Model space: +x is the nose, +y is up, +z is the right wing. One unit is
 * roughly half the hull length.
 */

export type PlanePose = {
  /** Heading. 0 = nose to screen-right, +π/2 = nose toward the viewer. */
  yaw: number
  /** Nose up is positive. */
  pitch: number
  /** Right wing down (a right bank) is positive. */
  roll: number
  /** How far we look down onto the plane from above. */
  tilt: number
  /** Propeller phase, radians. */
  prop: number
}

export type PlaneRaster = {
  /** Screen-pixel position of the model origin. */
  originX: number
  originY: number
  /** Screen pixels per model unit. */
  scale: number
  /** Cell grid, aligned to screen pixel (0, 0). */
  cellWidth: number
  cellHeight: number
  /** Visible region in screen pixels; cells outside it are skipped. */
  viewWidth: number
  viewHeight: number
  /** Glyphs from least to most lit. */
  ramp?: string
}

export type CellCallback = (
  col: number,
  row: number,
  glyph: string,
  color: number
) => void

/**
 * Glyph ramp, sparsest to densest. A single glyph by default: the plane is
 * shaded by color alone, which reads as a solid little sprite.
 */
const RAMP = "#"

// Materials ------------------------------------------------------------------

const MAT_BODY = 0
const MAT_DARK = 1
const MAT_CREAM = 2
const MAT_GREEN = 3
const MAT_WHITE = 4
const MAT_PILOT = 5
const MAT_PROP = 6

/**
 * Each material has three cel-shaded tones: shadow, base, highlight. Colors are
 * packed 0xRRGGBB so the caller can bucket draws by color cheaply.
 */
const PALETTE: [number, number, number][] = [
  [0x8a130c, 0xd8281a, 0xff6b4a], // body red
  [0x4a100c, 0x6e1a12, 0x9a3020], // struts, dark red
  [0xb59a62, 0xf1e2b0, 0xfff8e2], // spinner cream
  [0x24602a, 0x3f9a3a, 0x86d07a], // tricolor green
  [0xa9b4b4, 0xf3f1e8, 0xffffff], // tricolor white
  [0x7a5432, 0xc49a68, 0xf0d2a4], // pilot
  [0x3a2a24, 0x5a4034, 0x8a6a58], // propeller blades
]

// Shared scratch state (keeps the hot loop allocation-free) ------------------

let hitMaterial = MAT_BODY

// Math.hypot is slow in V8; these are the hot path.
function len2(x: number, y: number) {
  return Math.sqrt(x * x + y * y)
}

function len3(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z)
}

// SDF primitives ---------------------------------------------------------------

export function sdEllipsoid(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number
) {
  const k0 = len3(x / rx, y / ry, z / rz)
  const k1 = len3(x / (rx * rx), y / (ry * ry), z / (rz * rz))
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1
}

export function sdCapsule(
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  r: number
) {
  const pax = px - ax
  const pay = py - ay
  const paz = pz - az
  const bax = bx - ax
  const bay = by - ay
  const baz = bz - az
  const h = Math.min(
    1,
    Math.max(
      0,
      (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)
    )
  )
  return len3(pax - bax * h, pay - bay * h, paz - baz * h) - r
}

/** Round cone between two points along the x axis (Inigo Quilez). */
export function sdRoundCone(
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  r1: number,
  bx: number,
  by: number,
  r2: number
) {
  const bax = bx - ax
  const bay = by - ay
  const l2 = bax * bax + bay * bay
  const rr = r1 - r2
  const a2 = l2 - rr * rr
  const il2 = 1 / l2

  const pax = px - ax
  const pay = py - ay
  const paz = pz
  const y = pax * bax + pay * bay
  const z = y - l2
  const qx = pax * l2 - bax * y
  const qy = pay * l2 - bay * y
  const qz = paz * l2
  const x2 = qx * qx + qy * qy + qz * qz
  const y2 = y * y * l2
  const z2 = z * z * l2
  const k = Math.sign(rr) * rr * rr * x2
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1
}

/** A 2D rounded rectangle extruded along the third axis. */
function sdSlab(
  u: number,
  v: number,
  w: number,
  hu: number,
  hv: number,
  radius: number,
  thickness: number
) {
  const qu = Math.abs(u) - hu + radius
  const qv = Math.abs(v) - hv + radius
  const d2 =
    Math.min(Math.max(qu, qv), 0) +
    len2(Math.max(qu, 0), Math.max(qv, 0)) -
    radius
  const dw = Math.abs(w) - thickness
  return Math.min(Math.max(d2, dw), 0) + len2(Math.max(d2, 0), Math.max(dw, 0))
}

// The model --------------------------------------------------------------------

// Propeller disc, in model space.
const PROP_X = 0.62
const PROP_Y = 0.36
const PROP_RADIUS = 0.27

function map(x: number, y: number, z: number) {
  const az = Math.abs(z)
  let d = sdRoundCone(x, y, z, 0.68, 0, 0.165, -0.96, 0.08, 0.035)
  let m = MAT_BODY

  // Wing: a straight, round-tipped wing through the hull's shoulder.
  let k = sdSlab(x - 0.16, z, y - 0.06, 0.17, 1.24, 0.13, 0.016)
  if (k < d) {
    d = k
    m = MAT_BODY
  }

  // Each group below sits inside a bounding sphere; when the sphere is
  // already farther than the nearest surface, the group can't win and its
  // primitives are skipped. This keeps the march cheap.

  // Engine nacelle perched above the wing, with its cowling hump and spinner.
  if (len3(x - 0.2, y - 0.38, z) - 0.47 < d) {
    k = sdEllipsoid(x - 0.2, y - 0.36, z, 0.36, 0.1, 0.105)
    k = Math.min(k, sdEllipsoid(x - 0.12, y - 0.43, z, 0.17, 0.055, 0.065))
    if (k < d) {
      d = k
      m = MAT_BODY
    }

    k = sdEllipsoid(x - 0.56, y - PROP_Y, z, 0.075, 0.048, 0.048)
    if (k < d) {
      d = k
      m = MAT_CREAM
    }
  }

  // Struts from the wing up to the nacelle.
  if (len3(x - 0.17, y - 0.18, z) - 0.22 < d) {
    k = Math.min(
      sdCapsule(x, y, az, 0.3, 0.07, 0.1, 0.26, 0.29, 0.05, 0.014),
      sdCapsule(x, y, az, 0.04, 0.07, 0.1, 0.1, 0.29, 0.05, 0.014)
    )
    if (k < d) {
      d = k
      m = MAT_DARK
    }
  }

  // Wingtip floats on their struts.
  if (len3(x - 0.2, y + 0.04, az - 0.9) - 0.22 < d) {
    k = sdCapsule(x, y, az, 0.2, -0.08, 0.9, 0.2, 0.05, 0.9, 0.012)
    if (k < d) {
      d = k
      m = MAT_DARK
    }

    k = sdEllipsoid(x - 0.2, y + 0.1, az - 0.9, 0.17, 0.04, 0.045)
    if (k < d) {
      d = k
      m = MAT_BODY
    }
  }

  // Tail: the tricolor fin and a stabilizer set halfway up it.
  if (len3(x + 0.92, y - 0.23, z) - 0.39 < d) {
    k = sdSlab(x + 0.93, y - 0.25, z, 0.11, 0.19, 0.085, 0.012)
    if (k < d) {
      d = k
      m = x > -0.893 ? MAT_GREEN : x > -0.967 ? MAT_WHITE : MAT_BODY
    }

    k = sdSlab(x + 0.92, z, y - 0.2, 0.09, 0.36, 0.08, 0.012)
    if (k < d) {
      d = k
      m = MAT_BODY
    }
  }

  // Pilot's head peeking out of the cockpit.
  k = len3(x + 0.1, y - 0.19, z) - 0.055
  if (k < d) {
    d = k
    m = MAT_PILOT
  }

  hitMaterial = m
  return d
}

// Bounding box of the model, for skipping rays that cannot hit anything.
const BOX_MIN = [-1.1, -0.18, -1.32]
const BOX_MAX = [0.95, 0.66, 1.32]

/**
 * Rasterizes the plane. `onCell` is called once per covered cell, in no
 * particular order. Returns the number of covered cells.
 */
export function rasterizePlane(
  pose: PlanePose,
  raster: PlaneRaster,
  onCell: CellCallback
) {
  // Model → view rotation: tilt · yaw · pitch · roll.
  const m = rotation(pose)
  // Ray direction (view -z) and light, both brought into model space.
  const dx = -m[6]
  const dy = -m[7]
  const dz = -m[8]
  const lvx = -0.38
  const lvy = 0.82
  const lvz = 0.44
  const lx = m[0] * lvx + m[3] * lvy + m[6] * lvz
  const ly = m[1] * lvx + m[4] * lvy + m[7] * lvz
  const lz = m[2] * lvx + m[5] * lvy + m[8] * lvz

  const { originX, originY, scale, cellWidth, cellHeight } = raster
  const ramp = raster.ramp ?? RAMP
  const reach = 1.75 * scale
  const col0 = Math.max(0, Math.floor((originX - reach) / cellWidth))
  const col1 = Math.min(
    Math.ceil(raster.viewWidth / cellWidth),
    Math.ceil((originX + reach) / cellWidth)
  )
  const row0 = Math.max(0, Math.floor((originY - reach) / cellHeight))
  const row1 = Math.min(
    Math.ceil(raster.viewHeight / cellHeight),
    Math.ceil((originY + reach) / cellHeight)
  )

  const eps = (0.35 * Math.min(cellWidth, cellHeight)) / scale
  const invDx = 1 / dx
  const invDy = 1 / dy
  const invDz = 1 / dz

  // Propeller disc: plane x = PROP_X in model space.
  const propBlade = pose.prop

  // Buffer the grid so a second pass can drop stray cells.
  const cols = Math.max(0, col1 - col0)
  const rows = Math.max(0, row1 - row0)
  const size = cols * rows
  if (glyphBuffer.length < size) {
    glyphBuffer = new Uint16Array(size * 2)
    colorBuffer = new Int32Array(size * 2)
  }
  glyphBuffer.fill(0, 0, size)

  // Fine rays: one per cell, starting where the block's cone stopped.
  const shade = (col: number, row: number, tStart: number) => {
    const vy = -((row + 0.5) * cellHeight - originY) / scale
    const vx = ((col + 0.5) * cellWidth - originX) / scale
    // Ray origin in front of the model, in model space.
    const vz = 3
    const ox = m[0] * vx + m[3] * vy + m[6] * vz
    const oy = m[1] * vx + m[4] * vy + m[7] * vz
    const oz = m[2] * vx + m[5] * vy + m[8] * vz

    // Slab test against the bounding box.
    let t0 = (BOX_MIN[0] - ox) * invDx
    let t1 = (BOX_MAX[0] - ox) * invDx
    let tNear = Math.min(t0, t1)
    let tFar = Math.max(t0, t1)
    t0 = (BOX_MIN[1] - oy) * invDy
    t1 = (BOX_MAX[1] - oy) * invDy
    tNear = Math.max(tNear, Math.min(t0, t1))
    tFar = Math.min(tFar, Math.max(t0, t1))
    t0 = (BOX_MIN[2] - oz) * invDz
    t1 = (BOX_MAX[2] - oz) * invDz
    tNear = Math.max(tNear, Math.min(t0, t1))
    tFar = Math.min(tFar, Math.max(t0, t1))
    if (tNear > tFar || tFar < 0) return

    // March.
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

    const index = (row - row0) * cols + (col - col0)

    // Propeller disc in front of whatever we hit (or nothing).
    const tp = (PROP_X - ox) * invDx
    if (tp > 0 && (!hit || tp < t)) {
      const py = oy + dy * tp - PROP_Y
      const pz = oz + dz * tp
      const r = len2(py, pz)
      if (r < PROP_RADIUS && r > 0.05) {
        const a = Math.atan2(pz, py)
        const blade = angularDistance(a, propBlade, Math.PI)
        if (blade < 0.22) {
          // Pick a stroke that follows the blade's direction on screen.
          const by = Math.cos(propBlade)
          const bz = Math.sin(propBlade)
          const sx = m[1] * by + m[2] * bz
          const sy = m[4] * by + m[5] * bz
          glyphBuffer[index] = strokeGlyph(sx, sy).charCodeAt(0)
          colorBuffer[index] = PALETTE[MAT_PROP][1]
          return
        }
      }
    }

    if (!hit) return

    // Shade the hit.
    const px = ox + dx * t
    const py = oy + dy * t
    const pz = oz + dz * t
    map(px, py, pz)
    const material = hitMaterial
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
    // Rim: normals facing away from the viewer catch a little light.
    const ndv = -(nx * dx + ny * dy + nz * dz) / nl
    const lum = Math.min(
      1,
      Math.max(0, 0.1 + 0.78 * Math.max(0, ndl) + 0.14 * (1 - ndv))
    )

    // Cel bands: most of the plane sits in its base tone, with shadow
    // underneath and highlights only where the light glints.
    const tones = PALETTE[material]
    const tone = lum < 0.4 ? 0 : lum < 0.9 ? 1 : 2
    glyphBuffer[index] = ramp.charCodeAt(
      Math.min(ramp.length - 1, (lum * ramp.length) | 0)
    )
    colorBuffer[index] = tones[tone]
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

      // Slab test against the box grown by the block radius.
      let t0 = (BOX_MIN[0] - radius - ox) * invDx
      let t1 = (BOX_MAX[0] + radius - ox) * invDx
      let tNear = Math.min(t0, t1)
      let tFar = Math.max(t0, t1)
      t0 = (BOX_MIN[1] - radius - oy) * invDy
      t1 = (BOX_MAX[1] + radius - oy) * invDy
      tNear = Math.max(tNear, Math.min(t0, t1))
      tFar = Math.min(tFar, Math.max(t0, t1))
      t0 = (BOX_MIN[2] - radius - oz) * invDz
      t1 = (BOX_MAX[2] + radius - oz) * invDz
      tNear = Math.max(tNear, Math.min(t0, t1))
      tFar = Math.min(tFar, Math.max(t0, t1))
      if (tNear > tFar || tFar < 0) continue

      let t = Math.max(tNear, 0)
      let occupied = false
      for (let i = 0; i < 48; i++) {
        if (t >= tFar) break
        const d = map(ox + dx * t, oy + dy * t, oz + dz * t)
        if (d <= radius * 1.05 || i === 47) {
          occupied = true
          break
        }
        t += d - radius
      }

      // The propeller disc isn't in the distance field; check it directly.
      const tp = (PROP_X - ox) * invDx
      const nearProp =
        tp > 0 &&
        len2(oy + dy * tp - PROP_Y, oz + dz * tp) < PROP_RADIUS + radius * 2
      if (!occupied && !nearProp) continue

      const tStart = occupied ? t : Infinity
      for (let row = by; row < Math.min(row1, by + BLOCK); row++) {
        for (let col = bx; col < Math.min(col1, bx + BLOCK); col++) {
          shade(
            col,
            row,
            nearProp ? Math.min(tStart, Math.max(0, tNear)) : tStart
          )
        }
      }
    }
  }

  let covered = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c
      const glyph = glyphBuffer[index]
      if (!glyph) continue
      // Drop strays: a lone glyph reads as noise, not as part of the plane.
      let neighbors = 0
      for (let y = Math.max(0, r - 1); y <= Math.min(rows - 1, r + 1); y++) {
        for (let x = Math.max(0, c - 1); x <= Math.min(cols - 1, c + 1); x++) {
          if (glyphBuffer[y * cols + x]) neighbors++
        }
      }
      if (neighbors < 3) continue

      onCell(c + col0, r + row0, String.fromCharCode(glyph), colorBuffer[index])
      covered++
    }
  }

  return covered
}

let glyphBuffer = new Uint16Array(0)
let colorBuffer = new Int32Array(0)

/** Screen-pixel offset of a model-space point from the model origin. */
export function projectPoint(
  pose: PlanePose,
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

function angularDistance(a: number, b: number, period: number) {
  let d = (a - b) % period
  if (d < 0) d += period
  return Math.min(d, period - d)
}

function strokeGlyph(sx: number, sy: number) {
  const a = Math.atan2(sy, sx)
  const s = ((a % Math.PI) + Math.PI) % Math.PI // fold to [0, π)
  if (s < Math.PI / 8 || s > (7 * Math.PI) / 8) return "-"
  if (s < (3 * Math.PI) / 8) return "/"
  if (s < (5 * Math.PI) / 8) return "|"
  return "\\"
}

/** Row-major 3×3 model→view rotation for a pose. */
function rotation({ yaw, pitch, roll, tilt }: PlanePose) {
  const cr = Math.cos(roll)
  const sr = Math.sin(roll)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)

  // Roll about x.
  let a = [1, 0, 0, 0, cr, -sr, 0, sr, cr]
  // Pitch about z.
  a = mul([cp, -sp, 0, sp, cp, 0, 0, 0, 1], a)
  // Yaw: nose (+x) swings toward the viewer (+z) for positive angles.
  a = mul([cy, 0, -sy, 0, 1, 0, sy, 0, cy], a)
  // Tilt about x so we look down onto the top surfaces.
  return mul([1, 0, 0, 0, ct, -st, 0, st, ct], a)
}

function mul(a: number[], b: number[]) {
  const out = new Array<number>(9)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] =
        a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]
    }
  }
  return out
}
