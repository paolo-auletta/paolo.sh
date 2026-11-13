/*
 * The Greek key, shared by the album's rules and play button and by Miky's
 * coin. scripts/miky-coin/bake.py redraws the coin's ring in Python, so the
 * ring's geometry here must stay in step with it.
 */

/** One Greek key on a 10×8 grid, entering bottom left, leaving bottom right. */
export const KEY: [number, number][] = [
  [0, 8],
  [0, 0],
  [8, 0],
  [8, 6],
  [4, 6],
  [4, 4],
  [6, 4],
  [6, 2],
  [2, 2],
  [2, 8],
  [10, 8],
]

/**
 * A running Greek key bent into a ring, as an SVG path in a 100×100 box.
 * The key is wrapped around the circle `keys` times, x along the ring and y
 * from the rim inwards: a grid row y sits at radius
 * `outer - (y + inset) * step`. Straight runs along the ring are bent into
 * short steps, so they read as arcs.
 */
export function meanderRing({
  keys,
  outer,
  step,
  inset,
}: {
  keys: number
  outer: number
  step: number
  inset: number
}) {
  const at = (x: number, y: number) => {
    const a = (x / (keys * 10)) * Math.PI * 2 - Math.PI / 2
    const r = outer - (y + inset) * step
    return `${(50 + Math.cos(a) * r).toFixed(2)} ${(50 + Math.sin(a) * r).toFixed(2)}`
  }
  const points: string[] = []
  for (let k = 0; k < keys; k++) {
    KEY.forEach(([x, y], i) => {
      // The first point continues the previous key's bottom run.
      if (k > 0 && i === 0) return
      const prev = i > 0 ? KEY[i - 1] : null
      if (prev && prev[1] === y && Math.abs(x - prev[0]) > 1) {
        const n = Math.abs(x - prev[0]) * 2
        for (let j = 1; j < n; j++)
          points.push(at(k * 10 + prev[0] + ((x - prev[0]) * j) / n, y))
      }
      points.push(at(k * 10 + x, y))
    })
  }
  return `M${points.join("L")}Z`
}
