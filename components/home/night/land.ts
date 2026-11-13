import {
  LANDING,
  MATTES,
  PHOTO_HEIGHT,
  WORLD,
} from "@/components/home/night/config"

/** The land, loaded from the mattes: what falls behind the hills is cut out. */
export type Land = {
  /** The land as an alpha mask over the resting part, once `ready`. */
  readonly canvas: HTMLCanvasElement
  ready: boolean
  /** The ridge above the landing spot, in the resting part's pixels. */
  ridgeRow: number
  /** Stops waiting for the mattes. */
  dispose(): void
}

/** Starts loading the land's mask; it is `ready` once the mattes are in. */
export function loadLand(): Land {
  const canvas = document.createElement("canvas")
  const matte = new window.Image()
  const land: Land = {
    canvas,
    ready: false,
    ridgeRow: LANDING.y - 90,
    dispose() {
      matte.onload = null
    },
  }
  matte.decoding = "async"
  matte.src = MATTES
  matte.onload = () => {
    canvas.width = matte.naturalWidth
    canvas.height = matte.naturalHeight
    const l = canvas.getContext("2d", { willReadFrequently: true })
    if (!l) return
    l.drawImage(matte, 0, 0)
    const data = l.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < data.data.length; i += 4) {
      data.data[i + 3] = data.data[i]
      data.data[i] = data.data[i + 1] = data.data[i + 2] = 0
    }
    l.putImageData(data, 0, 0)
    const column = Math.round((LANDING.x / WORLD.width) * canvas.width)
    for (let row = 0; row < canvas.height; row++) {
      if (data.data[(row * canvas.width + column) * 4 + 3] > 128) {
        land.ridgeRow = (row / canvas.height) * PHOTO_HEIGHT
        break
      }
    }
    land.ready = true
  }
  return land
}
