"use client"

import Image from "next/image"
import { useEffect, useLayoutEffect, useRef } from "react"
import { preload } from "react-dom"

import {
  GIANT_EYE,
  projectGiantPoint,
  rasterizeGiant,
  type GiantPose,
} from "@/components/home/ascii-giant"
import {
  shouldAnimateIntro,
  takeOverHome,
  WORLD_WAIT_MS,
} from "@/components/home/intro"
import {
  createBeaconRenderer,
  type BeaconRenderer,
} from "@/components/home/beacon"
import {
  createPaperRenderer,
  paperShape,
  type PaperRenderer,
} from "@/components/home/paper"
import {
  isInteractive,
  watchDoubleClicks,
} from "@/components/home/double-click"
import { paperFillAt } from "@/components/page-transition"

/**
 * The homepage in dark mode: the falling star from The Iron Giant.
 *
 * A starry night with a few small clouds. One star flares up and starts to
 * fall: the Giant, diving head first like a missile, ray-marched in ASCII
 * the way the day scene's seaplane is. The camera follows him down (the
 * film's own tilt from the stars onto the pine hills) until he drops behind
 * the ridge, where the film's hand-drawn burst and smoke go up. His eyes
 * open between the trees, and the night paper comes in around the copy.
 */

/** Generated starry sky on top, the film's stitched tilt-down underneath. */
const WORLD = { src: "/home/giant/night-world.webp", width: 2000, height: 3200 }
/** Height of the part of the world the scene rests on (its bottom). */
const PHOTO_HEIGHT = 1100
/** Row of that part that rests where the day scene's ridge does. */
const RIDGE_ROW = 430
/** Red: the land. Green: the pines alone, which phones cut out of the paper. */
const MATTES = "/home/giant/night-mattes.webp"
/** Where the Giant comes down, in that part's pixels. */
const LANDING = { x: 1180, y: 712 }
/**
 * Where his eyes open. On a wide screen, where he landed. Phones show only
 * a strip under the copy, so there it is a gap in the pines along the bottom.
 */
const EYES = { wide: LANDING, compact: { x: 1150, y: 962 } }

/**
 * Cut out of the film's frames: its night clouds, and the burst and smoke of
 * a shell going off, regraded for moonlight. `core` is the point of a sprite
 * that sits on the spot it is drawn at.
 */
const SPRITES = {
  cloudA: { src: "/home/giant/cloud-a.webp", width: 684, height: 145 },
  cloudB: { src: "/home/giant/cloud-b.webp", width: 960, height: 180 },
  cloudC: { src: "/home/giant/cloud-c.webp", width: 406, height: 242 },
  burst: { src: "/home/giant/burst.webp", width: 426, height: 383 },
  smoke: { src: "/home/giant/smoke.webp", width: 536, height: 461 },
  /** The same smoke without its thin trails: just the billows. */
  puff: { src: "/home/giant/puff.webp", width: 389, height: 378 },
} as const

type SpriteName = keyof typeof SPRITES

/**
 * The clouds he falls past: x across the screen (0–1), y down the world in
 * its own pixels, size against the film's, and how fast each drifts (px/s).
 */
const CLOUDS: {
  sprite: SpriteName
  x: number
  y: number
  size: number
  drift: number
  flip?: boolean
}[] = [
  { sprite: "cloudC", x: 0.77, y: 330, size: 0.6, drift: 5 },
  { sprite: "cloudA", x: 0.2, y: 800, size: 0.66, drift: -4 },
  { sprite: "cloudB", x: 0.8, y: 1290, size: 0.56, drift: 4, flip: true },
  { sprite: "cloudC", x: 0.13, y: 1730, size: 0.42, drift: -3, flip: true },
  { sprite: "cloudA", x: 0.33, y: 2110, size: 0.5, drift: 3, flip: true },
]

export const GIANT = {
  /**
   * Something far off in the empty sky: a faint point that brightens and
   * grows as it comes, until it is a star.
   */
  appear: 0.35,
  /** It starts to fall. */
  fall: 1.5,
  // The camera lets him get ahead, so he rides the middle of the frame
  // with his trail above him, and is still settling when he lands.
  cameraStart: 2.1,
  cameraEnd: 5.3,
  /** It drops behind the ridge and hits the ground. */
  impact: 4.8,
  /** The paper and the copy come in right behind the blast. */
  paperStart: 4.95,
  reveal: 5.2,
  paperEnd: 6.3,
  /** The eyes open as the smoke clears. */
  eyes: 7.5,
  /**
   * Where the scene rests when the intro doesn't play: the smoke all gone,
   * the eyes open.
   */
  settled: 9.0,
} as const

/** The eyes as searchlights: how long they hold a point before letting go. */
const BEACON = { hold: 3, swing: 0.45, fade: 0.35 }

/**
 * How opaque the night paper is behind the copy. Well under 1, so the stars
 * still show through it; its thinner edges let even more of them through.
 */
const VEIL = 0.5

/** When the burst's own cloud has thinned away, in s after the impact. */
const BURST_GONE = 1.5

const EYE_RGB = [GIANT_EYE >> 16, (GIANT_EYE >> 8) & 255, GIANT_EYE & 255]
/** The night at the top of the world: what shows until the painting loads. */
const ZENITH = "#05070f"

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)
const mix = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Gas thinning out, from 0 (still whole) to 1 (gone). It keeps spreading
 * and loosening as it fades, slowly at first and slowly at the very end:
 * `grow` is how far it has spread, `soften` how blurred it has become.
 */
const thinning = (p: number) => {
  const q = clamp01(p)
  return {
    alpha: 1 - q * q * (3 - 2 * q),
    grow: 1 - (1 - q) * (1 - q),
    soften: Math.sqrt(q),
  }
}

/** Room around a softened copy of a sprite for its blur to spread into. */
const SOFT_PAD = 0.14

/**
 * Blurred copies of a sprite, a little and a lot, for smoke that loosens as
 * it thins. Shrunk step by step and grown back, which every browser does
 * smoothly, so it needs no canvas filters.
 */
function softCopies(image: HTMLImageElement) {
  const width = image.naturalWidth * (1 + 2 * SOFT_PAD)
  const height = image.naturalHeight * (1 + 2 * SOFT_PAD)
  const resample = (source: CanvasImageSource, factor: number) => {
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(2, Math.round(width / factor))
    canvas.height = Math.max(2, Math.round(height / factor))
    const c = canvas.getContext("2d")
    if (!c) return canvas
    c.imageSmoothingQuality = "high"
    if (source === image) {
      c.drawImage(
        image,
        (image.naturalWidth * SOFT_PAD) / factor,
        (image.naturalHeight * SOFT_PAD) / factor,
        image.naturalWidth / factor,
        image.naturalHeight / factor
      )
    } else {
      c.drawImage(source, 0, 0, canvas.width, canvas.height)
    }
    return canvas
  }
  const blurred = (depth: number) => {
    let canvas = resample(image, 2)
    let factor = 2
    while (factor < depth) canvas = resample(canvas, (factor *= 2))
    // Grown back up in steps too, so it comes out round, not blocky.
    for (let i = 0; i < 2; i++) canvas = resample(canvas, (factor /= 2))
    return canvas
  }
  return [blurred(8), blurred(32)]
}

