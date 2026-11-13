import { between, smoothstep } from "@/components/home/math"

/**
 * Both skies once the page has settled: clouds coming and going. Each one
 * either drifts in from a side or gathers out of nothing where it is,
 * breathes a little as it goes, and in time drifts off or thins away; then,
 * after a pause, another takes its place. Slow, and kept to the sky above
 * the hills.
 */

/** What a sky's clouds look like. */
type DrifterLook = {
  /** The sprites' sizes in their own px, the clouds picked evenly from them. */
  sprites: readonly { width: number; height: number }[]
  /** Size against the sprite's, at the painting's scale. */
  size: [number, number]
  alpha: [number, number]
  /** Phones show them smaller, by this much. */
  phoneWidth: number
}

type Drifter = {
  /** Which of the look's sprites. */
  sprite: number
  /** Where it was at `born`, px. */
  x: number
  /** Height in the sky, 0 its top, 1 its bottom. */
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

type SkyBounds = {
  width: number
  height: number
  /** Screen y of the highest and lowest cloud centers. */
  top: number
  bottom: number
  /** The painting's scale on screen, so clouds match its clouds. */
  scale: number
}

/** One cloud to draw: centered on x, y, `width` px wide. */
type DrawDrifter = (
  sprite: number,
  x: number,
  y: number,
  width: number,
  alpha: number,
  flip: boolean
) => void

export class DriftingClouds {
  private drifters: (Drifter | null)[] = []
  private respawnAt: number[] = []
  private startedAt = -1

  constructor(private readonly look: DrifterLook) {}

  private count(width: number) {
    return width < 640 ? 3 : width < 1024 ? 4 : 6
  }

  private widthOf(d: Drifter, bounds: SkyBounds) {
    return (
      this.look.sprites[d.sprite].width *
      d.size *
      bounds.scale *
      (bounds.width < 640 ? this.look.phoneWidth : 1)
    )
  }

  private spawn(slot: number, now: number, bounds: SkyBounds) {
    const { look } = this
    const compact = bounds.width < 640
    const speed =
      between(3, 8.5) * (compact ? 0.7 : 1) * (Math.random() < 0.5 ? -1 : 1)
    // Not right on top of another one.
    let y = between(0, 1)
    for (let attempt = 0; attempt < 8; attempt++) {
      const clear = this.drifters.every(
        (other, i) => i === slot || !other || Math.abs(other.y - y) > 0.18
      )
      if (clear) break
      y = between(0, 1)
    }
    const drifter: Drifter = {
      sprite: Math.floor(Math.random() * look.sprites.length),
      x: 0,
      y,
      size: between(look.size[0], look.size[1]),
      speed,
      flip: Math.random() < 0.5,
      born: now,
      gathered: Math.random() < 0.4,
      thinsAt: now + between(35, 80),
      thinning: between(6, 10),
      alpha: between(look.alpha[0], look.alpha[1]),
      breathe: { period: between(16, 32), phase: between(0, Math.PI * 2) },
    }
    const w = this.widthOf(drifter, bounds)
    drifter.x = drifter.gathered
      ? between(0.1, 0.9) * bounds.width
      : speed > 0
        ? -w / 2
        : bounds.width + w / 2
    this.drifters[slot] = drifter
  }

  /**
   * Moves the clouds on to `now` (seconds, the caller's wall clock) and
   * hands each one in the sky to `draw`, in order.
   */
  step(now: number, bounds: SkyBounds, draw: DrawDrifter) {
    if (this.startedAt < 0) {
      // The first ones show up one at a time.
      this.startedAt = now
      for (let i = 0; i < 6; i++) {
        this.respawnAt[i] = now + 0.8 + i * between(1.5, 3.5)
      }
    }
    const count = this.count(bounds.width)
    for (let i = 0; i < count; i++) {
      let d = this.drifters[i]
      if (!d) {
        if (now < (this.respawnAt[i] ?? 0)) continue
        this.spawn(i, now, bounds)
        d = this.drifters[i]
        if (!d) continue
      }
      const w = this.widthOf(d, bounds)
      const x = d.x + d.speed * (now - d.born)
      const gone =
        (d.speed > 0 ? x - w / 2 > bounds.width : x + w / 2 < 0) ||
        now > d.thinsAt + d.thinning
      if (gone) {
        this.drifters[i] = null
        this.respawnAt[i] = now + between(3, 12)
        continue
      }
      const alpha =
        d.alpha *
        (d.gathered ? smoothstep(d.born, d.born + 8, now) : 1) *
        (1 - smoothstep(d.thinsAt, d.thinsAt + d.thinning, now)) *
        (0.85 +
          0.15 *
            Math.sin((now / d.breathe.period) * Math.PI * 2 + d.breathe.phase))
      const y = bounds.top + (bounds.bottom - bounds.top) * d.y
      draw(d.sprite, x, y, w, alpha, d.flip)
    }
  }
}

const DAY_SPRITES = [
  { src: "/home/cloud-wisp.webp", width: 260, height: 137 },
  { src: "/home/cloud-puffs.webp", width: 286, height: 88 },
  { src: "/home/cloud-bank.webp", width: 335, height: 205 },
  { src: "/home/cloud-tower.webp", width: 390, height: 335 },
]

/** The day sky's clouds: the painting's own, a little larger than the night's. */
export function createDayClouds() {
  const images = DAY_SPRITES.map((sprite) => {
    const image = new Image()
    image.decoding = "async"
    image.src = sprite.src
    return image
  })
  const clouds = new DriftingClouds({
    sprites: DAY_SPRITES,
    size: [0.6, 1.1],
    alpha: [0.75, 1],
    phoneWidth: 0.7,
  })
  return {
    /** Draws the clouds as they are at `now` (seconds, wall clock). */
    draw(context: CanvasRenderingContext2D, now: number, bounds: SkyBounds) {
      clouds.step(now, bounds, (sprite, x, y, w, alpha, flip) => {
        const image = images[sprite]
        if (!image.complete || !image.naturalWidth) return
        if (alpha <= 0.004) return
        const h = (w * DAY_SPRITES[sprite].height) / DAY_SPRITES[sprite].width
        context.save()
        context.globalAlpha = Math.min(1, alpha)
        context.translate(x, y)
        if (flip) context.scale(-1, 1)
        context.drawImage(image, -w / 2, -h / 2, w, h)
        context.restore()
      })
    },
  }
}
