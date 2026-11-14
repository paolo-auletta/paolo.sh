/**
 * The 404's beach: the opening dream of 8½, looking down past Guido's ankle
 * at the man on the beach who holds the rope. Three layers baked by
 * scripts/404/bake.py (the beach, the leg cut out, a blue-noise map) are
 * composed in continuous tone every frame, then dithered to one bit:
 *
 * - The leg swings a little from the knee, just off-frame, on slow detuned
 *   sines, so it never repeats and never jerks.
 * - The rope is drawn live, from the cuff (which swings) to the hand (which
 *   doesn't). Pulled, it straightens and the leg drifts towards the hand.
 * - The dither thresholds against a fixed blue-noise map, so whatever isn't
 *   moving never changes and whatever moves glides; error diffusion would
 *   shimmer across the whole frame.
 * - Going home, Guido falls (`fall()`): the rope yanks, the frame spreads
 *   from beside the copy to the whole screen (left in landscape, up in
 *   portrait) as the beach rushes up at him and the leg tips out of frame,
 *   then, as in the film, the dream
 *   ends: the dots thin out to bare page. That bare page is the frame the
 *   homepage starts on when it is arrived at, before its paper draws back.
 *
 * The frame is mirrored, so the leg hangs in from the right. It fades into
 * the page where the copy is: from the left in landscape, from the top in
 * portrait.
 */

import { easeInOut, LEAVE_MS } from "@/components/paper-fill"

/** The baked frame's size, and points on it (mirrored). */
const FRAME = { width: 1280, height: 688 }
const CUFF = [940, 447] as const // where the rope leaves the turn-up
const HAND = [644, 250] as const // the man on the beach holding it
const BEND1 = [800, 432] as const
const BEND2 = [675, 420] as const
const KNEE = [1420, 980] as const // off-frame: the leg swings from here

/** The whole frame's grey range, leg included (printed by bake.py). */
const LEVELS = [16, 202] as const

/** CSS px per dot. */
const DOT = 2
const NOISE_SIZE = 128

/** Matches the copy's layout switch in not-found-page.tsx. */
export const LANDSCAPE_QUERY = "(min-aspect-ratio: 6/5)"

const PULL_ZOOM = 1.28

/** s: the whole fall, from the yank to bare page. */
const FALL_S = 1.4
/**
 * The part of the fall the beach takes to spread over the whole screen: as
 * long as the homepage's paper takes to spread over it when you leave.
 */
const SPREAD = LEAVE_MS / 1000 / FALL_S
/** CSS px: the cells the spread's wandering front is worked out on. */
const WANDER_CELL = 8
/** CSS px: how soft the beach's own edges are while it grows. */
const EDGE_FEATHER = 48

type Point = readonly [number, number]
type Assets = {
  beach: HTMLImageElement
  leg: HTMLImageElement
  noise: Float32Array
}
type Frame = {
  x: number
  y: number
  width: number
  height: number
  /** The hand, on screen: the zoom pulls in on it. */
  hand: Point
}
type Placement = Frame & {
  /**
   * The frame filling the whole screen, the hand kept where it is if it can
   * be: where the fall takes it. Landscape it spreads left over the copy's
   * side; portrait, up over it.
   */
  cover: Frame
  /** 0 (page) to 1 (frame), per dot column and row. */
  columns: Float32Array
  rows: Float32Array
  /**
   * The spread: a front that sets out from where the frame is solid at rest
   * and travels to the far corner, its edge wandering in long tongues and
   * shorter bays (the homepage paper's front), softened over `band` px.
   */
  spread: {
    /** The solid region's top-left corner, px: the front's distances run from it. */
    from: Point
    /** px from `from` to the screen's top-left corner. */
    far: number
    band: number
    /** How far the front wanders either way, px, per WANDER_CELL cell. */
    wander: Float32Array
    columns: number
  }
}

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const lerp = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
]
const ease = (dt: number, rate: number) => 1 - Math.exp(-dt * rate)
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))
const mix = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Where the fall is at `p` (0–1): the yank, the drop and the wake. Zooms are
 * multiples of the zoom the fall started from.
 */
