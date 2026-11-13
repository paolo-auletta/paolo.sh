import { DriftingClouds } from "@/components/home/drifting-clouds"
import { smoothstep } from "@/components/home/math"
import {
  GIANT,
  RIDGE_ROW,
  SPRITES,
  type SpriteName,
} from "@/components/home/night/config"
import { photoWorldTop, type NightLayout } from "@/components/home/night/layout"
import type { DrawSprite } from "@/components/home/night/sprites"
import { readKeepRect } from "@/components/home/scene-dom"

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

/** Once the page has settled: more of the film's clouds, coming and going. */
const DRIFTER_SPRITES = ["cloudA", "cloudB", "cloudC"] as const

/**
 * The night's clouds, on a layer of their own, so that once the copy is on
 * the page they can thin away around it instead of sliding behind it: a
 * soft-edged shape of the copy is cut out of them. The landing's smoke
 * parts around the copy through the same shape.
 */
export function createNightClouds(drawSprite: DrawSprite) {
  const drifting = new DriftingClouds({
    sprites: DRIFTER_SPRITES.map((name) => SPRITES[name]),
    size: [0.26, 0.58],
    alpha: [0.5, 0.85],
    phoneWidth: 0.62,
  })

  const cloudLayer = document.createElement("canvas")
  const clouds = cloudLayer.getContext("2d")
  const cloudMask = document.createElement("canvas")
  let cloudMaskKey = ""
  const shapeCloudMask = (ratio: number, layout: NightLayout) => {
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

  return {
    /**
     * Draws the clouds into `ctx` (the effects canvas `fx`, at `ratio`
     * device px per px, shifted `sway` px) at scene time `t`, `camera` px
     * down the world; `wall` is the wall clock in s.
     */
    draw(
      ctx: CanvasRenderingContext2D,
      fx: HTMLCanvasElement,
      ratio: number,
      t: number,
      camera: number,
      sway: number,
      layout: NightLayout,
      wall: number
    ) {
      const { width, height, scale } = layout
      // A little nearer than the stars, so they pass a little faster.
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
      if (t > GIANT.paperEnd) {
        // Kept to the sky above the hills.
        const bounds = {
          width,
          height,
          top: height * 0.03,
          bottom: photoWorldTop(layout) - camera + (RIDGE_ROW - 30) * scale,
          scale,
        }
        drifting.step(wall, bounds, (sprite, x, y, w, alpha, flip) => {
          drawSprite(DRIFTER_SPRITES[sprite], x, y, w, {
            alpha,
            flip,
            into: paint,
          })
        })
      }
      if (clouds) {
        const wash = smoothstep(GIANT.paperStart, GIANT.paperEnd, t)
        if (wash > 0) {
          shapeCloudMask(ratio, layout)
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
    },

    /**
     * Clears what `ctx` holds around the copy by `amount` (0–1), through
     * the clouds' soft shape of it.
     */
    partAroundCopy(
      ctx: CanvasRenderingContext2D,
      ratio: number,
      amount: number,
      layout: NightLayout
    ) {
      if (!clouds) return
      shapeCloudMask(ratio, layout)
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = "destination-out"
      ctx.globalAlpha = amount
      ctx.drawImage(cloudMask, 0, 0)
      ctx.restore()
    },
  }
}
