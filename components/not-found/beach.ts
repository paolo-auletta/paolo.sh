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
 * - Going home, Guido falls (`fall()`), in one motion. The rope yanks, and
 *   from then on the beach only ever comes up faster: the yank gives the
 *   fall its speed, gravity adds to it. Meanwhile the beach spreads over the
 *   whole screen the way the homepage's paper does (left in landscape, up in
 *   portrait), the leg tips out of frame, and, as in the film, the dream
 *   ends: the dots thin out to bare page. That bare page is the frame the
 *   homepage starts on when it is arrived at, before its paper draws back.
 *
 * The frame is mirrored, so the leg hangs in from the right. It fades into
 * the page where the copy is: from the left in landscape, from the top in
 * portrait.
 */

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
/** Of the fall: the rope going taut. */
const YANK = 0.1
/** How many times nearer the beach is when the page goes bare. */
const DIVE = 12
/** How much of the way down the yank's speed alone would take Guido. */
const PULL = 0.75
/**
 * Of the fall: by when the beach has spread over the whole screen. The fall
 * has grown it FILL_SCALE by then.
 */
const FILL_AT = 0.45

// The spread is the homepage paper's (uFill in components/home/paper.ts): a
// front that wanders in long tongues and shorter bays, thickening through
// soft clumps across a wide band, never along a line. All CSS px.
const FRONT_BAND = 260
/** How far short of the frame's faded edge the front starts... */
const FRONT_LEAD = 140
/** ...and how far past the screen's far corner it ends. */
const FRONT_PAD = 480
/** The cells the front's wander and clumps are worked out on. */
const FIELD_CELL = 6
/** How soft the beach's own edges are while it grows, and how far they wander. */
const EDGE_FEATHER = 70
const EDGE_WANDER = 0.3

