import { clamp01, mix, scatter, smoothstep } from "@/components/home/math"
import { SPRITES } from "@/components/home/night/config"
import type { DrawSprite } from "@/components/home/night/sprites"

/** How long the landing goes on, in s after the impact. */
export const LANDING_LASTS = 5

/** When the burst's own cloud has thinned away, in s after the impact. */
const BURST_GONE = 1.5

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
  const sprite: "smoke" | "puff" = i % 5 === 1 ? "smoke" : "puff"
  return {
    sprite,
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

/**
 * The landing behind the ridge, `since` s after the impact (0 to
 * LANDING_LASTS): dust rolling out along the ground, the smoke going up,
 * dirt thrown up and falling back, and the burst over it all. `groundX` and
 * `ridgeY` are the landing spot and the ridge above it, on screen.
 */
export function drawLanding(
  ctx: CanvasRenderingContext2D,
  drawSprite: DrawSprite,
  since: number,
  groundX: number,
  ridgeY: number,
  scale: number,
  fontSize: number,
  font: string
) {
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
        (side * (30 + 190 * (1 - Math.exp(-s / 0.55))) + 14 * gas.grow) * unit,
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
    const gas = thinning((s - puff.thinFrom) / (puff.life - puff.thinFrom))
    drawSprite(
      puff.sprite,
      groundX +
        (Math.sin(puff.angle) * thrown +
          11 * s * s +
          Math.sin(s * 1.9 + puff.phase) * 5 +
          puff.drift * gas.grow) *
          unit,
      baseY -
        (Math.cos(puff.angle) * thrown + puff.lift * s + puff.rise * gas.grow) *
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
        (Math.cos(bit.angle) * bit.speed * since - 520 * since * since) * unit
    )
  }

  // The burst itself, over everything: a flash that cools at once, then
  // hangs there as a cloud of its own and thins away like the rest. Its
  // rays point up and to the left in the film; the turn stands them up.
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