function fallPose(p: number) {
  const yank = clamp01(p / 0.12)
  const drop = clamp01((p - 0.08) / 0.92) ** 2.2 // gravity: slow, then fast
  return {
    // The beach spreads to fill the screen as the fall gets going: the frame
    // grows first, the front that reveals it follows just behind.
    grow: easeInOut(clamp01(p / (SPREAD * 0.85))),
    front: easeInOut(clamp01((p - SPREAD * 0.1) / SPREAD)),
    // The leg jerks towards the hand, then tips up and out of frame.
    kick: 26 * (1 - (1 - yank) ** 3),
    tipX: 260 * drop,
    tipY: -520 * drop,
    tilt: 0.16 * drop,
    beachZoom: 1 + 7 * drop,
    legZoom: 1 + 0.5 * drop,
    shake: p < 0.16 ? 1 - p / 0.16 : 0,
    // What is left of the frame: it thins out to bare page at the end.
    veil: 1 - smoothstep(0.6, 0.98, p),
  }
}

/** Slow drift in -1..1: three detuned sines. */
function drift(t: number, seed: number) {
  const f = 0.55
  return (
    0.55 * Math.sin(f * t + seed) +
    0.3 * Math.sin(f * 1.73 * t + seed * 2.1) +
    0.15 * Math.sin(f * 2.91 * t + seed * 3.7)
  )
}

/**
 * Grey (0–255) to brightness: the frame's range, a gamma per theme, then
 * contrast for clean whites and blacks. On dark the sand thins out, so the
 * page stays dark and the leg reads as a silhouette.
 */
function toneCurve(dark: boolean) {
  const [lo, hi] = LEVELS
  const gamma = dark ? 2.1 : 0.9
  const [from, span] = dark ? [0.05, 0.9] : [0.12, 0.76]
  return new Float32Array(256).map((_, grey) => {
    const b = Math.min(1, Math.max(0, (grey - lo) / (hi - lo))) ** gamma
    return Math.min(1, Math.max(0, (b - from) / span))
  })
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })

let assets: Promise<Assets> | null = null

function loadAssets() {
  assets ??= Promise.all([
    loadImage("/404/beach.jpg"),
    loadImage("/404/leg.webp"),
    loadImage("/404/blue-noise.png"),
  ]).then(([beach, leg, noiseImage]) => {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = NOISE_SIZE
    const context = canvas.getContext("2d")!
    context.drawImage(noiseImage, 0, 0)
    const data = context.getImageData(0, 0, NOISE_SIZE, NOISE_SIZE).data
    const noise = new Float32Array(NOISE_SIZE * NOISE_SIZE)
    for (let i = 0; i < noise.length; i++) noise[i] = (data[i * 4] + 0.5) / 256
    return { beach, leg, noise }
  })
  assets.catch(() => {
    assets = null
  })
  return assets
}

/** A CSS colour as RGB, by painting it. */
function resolveColor(color: string): [number, number, number] {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })!
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

// Value noise and fbm, as in the homepage paper's shader.
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function valueNoise(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const top = mix(hash(ix, iy), hash(ix + 1, iy), ux)
  const bottom = mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), ux)
  return mix(top, bottom, uy)
}
function fbm(x: number, y: number) {
  let value = 0
  let amplitude = 0.5
  for (let i = 0; i < 4; i++) {
    value += amplitude * valueNoise(x, y)
    x = x * 2.03 + 17.1
    y = y * 2.03 + 9.7
    amplitude *= 0.5
  }
  return value
}

/**
 * Where the frame goes. It bleeds off the right and bottom; the hand stays
 * clear of the copy, and the frame shrinks if the screen is too narrow for
 * that at full height.
 */