type Point = readonly [number, number]
type Assets = {
  beach: HTMLImageElement
  leg: HTMLImageElement
  noise: Float32Array
}
type Placement = {
  x: number
  y: number
  width: number
  height: number
  /** The hand, on screen: the zoom pulls in on it. */
  hand: Point
  /**
   * Where the hand ends up as Guido falls, once the beach has grown `grown`
   * times: no farther than it must for the beach to fill the screen.
   * Nowhere, in landscape; up, in portrait, where the beach at rest is a
   * band along the bottom and grows up out of it.
   */
  dive: Point
  grown: number
  /** 0 (page) to 1 (frame), per dot column and row. */
  columns: Float32Array
  rows: Float32Array
  /** Where the frame starts to show at rest: the spread sets out from there. */
  shown: Point
}
/** The spread's front, per FIELD_CELL cell. */
type Field = {
  /** px: how far the front runs ahead here, or lags. */
  wander: Float32Array
  /** 0–1: how soon the beach thickens here once the front arrives. */
  clumps: Float32Array
  columns: number
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
/** Follows `u` up to a half, then eases in to rest on 1: never ahead of `u`. */
const settle = (u: number) =>
  u <= 0.5 ? Math.max(0, u) : u >= 1.5 ? 1 : 1 - (1.5 - u) ** 2 / 2

/**
 * How high Guido still is at `p` (0–1) of the fall: 1 at the yank, 1/DIVE
 * when the page goes bare. The yank's speed comes on over YANK and gravity
 * adds to it, so the beach, which grows as one over the height, comes up
 * faster at every moment and never eases off.
 */
function heightAt(p: number) {
  const pulled =
    p < YANK ? p ** 3 / YANK ** 2 - p ** 4 / (2 * YANK ** 3) : p - YANK / 2
  const gravity = 1 - 1 / DIVE - PULL * (1 - YANK / 2)
  return 1 - PULL * pulled - gravity * p * p
}

/** How much the beach has grown by the time it must fill the screen. */
const FILL_SCALE = 1 / heightAt(FILL_AT)

/**
 * Where the fall is at `p` (0–1): the yank, the drop and the wake. Zooms are
 * multiples of the zoom the fall started from.
 */
function fallPose(p: number) {
  const yank = clamp01(p / YANK)
  const height = heightAt(p)
  const fallen = (1 - height) / (1 - 1 / DIVE)
  // The leg leaves with the fall, a little behind it.
  const tip = fallen ** 1.7
  const t = p * FALL_S
  return {
    beachZoom: 1 / height,
    // The spread's front moves with the fall: off at the yank, and faster
    // all the way across, so it is the falling that opens the beach up.
    front: clamp01((1 / height - 1) / (FILL_SCALE - 1)),
    // The beach's edges soften as it starts to grow.
    edges: smoothstep(0, YANK, p),
    // The leg jerks towards the hand, then tips up and out of frame.
    kick: 26 * (1 - (1 - yank) ** 3),
    tipX: 260 * tip,
    tipY: -520 * tip,
    tilt: 0.16 * tip,
    legZoom: 1 + 0.5 * tip,
    // The rope's jolt: one tug along the rope that rings out, px.
    jolt: 5 * Math.exp(-t / 0.09) * Math.sin(t * 2 * Math.PI * 11),
    // What is left of the frame: it thins out to bare page at the end.
    veil: 1 - smoothstep(0.64, 1, p),
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
  // By FILL_AT the fall has grown the beach FILL_SCALE. If that would not
  // cover the screen from where the hand is, the hand moves as the beach
  // grows (see `draw`), and the screen is full once it has grown enough.
  const grown = Math.max(FILL_SCALE, width / w, height / h)
  const fx = HAND[0] / FRAME.width
  const fy = HAND[1] / FRAME.height
  const dive: Point = [
    clamp(hand[0], width - w * grown * (1 - fx), w * grown * fx),
    clamp(hand[1], height - h * grown * (1 - fy), h * grown * fy),
  ]
  return {
    x,
    y,
    width: w,
    height: h,
    hand,
    dive,
    grown,
    columns,
    rows,
    shown: [Math.max(0, landscape ? fadeX[0] : 0, x), y > 1 ? fadeY[0] : 0],
  }
}

/** The spread's front for a screen this size: the homepage paper's noise. */
function frontField(width: number, height: number): Field {
  const columns = Math.ceil(width / FIELD_CELL) + 1
  const rows = Math.ceil(height / FIELD_CELL) + 1
  const wander = new Float32Array(columns * rows)
  const clumps = new Float32Array(columns * rows)
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const px = column * FIELD_CELL
      const py = row * FIELD_CELL
      const i = row * columns + column
      wander[i] =
        (fbm(px * 0.0028 + 21, py * 0.0028 + 21) - 0.5) * 300 +
        (fbm(px * 0.009 + 33, py * 0.009 + 33) - 0.5) * 110
      clumps[i] = fbm(px * 0.006 + 40, py * 0.006 + 40)
    }
  }
  return { wander, clumps, columns }
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
  /** The spread's front: worked out when the fall is first in the offing. */
  private field: Field | null = null
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
    if (on) this.frontField()
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
      this.field = null
    }
    this.draw(this.last)
  }

  private frontField() {
    if (!this.grid || this.still) return null
    this.field ??= frontField(this.grid.width * DOT, this.grid.height * DOT)
    return this.field
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

    // Frame coordinates to dots, zoomed `k` about the hand. Falling, the
    // beach rushes up much faster than the leg, which stays with Guido, and
    // the rope's jolt runs through both. The hand moves to where the beach
    // can fill the screen, in step with how much the beach has grown: the
    // edges that bleed off the screen at rest (the bottom, in portrait)
    // never come into it, so the beach grows out of them, then the hand
    // eases to a stop and the fall closes in on it.
    const zoom = fall ? this.falling!.zoom : this.zoom
    const [hx, hy] = placement.hand
    const [ax, ay] = fall
      ? lerp(
          placement.hand,
          placement.dive,
          settle(
            (fall.beachZoom - 1) / Math.max(placement.grown / zoom - 1, 0.05)
          )
        )
      : placement.hand
    const along = Math.hypot(CUFF[0] - HAND[0], CUFF[1] - HAND[1])
    const joltX = ((fall?.jolt ?? 0) * (CUFF[0] - HAND[0])) / along / DOT
    const joltY = ((fall?.jolt ?? 0) * (CUFF[1] - HAND[1])) / along / DOT
    const frameToDots = (k: number) => ({
      x: (ax + (placement.x - hx) * k) / DOT + joltX,
      y: (ay + (placement.y - hy) * k) / DOT + joltY,
      sx: (placement.width * k) / FRAME.width / DOT,
      sy: (placement.height * k) / FRAME.height / DOT,
    })
    const beach = frameToDots(zoom * (fall?.beachZoom ?? 1))
    if (fall) {
      // The beach bleeds off the right and bottom at rest; the jolt must not
      // pull those edges into view.
      beach.x = Math.max(beach.x, width - FRAME.width * beach.sx)
      beach.y = Math.max(beach.y, height - FRAME.height * beach.sy)
    }
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

    // Falling, the frame spreads over the page behind the paper's front: it
    // sets out from where the frame starts to show at rest, for the far
    // corner, so the faded edge thickens first and the rest follows.
    const field = fall ? this.frontField() : null
    const front = fall?.front ?? 0
    const spreading = field !== null && front > 0 && front < 1
    const [shownX, shownY] = placement.shown
    const reach = mix(
      -FRONT_LEAD,
      Math.hypot(shownX, shownY) + FRONT_PAD,
      front
    )
    // The front sets out straight, and takes up its wander as it goes.
    const wandering = smoothstep(0, 0.25, front)
    const perCell = FIELD_CELL / DOT

    // While the beach grows to fill the screen, the edges it has on screen
    // (the left and the top; it bleeds off the others) are soft and wander
    // too, so the picture never ends in a line.
    const edges = field !== null && fall ? fall.edges : 0
    const left = beach.x
    const top = beach.y
    // dots: past this an edge is out of sight, wander and all.
    const edgeReach = (EDGE_FEATHER + 205 * EDGE_WANDER) / DOT
    const edged = edges > 0 && (left > -edgeReach || top > -edgeReach)

    for (let row = 0; row < height; row++) {
      const noiseRow = (row % NOISE_SIZE) * NOISE_SIZE
      const rowFade = rows[row]
      const dy = Math.max(shownY - (row + 0.5) * DOT, 0)
      const cellRow = field ? ((row / perCell) | 0) * field.columns : 0
      const rowInset = row + 0.5 - top
      for (let column = 0; column < width; column++) {
        const i = row * width + column
        const o = i * 4
        let fade = columns[column] * rowFade
        if (front >= 1) {
          fade = 1
        } else if (spreading) {
          const cell = cellRow + ((column / perCell) | 0)
          const dx = Math.max(shownX - (column + 0.5) * DOT, 0)
          const ahead =
            reach -
            Math.sqrt(dx * dx + dy * dy) +
            field.wander[cell] * wandering
          const density = smoothstep(-FRONT_BAND, FRONT_BAND, ahead) * 1.6 - 0.3
          const clump = field.clumps[cell]
          fade = Math.max(fade, smoothstep(clump - 0.3, clump + 0.3, density))
        }
        if (edged && field) {
          const inside = Math.min(rowInset, column + 0.5 - left)
          if (inside < edgeReach) {
            const wander = field.wander[cellRow + ((column / perCell) | 0)]
            const soft = smoothstep(
              0,
              EDGE_FEATHER,
              inside * DOT + wander * EDGE_WANDER
            )
            fade *= 1 - (1 - soft) * edges
          }
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
