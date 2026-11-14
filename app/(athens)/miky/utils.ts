/** A shuffled copy of `items` (Fisher–Yates). */
export function shuffle<T>(items: T[]) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** `n` in Roman numerals, up to 39 (all /miky ever counts to). */
export function roman(n: number) {
  const marks: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ]
  let out = ""
  for (const [value, mark] of marks) {
    while (n >= value) {
      out += mark
      n -= value
    }
  }
  return out
}
