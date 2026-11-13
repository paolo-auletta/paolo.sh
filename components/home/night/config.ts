import { GIANT_EYE } from "@/components/home/ascii-giant"

/** The night scene's painting, sprites and timeline. */

/** Generated starry sky on top, the film's stitched tilt-down underneath. */
export const WORLD = {
  src: "/home/giant/night-world.webp",
  width: 2000,
  height: 3200,
}
/** Height of the part of the world the scene rests on (its bottom). */
export const PHOTO_HEIGHT = 1100
/** Row of that part that rests where the day scene's ridge does. */
export const RIDGE_ROW = 430
/** Red: the land. Green: the pines alone, which phones cut out of the paper. */
export const MATTES = "/home/giant/night-mattes.webp"
/** Where the Giant comes down, in that part's pixels. */
export const LANDING = { x: 1180, y: 712 }
/**
 * Where his eyes open. On a wide screen, where he landed. Phones show only
 * a strip under the copy, so there it is a gap in the pines along the bottom.
 */
export const EYES = { wide: LANDING, compact: { x: 1150, y: 962 } }

/**
 * Cut out of the film's frames: its night clouds, and the burst and smoke of
 * a shell going off, regraded for moonlight.
 */
export const SPRITES = {
  cloudA: { src: "/home/giant/cloud-a.webp", width: 684, height: 145 },
  cloudB: { src: "/home/giant/cloud-b.webp", width: 960, height: 180 },
  cloudC: { src: "/home/giant/cloud-c.webp", width: 406, height: 242 },
  burst: { src: "/home/giant/burst.webp", width: 426, height: 383 },
  smoke: { src: "/home/giant/smoke.webp", width: 536, height: 461 },
  /** The same smoke without its thin trails: just the billows. */
  puff: { src: "/home/giant/puff.webp", width: 389, height: 378 },
} as const

export type SpriteName = keyof typeof SPRITES

/** The scene's timeline, in seconds. */
export const GIANT = {
  /**
   * Something far off in the empty sky: a faint point that brightens and
   * grows as it comes, until it is a star.
   */
  appear: 0.35,
  /** It starts to fall. */
  fall: 1.5,
  // The camera lets him get ahead, so he rides the middle of the frame
  // with his trail above him, and is still settling when he lands.
  cameraStart: 2.1,
  cameraEnd: 5.3,
  /** It drops behind the ridge and hits the ground. */
  impact: 4.8,
  /** The paper and the copy come in right behind the blast. */
  paperStart: 4.95,
  reveal: 5.2,
  paperEnd: 6.3,
  /** The eyes open as the smoke clears. */
  eyes: 7.5,
  /**
   * Where the scene rests when the intro doesn't play: the smoke all gone,
   * the eyes open.
   */
  settled: 9.0,
} as const

/** The eyes as searchlights: how long they hold a point before letting go. */
export const BEACON = { hold: 3, swing: 0.45, fade: 0.35 }

/**
 * How opaque the night paper is behind the copy. Well under 1, so the stars
 * still show through it; its thinner edges let even more of them through.
 */
export const VEIL = 0.5

/** His eyes' color, 0–255 RGB, and as CSS `r,g,b`. */
export const EYE_RGB: [number, number, number] = [
  GIANT_EYE >> 16,
  (GIANT_EYE >> 8) & 255,
  GIANT_EYE & 255,
]
export const EYE_CSS = EYE_RGB.join(",")

/** The night at the top of the world: what shows until the painting loads. */
export const ZENITH = "#05070f"
