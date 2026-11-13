import { clamp01 } from "@/components/home/math"
import { SPRITES, type SpriteName } from "@/components/home/night/config"

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

/** Starts loading every sprite, in the order SPRITES lists them. */
export function loadSprites(): Record<SpriteName, HTMLImageElement> {
  const load = (name: SpriteName) => {
    const image = new window.Image()
    image.decoding = "async"
    image.src = SPRITES[name].src
    return image
  }
  return {
    cloudA: load("cloudA"),
    cloudB: load("cloudB"),
    cloudC: load("cloudC"),
    burst: load("burst"),
    smoke: load("smoke"),
    puff: load("puff"),
  }
}

type SpriteOptions = {
  /** The point of the sprite that sits on the spot it is drawn at. */
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
}

export type DrawSprite = (
  name: SpriteName,
  x: number,
  y: number,
  width: number,
  options?: SpriteOptions
) => void

/**
 * Draws the sprites once they are in, `width` px wide, into `fx` unless
 * told otherwise. Their softened copies are made the first time they are
 * asked for, and kept.
 */
export function spritePainter(
  sprites: Record<SpriteName, HTMLImageElement>,
  fx: CanvasRenderingContext2D
): DrawSprite {
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

  return (name, x, y, width, options = {}) => {
    if (!ready(name)) return
    const {
      core = [0.5, 0.5],
      alpha = 1,
      turn = 0,
      flip = false,
      squash = 1,
      soften = 0,
      into: g = fx,
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
}
