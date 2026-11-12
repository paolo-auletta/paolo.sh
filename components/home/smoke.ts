/**
 * A little ASCII smoke trail from the plane's engine. Each puff is a small
 * cluster of glyphs with its own drift, wobble, lifespan and shape, so the
 * trail breathes and never repeats: dense glyphs packed tight at the exhaust,
 * spreading apart and thinning to "~ - : ." as the puff disperses.
 */

type Puff = {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  size: number
  seed: number
  /** Fixed offsets (unit circle) and ramp jitter for the cluster's glyphs. */
  bits: { dx: number; dy: number; jitter: number }[]
}

/** Densest to sparsest. */
const RAMP = "%#*+=~-:·."

export class Smoke {
  private puffs: Puff[] = []
  private carry = 0

  clear() {
    this.puffs.length = 0
    this.carry = 0
  }

  /**
   * Advance by `dt` seconds and emit from (x, y). `scale` follows the plane's
   * on-screen size so a distant plane leaves a smaller trail.
   */
  update(dt: number, x: number, y: number, scale: number) {
    for (const puff of this.puffs) {
      puff.age += dt
      // Puffs slow down as they spread, and rise a touch.
      const drag = Math.exp(-dt * 1.6)
      puff.vx *= drag
      puff.vy = puff.vy * drag - 6 * dt
      puff.x += puff.vx * dt
      puff.y += puff.vy * dt
    }
    this.puffs = this.puffs.filter((puff) => puff.age < puff.life)

    if (dt <= 0 || scale <= 0) return
    // Irregular emission: bursts and lulls instead of a metronome.
    const rate = 24 + 12 * Math.sin(performance.now() / 310)
    this.carry += dt * rate
    while (this.carry >= 1) {
      this.carry -= 1 + (Math.random() - 0.5) * 0.6
      const spread = 0.35 + Math.random() * 0.65
      this.puffs.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 22 * spread,
        vy: (Math.random() - 0.5) * 22 * spread,
        age: Math.random() * 0.05,
        life: 1.1 + Math.random() * 1.2,
        size: (0.8 + Math.random() * 0.5) * Math.min(1.25, scale / 180 + 0.35),
        seed: Math.random() * 1000,
        bits: Array.from({ length: 3 + ((Math.random() * 4) | 0) }, (_, i) => {
          const angle = Math.random() * Math.PI * 2
          const radius = i === 0 ? 0 : 0.35 + Math.random() * 0.65
          return {
            dx: Math.cos(angle) * radius,
            dy: Math.sin(angle) * radius * 0.7,
            jitter: Math.random() * 2.2,
          }
        }),
      })
    }
  }

  draw(context: CanvasRenderingContext2D, font: string) {
    context.textAlign = "center"
    context.textBaseline = "middle"
    for (const puff of this.puffs) {
      const t = puff.age / puff.life
      const px = (10 + 4 * t) * puff.size
      // The cluster spreads as it ages; young puffs only show their core.
      const spread = (2 + 20 * Math.sqrt(t)) * puff.size
      const shown = Math.min(puff.bits.length, 1 + Math.floor(t * 9))
      const alpha = 0.85 * Math.pow(1 - t, 1.25) * Math.min(1, puff.age * 12)
      const wobbleX = Math.sin(puff.seed + puff.age * 7) * 2.5 * t
      const wobbleY = Math.cos(puff.seed * 1.7 + puff.age * 5) * 2 * t
      // Warm white near the engine, cooling to a soft blue-gray.
      const r = Math.round(252 - 46 * t)
      const g = Math.round(248 - 30 * t)
      const b = Math.round(240 - 6 * t)
      context.font = `700 ${px.toFixed(1)}px ${font}`
      context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`
      for (let i = 0; i < shown; i++) {
        const bit = puff.bits[i]
        const density = Math.min(
          RAMP.length - 1,
          Math.floor((t * 0.85 + bit.jitter * 0.12) * RAMP.length)
        )
        context.fillText(
          RAMP[density],
          puff.x + wobbleX + bit.dx * spread,
          puff.y + wobbleY + bit.dy * spread
        )
      }
    }
  }
}