function place(
  width: number,
  height: number,
  copy: DOMRect,
  landscape: boolean
): Placement {
  const aspect = FRAME.width / FRAME.height
  const gw = Math.ceil(width / DOT)
  const gh = Math.ceil(height / DOT)
  // [from, to]: the page below `from`, the frame past `to`; none when equal.
  let fadeX: [number, number] = [0, 0]
  let fadeY: [number, number] = [0, 0]
  let w: number, x: number
  if (landscape) {
    const from = copy.right + width * 0.02
    fadeX = [from, from + width * 0.2]
    // The hand sits 38% of the frame's width in from its right edge.
    const handMin = fadeX[1] + width * 0.03
    w = Math.min(height * aspect, (width - handMin) / 0.38)
    x = width - w * 0.88
  } else {
    // Tall enough to reach up under the copy, the hand just in from the left;
    // the trouser runs off the right edge, as it does in the film.
    const tall = (height - copy.bottom + height * 0.06) * aspect
    w = Math.max(tall, width / 0.55)
    x = Math.max(width * 0.12 - (w * HAND[0]) / FRAME.width, width - w)
  }
  const h = w / aspect
  const y = height - h
  if (y > 1) {
    const from = Math.max(y, landscape ? 0 : copy.bottom + height * 0.02)
    fadeY = [from, from + h * 0.22]
  }
  const fade = ([a, b]: [number, number], v: number) =>
    b > a ? smoothstep(a, b, v) : 1
  const columns = new Float32Array(gw).map((_, i) => {
    const v = (i + 0.5) * DOT
    return fade(fadeX, v) * fade([x, x + w * 0.12], v)
  })
  const rows = new Float32Array(gh).map((_, i) => fade(fadeY, (i + 0.5) * DOT))
  const hand: Point = [
    x + (w * HAND[0]) / FRAME.width,
    y + (h * HAND[1]) / FRAME.height,
  ]
  // Where the frame is solid at rest; the spread sets out from there. Its
  // front wanders by about a third of the way it has to go.
  const from: Point = [
    Math.max(0, landscape ? fadeX[1] : 0, x + w * 0.12),
    y > 1 ? fadeY[1] : 0,
  ]
  const far = Math.hypot(from[0], from[1])
  const amplitude = clamp(far * 0.8, 180, 360)
  const wanderColumns = Math.ceil(width / WANDER_CELL) + 1
  const wanderRows = Math.ceil(height / WANDER_CELL) + 1
  const wander = new Float32Array(wanderColumns * wanderRows)
  for (let row = 0; row < wanderRows; row++) {
    for (let column = 0; column < wanderColumns; column++) {
      const px = column * WANDER_CELL
      const py = row * WANDER_CELL
      wander[row * wanderColumns + column] =
        (fbm(px * 0.0028 + 21, py * 0.0028 + 21) -
          0.5 +
          (fbm(px * 0.009 + 33, py * 0.009 + 33) - 0.5) * 0.37) *
        amplitude
    }
  }

  const cw = Math.max(w, width, height * aspect)
  const ch = cw / aspect
  const cx = clamp(hand[0] - (cw * HAND[0]) / FRAME.width, width - cw, 0)
  const cy = clamp(hand[1] - (ch * HAND[1]) / FRAME.height, height - ch, 0)
  return {
    x,
    y,
    width: w,
    height: h,
    hand,
    cover: {
      x: cx,
      y: cy,
      width: cw,
      height: ch,
      hand: [
        cx + (cw * HAND[0]) / FRAME.width,
        cy + (ch * HAND[1]) / FRAME.height,
      ],
    },
    columns,
    rows,
    spread: {
      from,
      far: far + amplitude * 0.5,
      band: clamp(far * 0.2, 60, 180),
      wander,
      columns: wanderColumns,
    },
  }
}

export class Beach {
  private assets: Assets | null = null
  private placement: Placement | null = null
  private grid: {
    width: number
    height: number
    context: CanvasRenderingContext2D
    out: ImageData
  } | null = null
  private tone = toneCurve(false)
  private ink: [number, number, number] = [0, 0, 0]
  private dark: boolean | null = null

  private zoom = 1
  private zoomTarget = 1
  private pull = 0
  private pullTarget = 0
  private readonly seed = Math.random() * 100
  private falling: {
    start: number | null
    zoom: number
    landed: () => void
  } | null = null

