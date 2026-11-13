/**
 * What the homepage's two ray-marched ASCII figures (the day's seaplane and
 * the night's Giant) share: the distance-field primitives they are built
 * from, the cell grid they are drawn into, and how a caller collects the
 * cells. Pure math, no DOM.
 */

/** The cell grid a figure is rasterized into, in screen pixels. */
export type CellRaster = {
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
}

export type CellCallback = (
  col: number,
  row: number,
  glyph: string,
  color: number
) => void

/**
 * The cells a figure reaching `reach` px from its origin can cover, clipped
 * to the view: columns [col0, col1) and rows [row0, row1).
 */
export function cellWindow(raster: CellRaster, reach: number) {
  const { originX, originY, cellWidth, cellHeight } = raster
  return {
    col0: Math.max(0, Math.floor((originX - reach) / cellWidth)),
    col1: Math.min(
      Math.ceil(raster.viewWidth / cellWidth),
      Math.ceil((originX + reach) / cellWidth)
    ),
    row0: Math.max(0, Math.floor((originY - reach) / cellHeight)),
    row1: Math.min(
      Math.ceil(raster.viewHeight / cellHeight),
      Math.ceil((originY + reach) / cellHeight)
    ),
  }
}

/**
 * Empties `buckets` (keeping each color's array, and its place in the map)
 * and returns a cell callback that files cells into it by color: col, row
 * and char code, repeated. Drawing one color at a time saves the canvas
 * from switching fill styles per glyph.
 */
export function bucketCells(buckets: Map<number, number[]>): CellCallback {
  for (const cells of buckets.values()) cells.length = 0
  return (col, row, glyph, color) => {
    let cells = buckets.get(color)
    if (!cells) {
      cells = []
      buckets.set(color, cells)
    }
    cells.push(col, row, glyph.charCodeAt(0))
  }
}

// Math.hypot is slow in V8; these are the hot path.
export function len2(x: number, y: number) {
  return Math.sqrt(x * x + y * y)
}

export function len3(x: number, y: number, z: number) {
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
export function sdSlab(
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
