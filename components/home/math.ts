/**
 * The little bits of arithmetic the homepage's scenes share. Each is written
 * exactly as the scenes always had it: the motion depends on the very same
 * floating-point results, so keep the expressions as they are.
 */

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** From `a` at 0 to `b` at 1. */
export const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** Gentle at both ends, for an `x` already in 0–1. */
export const smooth01 = (x: number) => x * x * (3 - 2 * x)

/** Gentler still at both ends (zero acceleration there too), for 0–1. */
export const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)

/** 0 below `a`, 1 above `b`, easing in and out between. */
export function smoothstep(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** A random number between `a` and `b`. */
export const between = (a: number, b: number) => a + Math.random() * (b - a)

/** A fixed scatter in [0, 1), so every replay (and any frozen frame) is the same. */
export const scatter = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}