/** The trail's glyphs, from just shed to almost gone. */
const TRAIL = "#%*+=~-:."

/** A fixed scatter, so every replay (and any frozen frame) is the same. */
const scatter = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * The landing's smoke: the film's one drawing of a smoke cloud, laid over
 * itself many times. Each copy is thrown its own way, at its own moment,
 * size, turn and strength, so together they billow instead of scaling.
 * Most are the billows alone; a few keep their trails. Sorted large to
 * small: the big, faint ones sit behind.
 */
const PUFFS = Array.from({ length: 14 }, (_, i) => {
  const order = i / 13
  const life = 1.8 + 1.4 * scatter(i, 8)
  return {
    sprite: (i % 5 === 1 ? "smoke" : "puff") as "smoke" | "puff",
    delay: 0.02 + 0.8 * Math.pow(order, 1.4) + scatter(i, 1) * 0.06,
    // Thrown up in a fan: wide at first, straighter as the column builds.
    angle: (scatter(i, 2) - 0.5) * mix(2.1, 0.7, order),
    speed: 150 + 250 * scatter(i, 3),
    // The later ones keep climbing: that is the column.
    lift: 22 + 34 * order,
    size: 0.3 + 0.42 * scatter(i, 4),
    turn: scatter(i, 5) * Math.PI * 2,
    spin: (scatter(i, 6) - 0.5) * 0.5,
    flip: scatter(i, 7) > 0.5,
    life,
    alpha: 0.55 + 0.45 * scatter(i, 9),
    phase: scatter(i, 10) * Math.PI * 2,
    // Each thins its own way: some early, some late; some spread wide as
    // they go, some rise; all drift off on the wind.
    thinFrom: life * (0.22 + 0.24 * scatter(i, 11)),
    spread: 0.16 + 0.34 * scatter(i, 12),
    rise: 8 + 26 * scatter(i, 13),
    drift: (scatter(i, 14) - 0.3) * 30,
  }
}).sort((a, b) => b.size - a.size)

/** Dirt thrown up by the landing, in type like the Giant himself. */
const DEBRIS = Array.from({ length: 22 }, (_, i) => ({
  angle: (scatter(i, 21) - 0.5) * 2.3,
  speed: 250 + 380 * scatter(i, 22),
  life: 0.55 + 0.6 * scatter(i, 23),
  glyph: ".,'`*+:"[Math.floor(scatter(i, 24) * 7)],
}))

type Layout = {
  width: number
  height: number
  compact: boolean
  /** Screen px per world px. */
  scale: number
  /** The world's left edge on screen. */
  left: number
  /** Where the resting part's top edge sits once the camera has landed. */
  photoTop: number
  /** How far the camera travels, in screen px. */
  descent: number
  /** Where the eyes open, in the resting part's pixels. */
  eyes: { x: number; y: number }
}

function layoutFor(width: number, height: number): Layout {
  const compact = width < 640
  const scale = Math.max(width / WORLD.width, height / PHOTO_HEIGHT)
  const lowest = height - PHOTO_HEIGHT * scale
  const eyes = compact ? EYES.compact : EYES.wide
  // Desktop rests like the day scene, a little higher (the pines need room).
  // Phones have only a strip under the copy, so the world sits as low as it
  // goes, which brings the row of pines along its bottom into that strip,
  // and is framed on the gap where the eyes open. Never a gap at the edges.
  const photoTop = compact
    ? lowest
    : Math.max(height * 0.56 - RIDGE_ROW * scale, lowest)
  const left = compact
    ? Math.min(
        0,
        Math.max(width - WORLD.width * scale, width * 0.48 - eyes.x * scale)
      )
    : (width - WORLD.width * scale) / 2
  return {
    width,
    height,
    compact,
    scale,
    left,
    photoTop,
    descent: (WORLD.height - PHOTO_HEIGHT) * scale - photoTop,
    eyes,
  }
}

type Puff = {
  x: number
  /** World y, so the trail stays in the sky as the camera moves. */
  y: number
  vx: number
  vy: number
  age: number
  life: number
  size: number
  seed: number
}

type GiantNightProps = {
  /** False when the scene should simply be there, settled. */
  playIntro: boolean
  /** Called once, when the copy should start fading in. */
  onReveal: () => void
}