  private frame = 0
  private last = 0
  private destroyed = false
  private readonly still: boolean
  private readonly landscape: MediaQueryList
  private readonly resizeObserver: ResizeObserver
  private readonly themeObserver: MutationObserver

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly copy: HTMLElement
  ) {
    this.still = matchMedia("(prefers-reduced-motion: reduce)").matches
    this.landscape = matchMedia(LANDSCAPE_QUERY)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    this.resizeObserver.observe(copy)
    this.themeObserver = new MutationObserver(() => this.redrawIfStill())
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    loadAssets().then((loaded) => {
      if (this.destroyed) return
      this.assets = loaded
      this.resize()
      if (!this.still) this.frame = requestAnimationFrame(this.tick)
    })
  }

  /** The link is hovered or focused: the man reels you in. */
  setPull(on: boolean) {
    this.pullTarget = on ? 1 : 0
    this.zoomTarget = on ? PULL_ZOOM : 1
  }

  /**
   * Guido falls, ending on bare page. Resolves once nothing of the beach is
   * left; at once with reduced motion.
   */
  fall() {
    if (this.still || !this.assets || this.destroyed) return Promise.resolve()
    if (this.falling) return Promise.resolve()
    return new Promise<void>((landed) => {
      this.falling = { start: null, zoom: this.zoom, landed }
    })
  }

  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.themeObserver.disconnect()
  }

  private tick = (now: number) => {
    const t = now / 1000
    const dt = Math.min(0.05, this.last ? t - this.last : 0)
    this.last = t
    this.zoom +=
      (this.zoomTarget - this.zoom) * ease(dt, this.zoomTarget > 2 ? 5 : 2.2)
    this.pull += (this.pullTarget - this.pull) * ease(dt, 2.6)
    const falling = this.falling
    if (falling) {
      falling.start ??= t
      const p = clamp01((t - falling.start) / FALL_S)
      this.draw(t, p)
      if (p === 1) falling.landed()
    } else {
      this.draw(t)
    }
    this.frame = requestAnimationFrame(this.tick)
  }

  private redrawIfStill() {
    if (this.still) this.draw(0)
  }

  private resize() {
    if (!this.assets) return
    const box = this.canvas.getBoundingClientRect()
    const copy = this.copy.getBoundingClientRect()
    const local = new DOMRect(
      copy.x - box.x,
      copy.y - box.y,
      copy.width,
      copy.height
    )
    const width = Math.ceil(box.width / DOT)
    const height = Math.ceil(box.height / DOT)
    if (!width || !height) return
    this.placement = place(box.width, box.height, local, this.landscape.matches)
    if (this.grid?.width !== width || this.grid.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
      const scratch = document.createElement("canvas")
      scratch.width = width
      scratch.height = height
      const context = scratch.getContext("2d", { willReadFrequently: true })!
      context.imageSmoothingQuality = "high"
      this.grid = { width, height, context, out: new ImageData(width, height) }
    }
    this.draw(this.last)
  }

  private syncTheme() {
    const dark = document.documentElement.classList.contains("dark")
    if (dark === this.dark) return
    this.dark = dark
    this.tone = toneCurve(dark)
    this.ink = resolveColor(getComputedStyle(this.canvas).color)
  }

  /** One frame at time `t`; `fallen` is how far Guido has fallen, if at all. */
  private draw(t: number, fallen?: number) {
    const { assets, placement, grid } = this
    if (!assets || !placement || !grid) return
    this.syncTheme()
    const { context, width, height } = grid
    const fall = fallen === undefined ? null : fallPose(fallen)
    const pull = fall ? 1 : this.pull

    // Falling, the frame grows from its place beside the copy to the whole
    // screen, and a wandering front reveals it as it goes (see the dither).
    const grow = fall?.grow ?? 0
    const { cover } = placement
    const frame: Frame = {
      x: mix(placement.x, cover.x, grow),
      y: mix(placement.y, cover.y, grow),
      width: mix(placement.width, cover.width, grow),
      height: mix(placement.height, cover.height, grow),
      hand: lerp(placement.hand, cover.hand, grow),
    }

    // Frame coordinates to dots, zoomed `k` about the hand. Falling, the beach
    // rushes up much faster than the leg, which stays with Guido.
    const [hx, hy] = frame.hand
    const shakeX = fall ? (Math.random() - 0.5) * 6 * fall.shake : 0
    const shakeY = fall ? (Math.random() - 0.5) * 6 * fall.shake : 0
    const frameToDots = (k: number) => ({
      x: (hx + (frame.x - hx) * k) / DOT + shakeX,
      y: (hy + (frame.y - hy) * k) / DOT + shakeY,
      sx: (frame.width * k) / FRAME.width / DOT,
      sy: (frame.height * k) / FRAME.height / DOT,
    })
    const zoom = fall ? this.falling!.zoom : this.zoom
    const beach = frameToDots(zoom * (fall?.beachZoom ?? 1))
    const legView = frameToDots(zoom * (fall?.legZoom ?? 1))
    const dots = (m: typeof beach, [px, py]: Point): Point => [
      m.x + px * m.sx,
      m.y + py * m.sy,
    ]

    // 1. Compose in continuous tone: beach, rope, leg.
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.fillStyle = "#fff"
    context.fillRect(0, 0, width, height)
    context.setTransform(beach.sx, 0, 0, beach.sy, beach.x, beach.y)
    context.drawImage(assets.beach, 0, 0)

    const sway = this.still ? 0 : 1
    const angle = 0.0095 * drift(t, this.seed) * sway + (fall?.tilt ?? 0)
    const toHand = Math.hypot(HAND[0] - CUFF[0], HAND[1] - CUFF[1])
    const reel = (7 * pull + (fall?.kick ?? 0)) / toHand
    const dx =
      2.2 * drift(t * 0.8, this.seed + 9) * sway +
      (HAND[0] - CUFF[0]) * reel +
      (fall?.tipX ?? 0)
    const dy =
      1.8 * drift(t * 0.9, this.seed + 23) * sway +
      (HAND[1] - CUFF[1]) * reel +
      (fall?.tipY ?? 0)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const swing = ([px, py]: Point): Point => {
      const ox = px - KNEE[0]
      const oy = py - KNEE[1]
      return [
        KNEE[0] + ox * cos - oy * sin + dx,
        KNEE[1] + ox * sin + oy * cos + dy,
      ]
    }

    // The rope, in dots: from the cuff (with the leg) to the hand (on the
    // beach). Its middle follows the cuff partway; pulled, it straightens.
    const cuffAt = swing(CUFF)
    const moved: Point = [cuffAt[0] - CUFF[0], cuffAt[1] - CUFF[1]]
    const cuff = dots(legView, cuffAt)
    const hand = dots(beach, HAND)
    const bend = (rest: Point, follow: number, along: number) =>
      lerp(
        dots(beach, [rest[0] + moved[0] * follow, rest[1] + moved[1] * follow]),
        lerp(cuff, hand, along),
        pull * 0.75
      )
    const b1 = bend(BEND1, 0.55, 1 / 3)
    const b2 = bend(BEND2, 0.15, 2 / 3)
    const scale = Math.sqrt(beach.sx * legView.sx)
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.lineCap = "round"
    context.beginPath()
    context.moveTo(...cuff)
    context.bezierCurveTo(...b1, ...b2, ...hand)
    // A pale rope with a soft shadow either side, enough to lift it off the sand.
    context.strokeStyle = "rgb(88, 88, 88)"
    context.lineWidth = (this.dark ? 7 : 8.5) * scale
    context.stroke()
    context.strokeStyle = "rgb(238, 238, 238)"
    context.lineWidth = (this.dark ? 4.5 : 5) * scale
    context.stroke()

    context.setTransform(legView.sx, 0, 0, legView.sy, legView.x, legView.y)
    context.translate(KNEE[0] + dx, KNEE[1] + dy)
    context.rotate(angle)
    context.translate(-KNEE[0], -KNEE[1])
    context.drawImage(assets.leg, 0, 0)

    // 2. One bit per dot, against the blue noise.
    const source = context.getImageData(0, 0, width, height).data
    const out = grid.out.data
    const { tone, dark } = this
    const { noise } = assets
    const { columns, rows } = placement
    const veil = fall?.veil ?? 1
    const [r, g, b] = this.ink

    // The spread's front, in dots: how far it has got, and how soft it is.
    const spread = placement.spread
    const front = fall?.front ?? 0
    const reach = mix(-spread.band, spread.far + spread.band, front) / DOT
    const band = spread.band / DOT
    const [fromX, fromY] = [spread.from[0] / DOT, spread.from[1] / DOT]
    const perCell = WANDER_CELL / DOT

    // While it grows, the beach's own edges stay soft wherever they are on
    // screen, so the picture never ends in a line.
    const feather = EDGE_FEATHER / DOT
    const left = beach.x
    const top = beach.y
    const right = beach.x + FRAME.width * beach.sx
    const bottom = beach.y + FRAME.height * beach.sy
    const edges = fall !== null

    for (let row = 0; row < height; row++) {
      const noiseRow = (row % NOISE_SIZE) * NOISE_SIZE
      const rowFade = rows[row]
      const dy = Math.max(fromY - row - 0.5, 0)
      const wanderRow = ((row / perCell) | 0) * spread.columns
      let rowEdge = Infinity
      if (edges) {
        if (top > 0) rowEdge = row + 0.5 - top
        if (bottom < height) rowEdge = Math.min(rowEdge, bottom - row - 0.5)
      }
      for (let column = 0; column < width; column++) {
        const i = row * width + column
        const o = i * 4
        let fade = columns[column] * rowFade
        if (front > 0) {
          const dx = Math.max(fromX - column - 0.5, 0)
          const ahead =
            reach -
            Math.sqrt(dx * dx + dy * dy) +
            spread.wander[wanderRow + ((column / perCell) | 0)] / DOT
          fade = Math.max(fade, smoothstep(-band, band, ahead))
        }
        if (edges) {
          let inside = rowEdge
          if (left > 0) inside = Math.min(inside, column + 0.5 - left)
          if (right < width) inside = Math.min(inside, right - column - 0.5)
          if (inside < feather) fade *= smoothstep(0, feather, inside)
        }
        fade *= veil
        const bright = tone[source[o]]
        const value = dark ? bright * fade : 1 - (1 - bright) * fade
        const lit = value > noise[noiseRow + (column % NOISE_SIZE)]
        if (lit === dark) {
          out[o] = r
          out[o + 1] = g
          out[o + 2] = b
          out[o + 3] = 255
        } else {
          out[o + 3] = 0
        }
      }
    }
    this.canvas.getContext("2d")!.putImageData(grid.out, 0, 0)
  }
}
