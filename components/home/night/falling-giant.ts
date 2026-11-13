import { GIANT_EYE, rasterizeGiant } from "@/components/home/ascii-giant"
import { bucketCells } from "@/components/home/ascii-sdf"
import { clamp01, mix, smoothstep } from "@/components/home/math"
import { GIANT } from "@/components/home/night/config"
import { giantAt, type NightLayout } from "@/components/home/night/layout"

/** The type the night is drawn in, in px. */
export type NightType = {
  font: string
  fontSize: number
  cellWidth: number
  cellHeight: number
}

/**
 * The Giant at time `t`, `camera` px down the world: first a point of light
 * far off in the night that grows into a star, then the star falling, which
 * is him, in type. `buckets` is kept between frames to save allocations;
 * `airAt` is the night's color at a height in the world.
 */
export function drawFallingGiant(
  ctx: CanvasRenderingContext2D,
  t: number,
  camera: number,
  layout: NightLayout,
  type: NightType,
  buckets: Map<number, number[]>,
  airAt: (y: number) => [number, number, number]
) {
  const { width, height } = layout
  const { font, fontSize, cellWidth, cellHeight } = type
  const giant = giantAt(t, layout)
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
    const onCell = bucketCells(buckets)
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
      onCell
    )
    // The night air between us and him: the farther off he is, the
    // more his steel takes the color of the sky around him.
    const air = airAt(giant.y)
    const haze = 0.06 + 0.42 * Math.pow(giant.distance, 1.3)
    // He is solid: nothing behind him shows between his glyphs. Every
    // cell he covers is first filled with the night around him, which
    // hides the stars and clouds he passes in front of and leaves the
    // glyphs themselves as they were.
    ctx.fillStyle = `rgb(${air[0]},${air[1]},${air[2]})`
    ctx.beginPath()
    for (const cells of buckets.values()) {
      for (let i = 0; i < cells.length; i += 3) {
        ctx.rect(
          cells[i] * cellWidth - 0.25,
          cells[i + 1] * cellHeight - 0.25,
          cellWidth + 0.5,
          cellHeight + 0.5
        )
      }
    }
    ctx.fill()
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
}
