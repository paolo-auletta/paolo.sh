import { projectGiantPoint } from "@/components/home/ascii-giant"
import { clamp01, mix } from "@/components/home/math"
import { GIANT } from "@/components/home/night/config"
import { giantAt, type NightLayout } from "@/components/home/night/layout"

/** The trail's glyphs, from just shed to almost gone. */
const TRAIL = "#%*+=~-:."

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

/** The smoke the Giant leaves behind him as he falls, in type. */
export class Trail {
  private readonly puffs: Puff[] = []
  /** Part of a puff owed from the last step, so none are lost between frames. */
  private carry = 0
  /** The scene time the trail was last stepped to. */
  private clock: number

  constructor(clock: number) {
    this.clock = clock
  }

  /** Drops every puff (the screen changed under them). */
  clear() {
    this.puffs.length = 0
  }

  /** Sheds the trail up to a time and ages it. */
  private step(t: number, dt: number, layout: NightLayout) {
    if (dt <= 0) return
    const trail = this.puffs
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
    const now = giantAt(t, layout)
    const before = giantAt(t - dt, layout)
    const tail = projectGiantPoint(now.pose, now.size / 2, -0.95, 0, 0)
    const dx = now.x - before.x
    const dy = now.y - before.y
    const distance = Math.hypot(dx, dy)
    // One puff every few px of the way: a tight, unbroken line behind him.
    const spacing = Math.max(2.6, now.size * 0.028)
    this.carry += distance / spacing
    const count = Math.floor(this.carry)
    this.carry -= count
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
  simulate(to: number, layout: NightLayout) {
    this.puffs.length = 0
    this.carry = 0
    const step = 1 / 60
    for (let t = Math.max(GIANT.fall, to - 2.5); t < to; t += step) {
      this.step(t, step, layout)
    }
    this.clock = to
  }

  /**
   * Steps the trail on to `t` and draws it, `camera` px down the world:
   * white where it leaves him, thinning to blue-grey smoke.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    t: number,
    camera: number,
    layout: NightLayout,
    fontSize: number,
    font: string
  ) {
    const dt = Math.min(0.1, Math.max(0, t - this.clock))
    this.clock = t
    this.step(t, dt, layout)

    for (const puff of this.puffs) {
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
  }
}
