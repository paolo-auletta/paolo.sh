/**
 * The day sky once the page has settled: clouds coming and going, as the
 * night scene has them. Each one either drifts in from a side or gathers
 * out of nothing where it is, breathes a little as it goes, and in time
 * drifts off or thins away; then, after a pause, another takes its place.
 * Slow, and kept to the sky above the hills.
 */

type Sprite = { src: string; width: number; height: number }

const SPRITES: Sprite[] = [
  { src: "/home/cloud-wisp.webp", width: 260, height: 137 },
  { src: "/home/cloud-puffs.webp", width: 286, height: 88 },
  { src: "/home/cloud-bank.webp", width: 335, height: 205 },
  { src: "/home/cloud-tower.webp", width: 390, height: 335 },
]

type Drifter = {
  sprite: number
  /** Where it was at `born`, px. */
  x: number
  /** Height in the sky, 0 its top, 1 just above the hills. */
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

export type SkyBounds = {
  width: number
  height: number
  /** Screen y of the highest and lowest cloud centers. */
  top: number
  bottom: number
  /** The painting's scale on screen, so clouds match its clouds. */
  scale: number
}

const between = (a: number, b: number) => a + Math.random() * (b - a)

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export class DriftingClouds {
  private images = SPRITES.map((sprite) => {
    const image = new Image()
    image.decoding = "async"
    image.src = sprite.src
    return image
  })
  private drifters: (Drifter | null)[] = []
  private respawnAt: number[] = []
  private startedAt = -1

  private count(width: number) {
    return width < 640 ? 3 : width < 1024 ? 4 : 6
  }

  private widthOf(d: Drifter, bounds: SkyBounds) {
    return (
      SPRITES[d.sprite].width *
      d.size *
      bounds.scale *
      (bounds.width < 640 ? 0.7 : 1)
    )
  }

  private spawn(slot: number, now: number, bounds: SkyBounds) {
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
      sprite: Math.floor(Math.random() * SPRITES.length),
      x: 0,
      y,
      size: between(0.6, 1.1),
      speed,
      flip: Math.random() < 0.5,
      born: now,
      gathered: Math.random() < 0.4,
      thinsAt: now + between(35, 80),
      thinning: between(6, 10),
      alpha: between(0.75, 1),
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

  /** Draws the clouds as they are at `now` (seconds, wall clock). */
  draw(context: CanvasRenderingContext2D, now: number, bounds: SkyBounds) {
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
      const image = this.images[d.sprite]
      if (!image.complete || !image.naturalWidth) continue
      const alpha =
        d.alpha *
        (d.gathered ? smoothstep(d.born, d.born + 8, now) : 1) *
        (1 - smoothstep(d.thinsAt, d.thinsAt + d.thinning, now)) *
        (0.85 +
          0.15 *
            Math.sin((now / d.breathe.period) * Math.PI * 2 + d.breathe.phase))
      if (alpha <= 0.004) continue
      const h = (w * SPRITES[d.sprite].height) / SPRITES[d.sprite].width
      const y = bounds.top + (bounds.bottom - bounds.top) * d.y
      context.save()
      context.globalAlpha = Math.min(1, alpha)
      context.translate(x, y)
      if (d.flip) context.scale(-1, 1)
      context.drawImage(image, -w / 2, -h / 2, w, h)
      context.restore()
    }
  }
}