export function GiantNight({ playIntro, onReveal }: GiantNightProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const fxRef = useRef<HTMLCanvasElement>(null)
  const paperRef = useRef<HTMLCanvasElement>(null)
  const beaconRef = useRef<HTMLCanvasElement>(null)
  const onRevealRef = useRef(onReveal)
  const worldReadyRef = useRef(false)

  // The mattes and effects are only fetched by script; start them with the page.
  preload(MATTES, { as: "image" })

  useEffect(() => {
    onRevealRef.current = onReveal
  }, [onReveal])

  // Layout effect: a settled scene is drawn before the first paint, so
  // coming back to the homepage never shows an empty frame.
  useLayoutEffect(() => {
    const scene = sceneRef.current
    const world = worldRef.current
    const fx = fxRef.current
    const paperCanvas = paperRef.current
    const beaconCanvas = beaconRef.current
    const ctx = fx?.getContext("2d")
    if (!scene || !world || !fx || !paperCanvas || !beaconCanvas || !ctx) return

    const debug =
      process.env.NODE_ENV === "development"
        ? Number.parseFloat(
            new URLSearchParams(window.location.search).get("t") ?? ""
          )
        : Number.NaN
    const scrub = Number.isFinite(debug)
    const font =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-mono")
        .trim() || "monospace"

    // No intro for reduced motion, or once a slow load has already put the
    // copy on plain paper: the scene just comes up settled around it.
    const { arrivedLate, animate: animateIntro } = shouldAnimateIntro(playIntro)
    const releaseHome = takeOverHome(null, arrivedLate && playIntro)
    if (arrivedLate && playIntro) {
      scene.style.opacity = "0"
      requestAnimationFrame(() => {
        scene.style.transition = "opacity 0.9s ease"
        scene.style.opacity = "1"
      })
    }

    let layout = layoutFor(window.innerWidth, window.innerHeight)
    let clock = scrub ? debug : animateIntro ? 0 : GIANT.settled
    let running = !animateIntro
    let revealed = false
    let lastPaperKey = ""
    const mountedAt = performance.now()

    // The sky's color down the height of the world, to tint the Giant with
    // the air he is falling through. Read off the painting once it's in.
    let sky: Uint8ClampedArray | null = null
    const SKY_ROWS = 48
    const readSky = () => {
      const image = world.querySelector("img")
      if (sky || !image?.complete || !image.naturalWidth) return
      worldReadyRef.current = true
      const strip = document.createElement("canvas")
      strip.width = 8
      strip.height = SKY_ROWS
      const s = strip.getContext("2d", { willReadFrequently: true })
      if (!s) return
      try {
        s.drawImage(image, 0, 0, strip.width, strip.height)
        const pixels = s.getImageData(0, 0, strip.width, strip.height).data
        sky = new Uint8ClampedArray(SKY_ROWS * 3)
        for (let row = 0; row < SKY_ROWS; row++) {
          for (let channel = 0; channel < 3; channel++) {
            let sum = 0
            for (let x = 0; x < strip.width; x++) {
              sum += pixels[(row * strip.width + x) * 4 + channel]
            }
            sky[row * 3 + channel] = sum / strip.width
          }
        }
      } catch {
        // A tainted canvas: he keeps his own colors.
      }
    }
    /** The sky's color at a height in the world (screen px from its top). */
    const skyAt = (y: number): [number, number, number] => {
      if (!sky) return [10, 15, 36]
      const row = Math.min(
        SKY_ROWS - 1,
        Math.max(0, Math.round((y / (WORLD.height * layout.scale)) * SKY_ROWS))
      )
      return [sky[row * 3], sky[row * 3 + 1], sky[row * 3 + 2]]
    }

    const beacon: BeaconRenderer | null = createBeaconRenderer(
      beaconCanvas,
      WORLD,
      PHOTO_HEIGHT,
      MATTES
    )
    const paper: PaperRenderer | null = createPaperRenderer(
      paperCanvas,
      MATTES,
      () => {
        lastPaperKey = ""
      }
    )
    const paperColor = readColor(scene)
    // What the paper becomes when it spreads to change pages: exactly the
    // background the next page is drawn on.
    const pageColor = readColor(document.body)

    // The land as an alpha mask: whatever falls behind the hills is cut out.
    const land = document.createElement("canvas")
    let landReady = false
    /** The ridge above the landing spot, in the resting part's pixels. */
    let ridgeRow = LANDING.y - 90
    const matte = new window.Image()
    matte.decoding = "async"
    matte.src = MATTES
    matte.onload = () => {
      land.width = matte.naturalWidth
      land.height = matte.naturalHeight
      const l = land.getContext("2d", { willReadFrequently: true })
      if (!l) return
      l.drawImage(matte, 0, 0)
      const data = l.getImageData(0, 0, land.width, land.height)
      for (let i = 0; i < data.data.length; i += 4) {
        data.data[i + 3] = data.data[i]
        data.data[i] = data.data[i + 1] = data.data[i + 2] = 0
      }
      l.putImageData(data, 0, 0)
      const column = Math.round((LANDING.x / WORLD.width) * land.width)
      for (let row = 0; row < land.height; row++) {
        if (data.data[(row * land.width + column) * 4 + 3] > 128) {
          ridgeRow = (row / land.height) * PHOTO_HEIGHT
          break
        }
      }
      landReady = true
    }

    const sprites = {} as Record<SpriteName, HTMLImageElement>
    for (const name of Object.keys(SPRITES) as SpriteName[]) {
      const image = new window.Image()
      image.decoding = "async"
      image.src = SPRITES[name].src
      sprites[name] = image
    }
    const ready = (name: SpriteName) =>
      sprites[name].complete && sprites[name].naturalWidth > 0
    const softened = new Map<SpriteName, HTMLCanvasElement[]>()
    const softCopiesOf = (name: SpriteName) => {
      let copies = softened.get(name)
      if (!copies) {
        copies = softCopies(sprites[name])
        softened.set(name, copies)
      }
      return copies
    }

    const buckets = new Map<number, number[]>()
    const trail: Puff[] = []
    let trailClock = clock
    let trailCarry = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      layout = layoutFor(window.innerWidth, window.innerHeight)
      world.style.width = `${WORLD.width * layout.scale}px`
      world.style.height = `${WORLD.height * layout.scale}px`
      world.style.left = `${layout.left}px`
      fx.width = Math.round(layout.width * ratio)
      fx.height = Math.round(layout.height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      paper?.resize(layout.width, layout.height, ratio)
      // Soft light: a pixel per CSS pixel is plenty, and keeps it cheap.
      beacon?.resize(layout.width, layout.height, 1)
      lastPaperKey = ""
      trail.length = 0
      if (scrub) simulateTrail(clock)
    }

    const cameraAt = (t: number) =>
      smoother(
        clamp01((t - GIANT.cameraStart) / (GIANT.cameraEnd - GIANT.cameraStart))
      ) * layout.descent

    /** The resting part's top edge in the world, and the landing spot. */
    const photoWorldTop = () => (WORLD.height - PHOTO_HEIGHT) * layout.scale
    const landingX = () => layout.left + LANDING.x * layout.scale

    /**
     * Where the Giant is at a time: x on screen, y in the world, his length
     * in px, and his pose. A straight dive that only ever gains speed; he
     * comes out of the distance, passes close, and is far again when he lands.
     */
    const giantAt = (t: number) => {
      const u = clamp01((t - GIANT.fall) / (GIANT.impact - GIANT.fall))
      const along = Math.pow(u, 1.7)
      const x0 = layout.width * (layout.compact ? 0.16 : 0.21)
      const y0 = layout.height * 0.13
      const x1 = landingX()
      const y1 = photoWorldTop() + LANDING.y * layout.scale
      const full = Math.min(340, Math.max(210, layout.height * 0.36))
      const near = smoothstep(0, 0.52, u) * mix(1, 0.26, smoothstep(0.6, 1, u))
      const pose: GiantPose = {
        heading: Math.atan2(y0 - y1, x1 - x0),
        // Head toward us on the way in, away once he has passed.
        lean: mix(0.62, -0.5, smoothstep(0.1, 0.95, u)),
        roll: 0.5 + (t - GIANT.fall) * 1.5,
        flutter: t * 9,
      }
      return {
        u,
        x: mix(x0, x1, along),
        y: mix(y0, y1, along),
        size: full * (0.02 + 0.98 * near),
        /** 0 right in front of us, 1 far off in the night. */
        distance: 1 - near,
        pose,
      }
    }

    /** Sheds the trail up to a time and ages it. */
    const stepTrail = (t: number, dt: number) => {
      if (dt <= 0) return
      for (let i = trail.length - 1; i >= 0; i--) {
        const puff = trail[i]
        puff.age += dt
        if (puff.age >= puff.life) {
          trail.splice(i, 1)
          continue
        }
        const drag = Math.exp(-dt * 2.2)
        puff.vx *= drag
        puff.vy *= drag
        puff.x += puff.vx * dt
        puff.y += puff.vy * dt
      }
      if (t <= GIANT.fall || t >= GIANT.impact) return
      const now = giantAt(t)
      const before = giantAt(t - dt)
      const tail = projectGiantPoint(now.pose, now.size / 2, -0.95, 0, 0)
      const dx = now.x - before.x
      const dy = now.y - before.y
      const distance = Math.hypot(dx, dy)
      // One puff every few px of the way: a tight, unbroken line behind him.
      const spacing = Math.max(2.6, now.size * 0.028)
      trailCarry += distance / spacing
      const count = Math.floor(trailCarry)
      trailCarry -= count
      const weight = Math.min(1, now.size / 150)
      for (let i = 0; i < count; i++) {
        const back = (i + Math.random()) / count
        const spread = now.size * 0.05
        trail.push({
          x: now.x + tail.x - dx * back + (Math.random() - 0.5) * spread,
          y: now.y + tail.y - dy * back + (Math.random() - 0.5) * spread,
          // Dragged along a little, and fanning out sideways.
          vx: (dx / dt) * 0.08 + (Math.random() - 0.5) * 46 * weight,
          vy: (dy / dt) * 0.08 + (Math.random() - 0.5) * 46 * weight,
          age: dt * back,
          life: (0.35 + Math.random() * 0.95) * (0.45 + 0.55 * weight),
          size: 0.75 + Math.random() * 0.5,
          seed: Math.random(),
        })
      }
    }

    /** For a frozen frame: the trail as it would be by then. */
    const simulateTrail = (to: number) => {
      trail.length = 0
      trailCarry = 0
      const step = 1 / 60
      for (let t = Math.max(GIANT.fall, to - 2.5); t < to; t += step) {
        stepTrail(t, step)
      }
      trailClock = to
    }

    const drawSprite = (
      name: SpriteName,
      x: number,
      y: number,
      width: number,
      options: {
        core?: [number, number]
        alpha?: number
        turn?: number
        flip?: boolean
        /** Height against width: below 1 flattens it. */
        squash?: number
        /** 0 sharp, 1 as loose as smoke gets before it is gone. */
        soften?: number
        /** Where to draw it: the effects, unless said otherwise. */
        into?: CanvasRenderingContext2D
      } = {}
    ) => {
      if (!ready(name)) return
      const {
        core = [0.5, 0.5],
        alpha = 1,
        turn = 0,
        flip = false,
        squash = 1,
        soften = 0,
        into: g = ctx,
      } = options
      const a = Math.min(1, alpha)
      if (a <= 0.004 || width <= 0) return
      const height = (width * SPRITES[name].height) / SPRITES[name].width
      g.save()
      g.translate(x, y)
      if (squash !== 1) g.scale(1, squash)
      if (turn) g.rotate(turn)
      if (flip) g.scale(-1, 1)
      const left = -width * core[0]
      const top = -height * core[1]
      const level = (copy: number, opacity: number) => {
        if (opacity <= 0.002) return
        g.globalAlpha = opacity
        if (copy === 0) {
          g.drawImage(sprites[name], left, top, width, height)
          return
        }
        g.drawImage(
          softCopiesOf(name)[copy - 1],
          left - width * SOFT_PAD,
          top - height * SOFT_PAD,
          width * (1 + 2 * SOFT_PAD),
          height * (1 + 2 * SOFT_PAD)
        )
      }
      // Between two of its copies: the looser one underneath, the sharper
      // one over it at just the opacity that keeps the total where it was.
      const at = clamp01(soften) * 2
      const lower = Math.min(1, Math.floor(at))
      const f = at - lower
      level(lower + 1, a * f)
      level(lower, f >= 1 ? 0 : (a * (1 - f)) / (1 - a * f))
      g.restore()
    }

    // The eyes. They follow the pointer; a double click lights them up as
    // searchlights fixed on that point. After a while without another,
    // they let go, blink, and go back to following the pointer.
    let wall = performance.now() / 1000
    let lastWall = wall
    const pointer = { x: 0, y: 0, known: false }
    const gaze = { x: 0, y: 0 }
    type Beam = {
      aim: { x: number; y: number }
      from: { x: number; y: number }
      swungAt: number
      litAt: number
      lastAt: number
    }
    let beam: Beam | null = null
    /** When the eyes last shut after letting a beam go. */
    let closedAt = -Infinity

    const easeInOut = (x: number) => x * x * (3 - 2 * x)
    const aimAt = (b: Beam) => {
      const k = easeInOut(clamp01((wall - b.swungAt) / BEACON.swing))
      return { x: mix(b.from.x, b.aim.x, k), y: mix(b.from.y, b.aim.y, k) }
    }
    /** How bright the beam is: it stutters on like the eyes did, then holds. */
    const beamPower = (b: Beam) => {
      const s = wall - b.litAt
      const on =
        s < 0.05 ? 0.55 : s < 0.11 ? 0.1 : s < 0.2 ? 1 : s < 0.25 ? 0.4 : 1
      const end = wall - b.lastAt - BEACON.hold
      return on * (1 - smoothstep(0, BEACON.fade, end))
    }
    /** After a beam: shut, held shut a moment, open again. */
    const lidAfterBeam = () => {
      const b = wall - closedAt
      if (b < 0.12) return 1 - smoothstep(0, 0.12, b)
      if (b < 0.42) return 0
      return smoothstep(0.42, 0.62, b)
    }
    const stepEyes = (t: number, dt: number, photoTop: number) => {
      if (beam && wall - beam.lastAt > BEACON.hold + BEACON.fade) {
        beam = null
        closedAt = wall
      }
      const gap = Math.max(16, 28 * layout.scale)
      const center = {
        x: layout.left + layout.eyes.x * layout.scale,
        y: photoTop + layout.eyes.y * layout.scale,
      }
      // Where they look: the beam's point, the pointer, or just about.
      const looking = beam
        ? aimAt(beam)
        : wall - closedAt < 0.42
          ? null
          : pointer.known
            ? pointer
            : {
                x: center.x + Math.sin((t - GIANT.eyes) * 0.45) * 400,
                y: center.y,
              }
      if (looking) {
        const dx = looking.x - center.x
        const dy = looking.y - center.y
        const reach = Math.hypot(dx, dy) + 240
        const target = {
          x: (dx / reach) * gap * 0.34,
          y: (dy / reach) * gap * 0.22,
        }
        const follow = 1 - Math.exp(-dt * (beam ? 14 : 8))
        gaze.x += (target.x - gaze.x) * follow
        gaze.y += (target.y - gaze.y) * follow
        return Math.hypot(target.x - gaze.x, target.y - gaze.y) > 0.05
      }
      return false
    }
    const eyesAt = (photoTop: number) => {
      const gap = Math.max(16, 28 * layout.scale)
      const radius = gap * 0.21
      const x = layout.left + layout.eyes.x * layout.scale + gaze.x
      const y = photoTop + layout.eyes.y * layout.scale + gaze.y
      // Turned to one side, the far eye tucks in a little.
      const half =
        gap * 0.5 * (1 - 0.18 * Math.min(1, Math.abs(gaze.x) / (gap * 0.34)))
      return {
        left: { x: x - half, y },
        right: { x: x + half, y },
        radius,
        power: beam ? beamPower(beam) : 0,
        lid: beam ? 1 : lidAfterBeam(),
      }
    }
    const doubleAt = (x: number, y: number) => {
      // Only once he is there, eyes open.
      if (clock < GIANT.eyes + 0.5) return
      if (beam) {
        beam.from = aimAt(beam)
        beam.aim = { x, y }
        beam.swungAt = wall
        // Already fading out: brought back up without stuttering on again.
        beam.lastAt = wall
        return
      }
      beam = {
        aim: { x, y },
        from: { x, y },
        swungAt: -Infinity,
        litAt: wall,
        lastAt: wall,
      }
      closedAt = -Infinity
    }

    // Once the page has settled: more clouds, coming and going. Each one
    // either drifts in from a side or gathers out of nothing where it is,
    // breathes a little as it goes, and in time drifts off or thins away;
    // then, after a pause, another takes its place. Slow, and kept to the
    // sky above the hills.
    type Drifter = {
      sprite: SpriteName
      /** Where it was at `born`, px. */
      x: number
      /** Height in the sky, 0 its top, 1 the hills. */
      y: number
      size: number
      /** px/s, signed. */
      speed: number
      flip: boolean
      born: number
      /** Gathered where it is (fades in), or came in from a side. */
      gathered: boolean
      /** When it starts to thin away, if it is still around. */
      thinsAt: number
      thinning: number
      alpha: number
      breathe: { period: number; phase: number }
    }
    const drifters: (Drifter | null)[] = []
    const respawnAt: number[] = []
    const DRIFTER_SPRITES: SpriteName[] = ["cloudA", "cloudB", "cloudC"]
    const between = (a: number, b: number) => a + Math.random() * (b - a)
    const drifterCount = () =>
      layout.compact ? 3 : layout.width < 1024 ? 4 : 6
    const drifterWidth = (d: Drifter) =>
      SPRITES[d.sprite].width *
      d.size *
      layout.scale *
      (layout.compact ? 0.62 : 1)
    const spawnDrifter = (slot: number) => {
      const { width } = layout
      const speed =
        between(3, 8.5) *
        (layout.compact ? 0.7 : 1) *
        (Math.random() < 0.5 ? -1 : 1)
      // Not right on top of another one.
      let y = between(0, 1)
      for (let attempt = 0; attempt < 8; attempt++) {
        const clear = drifters.every(
          (other, i) => i === slot || !other || Math.abs(other.y - y) > 0.18
        )
        if (clear) break
        y = between(0, 1)
      }
      const drifter: Drifter = {
        sprite: DRIFTER_SPRITES[Math.floor(Math.random() * 3)],
        x: 0,
        y,
        size: between(0.26, 0.58),
        speed,
        flip: Math.random() < 0.5,
        born: wall,
        gathered: Math.random() < 0.4,
        thinsAt: wall + between(35, 80),
        thinning: between(6, 10),
        alpha: between(0.5, 0.85),
        breathe: { period: between(16, 32), phase: between(0, Math.PI * 2) },
      }
      const w = drifterWidth(drifter)
      drifter.x = drifter.gathered
        ? between(0.1, 0.9) * width
        : speed > 0
          ? -w / 2
          : width + w / 2
      drifters[slot] = drifter
    }
    let driftersFrom = -1
    const drawDrifters = (camera: number, into: CanvasRenderingContext2D) => {
      if (driftersFrom < 0) {
        // The first ones show up one at a time.
        driftersFrom = wall
        for (let i = 0; i < 6; i++)
          respawnAt[i] = wall + 0.8 + i * between(1.5, 3.5)
      }
      const count = drifterCount()
      const top = layout.height * 0.03
      const bottom = photoWorldTop() - camera + (RIDGE_ROW - 30) * layout.scale
      for (let i = 0; i < count; i++) {
        let d = drifters[i]
        if (!d) {
          if (wall < (respawnAt[i] ?? 0)) continue
          spawnDrifter(i)
          d = drifters[i]
          if (!d) continue
        }
        const w = drifterWidth(d)
        const x = d.x + d.speed * (wall - d.born)
        const gone =
          (d.speed > 0 ? x - w / 2 > layout.width : x + w / 2 < 0) ||
          wall > d.thinsAt + d.thinning
        if (gone) {
          drifters[i] = null
          respawnAt[i] = wall + between(3, 12)
          continue
        }
        const alpha =
          d.alpha *
          (d.gathered ? smoothstep(d.born, d.born + 8, wall) : 1) *
          (1 - smoothstep(d.thinsAt, d.thinsAt + d.thinning, wall)) *
          (0.85 +
            0.15 *
              Math.sin(
                (wall / d.breathe.period) * Math.PI * 2 + d.breathe.phase
              ))
        drawSprite(d.sprite, x, mix(top, bottom, d.y), w, {
          alpha,
          flip: d.flip,
          into,
        })
      }
    }

    // The clouds get a layer of their own, so that once the copy is on the
    // page they can thin away around it instead of sliding behind it: a
    // soft-edged shape of the copy is cut out of them.
    const cloudLayer = document.createElement("canvas")
    const clouds = cloudLayer.getContext("2d")
    const cloudMask = document.createElement("canvas")
    let cloudMaskKey = ""
    const shapeCloudMask = (ratio: number) => {
      const keep = readKeepRect()
      const key = `${keep.left}|${keep.top}|${keep.right}|${keep.bottom}|${cloudLayer.width}x${cloudLayer.height}`
      if (key === cloudMaskKey) return
      cloudMaskKey = key
      cloudMask.width = cloudLayer.width
      cloudMask.height = cloudLayer.height
      const m = cloudMask.getContext("2d")
      if (!m) return
      // Drawn off the canvas, so only its blurred shadow lands on it: a
      // feathered shape. Shadows ignore the transform, so offsets are in
      // device pixels.
      const pad = 26
      const feather = 46
      const away = 20000
      m.setTransform(ratio, 0, 0, ratio, 0, 0)
      m.clearRect(0, 0, layout.width, layout.height)
      m.shadowColor = "#000"
      m.shadowBlur = feather * ratio
      m.shadowOffsetX = away * ratio
      m.fillStyle = "#000"
      m.beginPath()
      const x = keep.left - pad - away
      const y = keep.top - pad
      const w = keep.right - keep.left + pad * 2
      const h = keep.bottom - keep.top + pad * 2
      if (typeof m.roundRect === "function") m.roundRect(x, y, w, h, 40)
      else m.rect(x, y, w, h)
      m.fill()
    }

    const drawFx = (t: number, camera: number, sway: number) => {
      const { width, height, scale } = layout
      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.translate(sway, 0)

      // The clouds, drifting; a little nearer than the stars, so they pass
      // a little faster.
      const ratio = fx.width / width
      const paint = clouds ?? ctx
      if (clouds) {
        if (cloudLayer.width !== fx.width || cloudLayer.height !== fx.height) {
          cloudLayer.width = fx.width
          cloudLayer.height = fx.height
        }
        clouds.setTransform(ratio, 0, 0, ratio, sway * ratio, 0)
        clouds.clearRect(-sway, 0, width, height)
      }
      const cloudScale = scale * (layout.compact ? 0.62 : 1)
      for (const cloud of CLOUDS) {
        const w = SPRITES[cloud.sprite].width * cloud.size * cloudScale
        const y = cloud.y * scale - camera * 1.06
        if (y < -w || y > height + w) continue
        // Off one side, back in on the other.
        const span = width + w
        const x = cloud.x * width + t * cloud.drift + w / 2
        drawSprite(cloud.sprite, (((x % span) + span) % span) - w / 2, y, w, {
          flip: cloud.flip,
          into: paint,
        })
      }
      if (t > GIANT.paperEnd) drawDrifters(camera, paint)
      if (clouds) {
        const wash = smoothstep(GIANT.paperStart, GIANT.paperEnd, t)
        if (wash > 0) {
          shapeCloudMask(ratio)
          clouds.setTransform(1, 0, 0, 1, 0, 0)
          clouds.globalCompositeOperation = "destination-out"
          clouds.globalAlpha = wash
          clouds.drawImage(cloudMask, 0, 0)
          clouds.globalAlpha = 1
          clouds.globalCompositeOperation = "source-over"
        }
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.drawImage(cloudLayer, 0, 0)
        ctx.restore()
      }

      const fontSize = layout.compact ? 5.5 : 6
      const cellWidth = fontSize * 0.6
      const cellHeight = fontSize * 0.85
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      const dt = Math.min(0.1, Math.max(0, t - trailClock))
      trailClock = t
      stepTrail(t, dt)

      // The trail: white where it leaves him, thinning to blue-grey smoke.
      for (const puff of trail) {
        const k = puff.age / puff.life
        const cool = clamp01(k * 2.2)
        ctx.font = `700 ${((fontSize + 1.5) * puff.size * (1 + k * 0.5)).toFixed(1)}px ${font}`
        ctx.fillStyle = `rgba(${mix(244, 96, cool) | 0},${mix(248, 112, cool) | 0},${mix(255, 156, cool) | 0},${(Math.pow(1 - k, 1.3) * 0.95).toFixed(3)})`
        ctx.fillText(
          TRAIL[Math.min(TRAIL.length - 1, (k * TRAIL.length + puff.seed) | 0)],
          puff.x,
          puff.y - camera
        )
      }

      const giant = giantAt(t)
      const sy = giant.y - camera
      ctx.font = `700 ${fontSize}px ${font}`
      if (t >= GIANT.appear && t < GIANT.impact && giant.size < 26) {
        // Still far off: a point of light coming out of the distance. It
        // comes up quickly, with a soft glow of its own so it catches the
        // eye in the empty sky, then grows, slowly and then faster as it
        // nears, into a star, and the star starts to move.
        const near = clamp01((t - GIANT.appear) / (GIANT.fall - GIANT.appear))
        const grow = Math.pow(near, 1.6)
        const glow = smoothstep(0, 0.25, near)
        // A slow, calm shimmer while it is far; the falling star's own
        // flicker as it arrives.
        const twinkle = mix(
          0.85 + 0.15 * Math.sin(t * 7),
          0.75 + 0.25 * Math.sin(t * 31),
          grow
        )
        // Its halo, the same soft light as his eyes', breathing slowly
        // while it is far, so the eye finds it.
        const breath = mix(0.75 + 0.25 * Math.sin(t * 5), 1, grow)
        const haloRadius = mix(16, 22, grow)
        const halo = ctx.createRadialGradient(
          giant.x,
          sy,
          0,
          giant.x,
          sy,
          haloRadius
        )
        halo.addColorStop(
          0,
          `rgba(214,230,255,${(0.62 * glow * breath).toFixed(3)})`
        )
        halo.addColorStop(
          0.35,
          `rgba(214,230,255,${(0.2 * glow * breath).toFixed(3)})`
        )
        halo.addColorStop(1, "rgba(200,222,255,0)")
        ctx.fillStyle = halo
        ctx.fillRect(
          giant.x - haloRadius,
          sy - haloRadius,
          haloRadius * 2,
          haloRadius * 2
        )
        ctx.fillStyle = `rgba(255,255,255,${(glow * twinkle).toFixed(3)})`
        ctx.font = `700 ${mix(fontSize * 1.9, fontSize + 4, grow)}px ${font}`
        ctx.fillText(near < 0.6 ? "." : near < 0.86 ? "+" : "*", giant.x, sy)
      } else if (t >= GIANT.fall && t < GIANT.impact) {
        for (const cells of buckets.values()) cells.length = 0
        rasterizeGiant(
          giant.pose,
          {
            originX: giant.x,
            originY: sy,
            scale: giant.size / 2,
            cellWidth,
            cellHeight,
            viewWidth: width,
            viewHeight: height,
          },
          (col, row, glyph, color) => {
            let cells = buckets.get(color)
            if (!cells) {
              cells = []
              buckets.set(color, cells)
            }
            cells.push(col, row, glyph.charCodeAt(0))
          }
        )
        // The night air between us and him: the farther off he is, the
        // more his steel takes the color of the sky around him.
        const air = skyAt(giant.y)
        const haze = 0.06 + 0.42 * Math.pow(giant.distance, 1.3)
        for (const [color, cells] of buckets) {
          if (!cells.length) continue
          const veil = color === GIANT_EYE ? haze * 0.3 : haze
          ctx.fillStyle = `rgb(${mix(color >> 16, air[0], veil) | 0},${mix((color >> 8) & 255, air[1], veil) | 0},${mix(color & 255, air[2], veil) | 0})`
          for (let i = 0; i < cells.length; i += 3) {
            ctx.fillText(
              String.fromCharCode(cells[i + 2]),
              (cells[i] + 0.5) * cellWidth,
              (cells[i + 1] + 0.5) * cellHeight
            )
          }
        }
      }

      // The landing, behind the ridge.
      const photoTop = photoWorldTop() - camera
      const groundX = landingX()
      const ridgeY = photoTop + ridgeRow * scale
      const since = t - GIANT.impact
      if (since > 0 && since < 5) {
        const unit = Math.max(0.62, scale)
        const baseY = ridgeY + 16 * unit

        // Dust rolling out along the ground to either side, low and wide.
        for (const side of [-1, 1]) {
          const s = since - 0.05
          if (s <= 0) continue
          const gas = thinning((s - (side < 0 ? 0.45 : 0.6)) / 2.4)
          drawSprite(
            "puff",
            groundX +
              (side * (30 + 190 * (1 - Math.exp(-s / 0.55))) + 14 * gas.grow) *
                unit,
            ridgeY + (12 - 10 * s - 16 * gas.grow) * unit,
            SPRITES.puff.width *
              unit *
              (0.36 + 0.6 * (1 - Math.exp(-s / 0.4)) + 0.07 * s) *
              (1 + 0.3 * gas.grow),
            {
              alpha: 0.55 * smoothstep(0, 0.1, s) * gas.alpha,
              turn: side * 0.3,
              flip: side > 0,
              squash: 0.55 + 0.15 * gas.grow,
              soften: gas.soften,
            }
          )
        }

        // The smoke: every copy thrown hard, slowing as it spreads, then
        // lifting and leaning on the wind as it thins.
        for (const puff of PUFFS) {
          const s = since - puff.delay
          if (s <= 0 || s >= puff.life) continue
          const thrown = (puff.speed / 2.4) * (1 - Math.exp(-2.4 * s))
          const gas = thinning(
            (s - puff.thinFrom) / (puff.life - puff.thinFrom)
          )
          drawSprite(
            puff.sprite,
            groundX +
              (Math.sin(puff.angle) * thrown +
                11 * s * s +
                Math.sin(s * 1.9 + puff.phase) * 5 +
                puff.drift * gas.grow) *
                unit,
            baseY -
              (Math.cos(puff.angle) * thrown +
                puff.lift * s +
                puff.rise * gas.grow) *
                unit,
            SPRITES.puff.width *
              unit *
              puff.size *
              (0.28 + 0.72 * (1 - Math.exp(-s / 0.24)) + 0.13 * s) *
              (1 + puff.spread * gas.grow),
            {
              alpha: puff.alpha * smoothstep(0, 0.07, s) * gas.alpha,
              turn: puff.turn + puff.spin * (1 - Math.exp(-s)),
              flip: puff.flip,
              soften: gas.soften,
            }
          )
        }

        // Dirt, thrown up and falling back.
        ctx.font = `700 ${fontSize + 2}px ${font}`
        for (const bit of DEBRIS) {
          if (since >= bit.life) continue
          const k = since / bit.life
          ctx.fillStyle = `rgba(214,226,250,${(1 - k * k).toFixed(3)})`
          ctx.fillText(
            bit.glyph,
            groundX + Math.sin(bit.angle) * bit.speed * since * unit,
            baseY -
              (Math.cos(bit.angle) * bit.speed * since - 520 * since * since) *
                unit
          )
        }

        // The burst itself, over everything: a flash that cools at once,
        // then hangs there as a cloud of its own and thins away like the
        // rest. Its rays point up and to the left in the film; the turn
        // stands them up.
        if (since < BURST_GONE) {
          const gas = thinning((since - 0.1) / (BURST_GONE - 0.1))
          drawSprite(
            "burst",
            groundX + 12 * gas.grow * unit,
            baseY - 30 * gas.grow * unit,
            SPRITES.burst.width *
              unit *
              (0.5 + 0.55 * (1 - Math.exp(-since / 0.05))) *
              (1 + 0.32 * gas.grow),
            {
              core: [0.63, 0.59],
              alpha: mix(1, 0.62, smoothstep(0.05, 0.3, since)) * gas.alpha,
              turn: Math.PI / 4 + 0.08 * gas.grow,
              soften: gas.soften,
            }
          )
        }
      }

      // Everything so far is behind the hills.
      if (landReady) {
        ctx.globalCompositeOperation = "destination-out"
        ctx.drawImage(
          land,
          layout.left,
          photoTop,
          WORLD.width * scale,
          PHOTO_HEIGHT * scale
        )
        ctx.globalCompositeOperation = "source-over"
      }

      // The eyes, between the trees: two round lamps that flicker on, follow
      // the pointer, blink now and then, and blaze up as searchlights.
      const open = t - GIANT.eyes
      if (open > 0) {
        const {
          left: eyeLeft,
          right: eyeRight,
          radius,
          power,
          lid: shut,
        } = eyesAt(photoTop)
        const flicker =
          open < 0.07
            ? 0.7
            : open < 0.16
              ? 0.08
              : open < 0.3
                ? 1
                : open < 0.37
                  ? 0.25
                  : 1
        const phase = open % 5.3
        // His own blinks, unless he is holding a beam or has just blinked.
        const idle = !beam && wall - closedAt > 0.8
        const lid =
          (idle && open > 2 && phase > 5.08
            ? Math.abs(Math.cos(((phase - 5.08) / 0.22) * Math.PI))
            : 1) * shut
        const halo = 3.2 + 2.4 * power
        // Shut is shut: no sliver of light left between the lids.
        const seen = smoothstep(0.02, 0.2, lid)
        for (const eye of [eyeLeft, eyeRight]) {
          if (seen <= 0) break
          const glow = ctx.createRadialGradient(
            eye.x,
            eye.y,
            radius * 0.6,
            eye.x,
            eye.y,
            radius * halo
          )
          glow.addColorStop(
            0,
            `rgba(${EYE_RGB.join(",")},${(0.42 + 0.5 * power) * flicker * lid})`
          )
          glow.addColorStop(1, `rgba(${EYE_RGB.join(",")},0)`)
          ctx.fillStyle = glow
          ctx.fillRect(
            eye.x - radius * halo,
            eye.y - radius * halo,
            radius * halo * 2,
            radius * halo * 2
          )
          ctx.fillStyle = `rgba(${mix(226, 255, power) | 0},${mix(240, 255, power) | 0},255,${flicker * seen})`
          ctx.beginPath()
          ctx.ellipse(eye.x, eye.y, radius, radius * lid, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()
    }

    const drawPaper = (
      t: number,
      camera: number,
      sway: number,
      fill: number
    ) => {
      const wash = smoothstep(GIANT.paperStart, GIANT.paperEnd, t)
      const keep = readKeepRect()
      const photo = {
        left: layout.left + sway,
        top: photoWorldTop() - camera,
        width: WORLD.width * layout.scale,
        height: PHOTO_HEIGHT * layout.scale,
      }
      const { mist, bands, hug } = paperShape(layout.width, layout.height, keep)
      if (bands) {
        // The land under the copy is as dark as the paper, so the paper can
        // give way to it sooner than the day scene's does to its meadow.
        const room = Math.max(0, layout.height - keep.bottom)
        bands.bottom = [10, Math.max(52, room * 0.45)]
      }
      const key = `${wash.toFixed(4)}|${fill.toFixed(4)}|${keep.left}|${keep.top}|${keep.right}|${keep.bottom}|${layout.width}x${layout.height}|${photo.top.toFixed(1)}|${photo.left.toFixed(1)}`
      if (key === lastPaperKey) return
      lastPaperKey = key
      if (paper) {
        paper.render({
          layout,
          wash,
          origin: {
            x: (keep.left + keep.right) / 2,
            y: (keep.top + keep.bottom) / 2,
          },
          keep,
          photo,
          mist,
          bands,
          hug,
          color: paperColor,
          dark: true,
          standing: true,
          veil: VEIL,
          fill,
          fillColor: pageColor,
        })
      } else {
        paperCanvas.style.background = `rgb(${paperColor.map((c) => c * 255).join(",")})`
        paperCanvas.style.opacity = String(Math.max(wash, fill))
      }
    }

    let beaconShown = false
    const drawBeacon = (t: number, camera: number, sway: number) => {
      if (!beacon) return
      const photoTop = photoWorldTop() - camera
      const eyes = eyesAt(photoTop)
      const power = beam && t > GIANT.eyes ? eyes.power : 0
      const show = power > 0.001 && beacon.ready()
      if (show !== beaconShown) {
        beaconShown = show
        beaconCanvas.style.visibility = show ? "visible" : "hidden"
      }
      if (!show || !beam) return
      beacon.render({
        width: layout.width,
        height: layout.height,
        photo: {
          left: layout.left + sway,
          top: photoTop,
          width: WORLD.width * layout.scale,
          height: PHOTO_HEIGHT * layout.scale,
        },
        eyes: [eyes.left, eyes.right],
        aim: aimAt(beam),
        power,
        color: [EYE_RGB[0] / 255, EYE_RGB[1] / 255, EYE_RGB[2] / 255],
      })
    }

    const render = (t: number) => {
      const fill = paperFillAt(performance.now())
      // The ground shakes when he lands.
      // Two rhythms on each axis, so it rattles instead of bouncing.
      const since = t - GIANT.impact
      const jolt = since > 0 && since < 1.2 ? 7 * Math.exp(-since / 0.2) : 0
      // Sideways only as far as the world overhangs the screen.
      const slack = Math.max(
        0,
        Math.min(
          -layout.left,
          layout.left + WORLD.width * layout.scale - layout.width
        )
      )
      const sway = Math.max(
        -slack,
        Math.min(
          slack,
          jolt * (0.6 * Math.sin(since * 47 + 1) + 0.4 * Math.sin(since * 83))
        )
      )
      const camera =
        cameraAt(t) +
        jolt * (0.65 * Math.sin(since * 61) + 0.35 * Math.sin(since * 109 + 2))
      world.style.transform = `translate3d(${sway}px, ${-camera}px, 0)`
      drawFx(t, camera, sway)
      drawBeacon(t, camera, sway)
      drawPaper(t, camera, sway, fill)
      if (!revealed && t >= GIANT.reveal) {
        revealed = true
        onRevealRef.current?.()
      }
    }

    // Safari tints its toolbars from this fixed layer's background: night
    // sky while he falls, paper once the page has settled.
    let tinted: boolean | null = null
    const tintBars = (t: number) => {
      const settled = t >= GIANT.paperEnd
      if (settled === tinted) return
      tinted = settled
      scene.style.background = settled ? "var(--background)" : ZENITH
    }

    resize()
    readSky()
    tintBars(clock)
    render(clock)

    const onResize = () => {
      resize()
      render(clock)
    }
    window.addEventListener("resize", onResize)

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.known = true
    }
    const onPointerLeave = () => {
      pointer.known = false
    }
    // A double click lights the way there (touch has its own, below).
    const stopDoubleClicks = watchDoubleClicks(doubleAt)
    // Touch: a tap is where he looks; a double tap lights the way there.
    let lastTap = { at: -Infinity, x: 0, y: 0 }
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || isInteractive(event.target)) return
      const at = performance.now()
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.known = true
      if (
        at - lastTap.at < 320 &&
        Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 40
      ) {
        doubleAt(event.clientX, event.clientY)
        lastTap = { at: -Infinity, x: 0, y: 0 }
      } else {
        lastTap = { at, x: event.clientX, y: event.clientY }
      }
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerup", onPointerUp, { passive: true })
    document.documentElement.addEventListener("mouseleave", onPointerLeave)

    let frame = 0
    let frames = 0
    let previous = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000)
      previous = now
      frames++
      if (!sky) readSky()
      // Wait for the painting, but never hold the copy hostage to it.
      if (
        !running &&
        (worldReadyRef.current || now - mountedAt > WORLD_WAIT_MS)
      ) {
        running = true
      }
      if (running && !scrub) {
        clock += dt
      }
      tintBars(clock)
      // Once everything has come to rest only his eyes move, and slowly:
      // a third of the frames is plenty, except through a blink.
      wall = now / 1000
      const moving =
        clock > GIANT.eyes &&
        stepEyes(
          clock,
          Math.min(0.05, wall - lastWall),
          photoWorldTop() - cameraAt(clock)
        )
      lastWall = wall
      const open = clock - GIANT.eyes
      const resting =
        clock > GIANT.impact + 5.5 &&
        open % 5.3 < 5 &&
        !moving &&
        !beam &&
        wall - closedAt > 0.7
      // Changing pages, every frame.
      const filling = paperFillAt(now) > 0
      if (!resting || filling || frames % 3 === 0) render(clock)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      releaseHome()
      window.removeEventListener("resize", onResize)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      stopDoubleClicks()
      document.documentElement.removeEventListener("mouseleave", onPointerLeave)
      beacon?.dispose()
      matte.onload = null
      paper?.dispose()
    }
  }, [playIntro])

  return (
    <div
      ref={sceneRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      style={{ background: playIntro ? ZENITH : "var(--background)" }}
    >
      <div
        ref={worldRef}
        className="absolute top-0 left-0 will-change-transform"
        style={{ background: ZENITH }}
      >
        <Image
          src={WORLD.src}
          alt=""
          fill
          priority
          // Already a small webp; re-encoding it loses the faint stars
          // low in the sky, which is the part the page rests on.
          unoptimized
          className="object-cover"
          onLoad={() => {
            worldReadyRef.current = true
          }}
        />
      </div>
      <canvas ref={fxRef} className="absolute inset-0 z-[1] h-full w-full" />
      {/* The searchlights: added onto the scene, under the paper. */}
      <canvas
        ref={beaconRef}
        className="invisible absolute inset-0 z-[1] h-full w-full mix-blend-screen"
      />
      <canvas ref={paperRef} className="absolute inset-0 z-[2] h-full w-full" />
    </div>
  )
}

function smoothstep(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** An element's background as 0–1 RGB, whatever color space CSS uses. */
function readColor(element: Element): [number, number, number] {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) return [0.04, 0.04, 0.04]
  context.fillStyle = getComputedStyle(element).backgroundColor
  context.fillRect(0, 0, 1, 1)
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

/** Union of everything the paper must stay under, in viewport pixels. */
function readKeepRect() {
  const rect = {
    left: Infinity,
    top: Infinity,
    right: -Infinity,
    bottom: -Infinity,
  }
  document.querySelectorAll<HTMLElement>("[data-paper-keep]").forEach((el) => {
    const box = el.getBoundingClientRect()
    if (!box.width || !box.height) return
    rect.left = Math.min(rect.left, box.left)
    rect.top = Math.min(rect.top, box.top)
    rect.right = Math.max(rect.right, box.right)
    rect.bottom = Math.max(rect.bottom, box.bottom)
  })
  if (!Number.isFinite(rect.left)) {
    const w = window.innerWidth
    const h = window.innerHeight
    return { left: w * 0.3, top: h * 0.3, right: w * 0.7, bottom: h * 0.6 }
  }
  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
  }
}
