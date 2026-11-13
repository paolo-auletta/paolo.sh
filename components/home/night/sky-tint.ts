import { WORLD } from "@/components/home/night/config"
import type { NightLayout } from "@/components/home/night/layout"

const SKY_ROWS = 48

/**
 * The sky's color down the height of the world, to tint the Giant with the
 * air he is falling through. Read off the painting (the `img` in `world`)
 * once it's in; `onPainting` is told when it first is.
 */
export function createSkyTint(world: HTMLElement, onPainting: () => void) {
  let sky: Uint8ClampedArray | null = null
  return {
    /** Whether the colors have been read yet. */
    get known() {
      return sky !== null
    },
    /** Reads the colors, if the painting is in and they aren't read yet. */
    read() {
      const image = world.querySelector("img")
      if (sky || !image?.complete || !image.naturalWidth) return
      onPainting()
      const strip = document.createElement("canvas")
      strip.width = 8
      strip.height = SKY_ROWS
      const s = strip.getContext("2d", { willReadFrequently: true })
      if (!s) return
      try {
        s.drawImage(image, 0, 0, strip.width, strip.height)
        const pixels = s.getImageData(0, 0, strip.width, strip.height).data
        sky = new Uint8ClampedArray(SKY_ROWS * 3)
        for (let row = 0; row < SKY_ROWS; row++) {
          for (let channel = 0; channel < 3; channel++) {
            let sum = 0
            for (let x = 0; x < strip.width; x++) {
              sum += pixels[(row * strip.width + x) * 4 + channel]
            }
            sky[row * 3 + channel] = sum / strip.width
          }
        }
      } catch {
        // A tainted canvas: he keeps his own colors.
      }
    },
    /** The sky's color at a height in the world (screen px from its top). */
    at(y: number, layout: NightLayout): [number, number, number] {
      if (!sky) return [10, 15, 36]
      const row = Math.min(
        SKY_ROWS - 1,
        Math.max(0, Math.round((y / (WORLD.height * layout.scale)) * SKY_ROWS))
      )
      return [sky[row * 3], sky[row * 3 + 1], sky[row * 3 + 2]]
    },
  }
}
