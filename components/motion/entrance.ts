/**
 * The site's copy entrance: each block rises 18px out of a blur, staggered
 * by `delay` steps. Shared by the homepage, mute and the music archive.
 */

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(12px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
}

export const entranceTransition = (delay: number) => ({
  duration: 0.95,
  delay: delay * 0.82,
  ease: EASE,
})
