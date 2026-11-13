import type { GiantPose } from "@/components/home/ascii-giant"
import { clamp01, mix, smoother, smoothstep } from "@/components/home/math"
import {
  EYES,
  GIANT,
  LANDING,
  PHOTO_HEIGHT,
  RIDGE_ROW,
  WORLD,
} from "@/components/home/night/config"

/** Where the night's world sits on a screen. */
export type NightLayout = {
  width: number
  height: number
  compact: boolean
  /** Screen px per world px. */
  scale: number
  /** The world's left edge on screen. */
  left: number
  /** Where the resting part's top edge sits once the camera has landed. */
  photoTop: number
  /** How far the camera travels, in screen px. */
  descent: number
  /** Where the eyes open, in the resting part's pixels. */
  eyes: { x: number; y: number }
}

export function layoutFor(width: number, height: number): NightLayout {
  const compact = width < 640
  const scale = Math.max(width / WORLD.width, height / PHOTO_HEIGHT)
  const lowest = height - PHOTO_HEIGHT * scale
  const eyes = compact ? EYES.compact : EYES.wide
  // Desktop rests like the day scene, a little higher (the pines need room).
  // Phones have only a strip under the copy, so the world sits as low as it
  // goes, which brings the row of pines along its bottom into that strip,
  // and is framed on the gap where the eyes open. Never a gap at the edges.
  const photoTop = compact
    ? lowest
    : Math.max(height * 0.56 - RIDGE_ROW * scale, lowest)
  const left = compact
    ? Math.min(
        0,
        Math.max(width - WORLD.width * scale, width * 0.48 - eyes.x * scale)
      )
    : (width - WORLD.width * scale) / 2
  return {
    width,
    height,
    compact,
    scale,
    left,
    photoTop,
    descent: (WORLD.height - PHOTO_HEIGHT) * scale - photoTop,
    eyes,
  }
}

/** How far down the world the camera has come at a time, in screen px. */
export const cameraAt = (t: number, layout: NightLayout) =>
  smoother(
    clamp01((t - GIANT.cameraStart) / (GIANT.cameraEnd - GIANT.cameraStart))
  ) * layout.descent

/** The resting part's top edge in the world, and the landing spot. */
export const photoWorldTop = (layout: NightLayout) =>
  (WORLD.height - PHOTO_HEIGHT) * layout.scale
export const landingX = (layout: NightLayout) =>
  layout.left + LANDING.x * layout.scale

/** The resting part of the painting on screen, `camera` px down the world. */
export const photoOnScreen = (
  layout: NightLayout,
  camera: number,
  sway: number
) => ({
  left: layout.left + sway,
  top: photoWorldTop(layout) - camera,
  width: WORLD.width * layout.scale,
  height: PHOTO_HEIGHT * layout.scale,
})

/**
 * Where the Giant is at a time: x on screen, y in the world, his length
 * in px, and his pose. A straight dive that only ever gains speed; he
 * comes out of the distance, passes close, and is far again when he lands.
 */
export function giantAt(t: number, layout: NightLayout) {
  const u = clamp01((t - GIANT.fall) / (GIANT.impact - GIANT.fall))
  const along = Math.pow(u, 1.7)
  const x0 = layout.width * (layout.compact ? 0.16 : 0.21)
  const y0 = layout.height * 0.13
  const x1 = landingX(layout)
  const y1 = photoWorldTop(layout) + LANDING.y * layout.scale
  const full = Math.min(340, Math.max(210, layout.height * 0.36))
  const near = smoothstep(0, 0.52, u) * mix(1, 0.26, smoothstep(0.6, 1, u))
  const pose: GiantPose = {
    heading: Math.atan2(y0 - y1, x1 - x0),
    // Head toward us on the way in, away once he has passed.
    lean: mix(0.62, -0.5, smoothstep(0.1, 0.95, u)),
    roll: 0.5 + (t - GIANT.fall) * 1.5,
    flutter: t * 9,
  }
  return {
    u,
    x: mix(x0, x1, along),
    y: mix(y0, y1, along),
    size: full * (0.02 + 0.98 * near),
    /** 0 right in front of us, 1 far off in the night. */
    distance: 1 - near,
    pose,
  }
}
