"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

import { mountPolish, type Pointer } from "./relief-gl"
import { useReliefPointer } from "./use-relief-pointer"

/*
 * Plaster that turns to polished metal where the cursor passes.
 *
 * Each relief is three baked images (scripts/album-relief/generate.py):
 * a plaster render, a normal map and a mask of the raised work. The cursor
 * paints into a small "wetness" buffer that slowly dries up; wherever it is
 * wet and the mask allows, the plaster is swapped for dark chrome lit by a
 * light that follows the cursor across the normals.
 *
 * At rest nothing renders: the plaster <img> is the page. The canvas only
 * draws while the cursor is over it or the metal is still fading. The
 * wetness and the frame loop are shared with Miky's coin (relief-gl.ts).
 */

export type ReliefName = "cover" | "column-l" | "column-r" | "disc" | "temple"

const SIZES: Record<ReliefName, [number, number]> = {
  cover: [1246, 1246],
  "column-l": [600, 1900],
  "column-r": [600, 1900],
  disc: [1440, 1440],
  temple: [2600, 1120],
}

/**
 * How a relief sits in its box.
 * - cover: fills the box, cropping what overflows, centred.
 * - pillar-left / pillar-right: a column always as tall as its box. It is as
 *   wide as the box allows (only the empty margins beside it may be cropped),
 *   and the fluted shaft stretches or shortens to make up the height, so the
 *   sky, capital and base keep their shape.
 */
export type Placement = "cover" | "pillar-left" | "pillar-right"

/** The share of a column image's width the column (capital) really spans. */
const PILLAR_BODY = 0.86
/** Rows of the column images (as a share of their height) that are shaft
 *  only; must match SHAFT_BAND in scripts/album-relief/generate.py. */
const PILLAR_SHAFT = [580 / 1900, 1600 / 1900] as const
/** How far the shaft may shorten before the whole column shrinks instead. */
const PILLAR_MIN_SHAFT = 0.7

/**
 * Where the image lands: x and width, plus a vertical map in three straight
 * pieces, from box rows (px, top down) to image rows (0–1, top down).
 */
type Quad = [number, number, number, number]
type Fit = { x: number; w: number; ys: Quad; rows: Quad }

function placeRect(place: Placement, W: number, H: number, tw: number, th: number): Fit {
  if (place === "cover") {
    const s = Math.max(W / tw, H / th)
    const y = (H - th * s) / 2
    const h = th * s
    return { x: (W - tw * s) / 2, w: tw * s, ys: [y, y + h / 3, y + (h * 2) / 3, y + h], rows: [0, 1 / 3, 2 / 3, 1] }
  }
  const [b0, b1] = PILLAR_SHAFT
  const shaft = (b1 - b0) * th
  const fixed = th - shaft
  let s = W / (tw * PILLAR_BODY)
  if ((H - fixed * s) / (shaft * s) < PILLAR_MIN_SHAFT) s = H / (fixed + shaft * PILLAR_MIN_SHAFT)
  return {
    x: (W - tw * s) / 2,
    w: tw * s,
    ys: [0, b0 * th * s, H - (1 - b1) * th * s, H],
    rows: [0, b0, b1, 1],
  }
}

/**
 * How much of the baked plaster's shading shows at rest (0 = flat wall).
 * The bakes are contrasty; at rest the reliefs should be faint, like the
 * reference, and only come alive as metal. The <img> fades over the wall by
 * the same amount (CSS opacity), so it matches the canvas exactly.
 */
const PLASTER_SOFTNESS = 0.5

const src = (name: ReliefName, layer: "base" | "normal" | "mask") =>
  `/album/relief/${name}-${layer}.webp`

// Plaster → polished silver. The silver takes its form from the plaster's
// own (smooth) shading and from a blurred copy of the normals, so it reads
// as soft, rounded metal rather than every crease of the normal map. A broad
// highlight follows the cursor.
const SHADE = `
precision highp float;
uniform sampler2D uBase, uNormal, uMask, uWet;
uniform vec2 uFitX;     // texture u = vUv.x * uFitX.x + uFitX.y
uniform vec4 uYs, uRows; // box rows → image rows, both top down, 3 pieces
uniform vec2 uCursor, uTexel;
uniform float uAspect, uSoft;
varying vec2 vUv;

const vec3 WALL = vec3(0.8806, 0.8769, 0.864);

vec3 normalAt(vec2 uv) { return texture2D(uNormal, uv).rgb * 2.0 - 1.0; }

float rowAt(float y) {
  if (y < uYs.y) return mix(uRows.x, uRows.y, (y - uYs.x) / max(uYs.y - uYs.x, 1e-5));
  if (y < uYs.z) return mix(uRows.y, uRows.z, (y - uYs.y) / max(uYs.z - uYs.y, 1e-5));
  return mix(uRows.z, uRows.w, (y - uYs.z) / max(uYs.w - uYs.z, 1e-5));
}
float shadeAt(vec2 uv) { return texture2D(uBase, uv).r; }

void main() {
  // The image is flipped on upload, so texture v runs bottom up.
  vec2 uv = vec2(vUv.x * uFitX.x + uFitX.y, 1.0 - rowAt(1.0 - vUv.y));
  // Past the relief's edge (a shrunken column): plain wall.
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(WALL, 1.0);
    return;
  }
  vec3 raw = texture2D(uBase, uv).rgb;
  vec3 base = mix(WALL, raw, uSoft);
  float mask = smoothstep(0.05, 0.9, texture2D(uMask, uv).r);
  float wet = texture2D(uWet, vUv).r;
  wet = wet * wet * (3.0 - 2.0 * wet);
  float reveal = wet * mask;
  if (reveal < 0.002) { gl_FragColor = vec4(base, 1.0); return; }

  // Blurred normals: centre plus two rings of taps.
  vec2 r1 = uTexel * 3.0, r2 = uTexel * 7.0;
  vec3 n = normalAt(uv) * 2.0;
  n += normalAt(uv + vec2(r1.x, 0.0)) + normalAt(uv - vec2(r1.x, 0.0))
     + normalAt(uv + vec2(0.0, r1.y)) + normalAt(uv - vec2(0.0, r1.y));
  n += normalAt(uv + r2 * vec2(0.7, 0.7)) + normalAt(uv + r2 * vec2(-0.7, 0.7))
     + normalAt(uv + r2 * vec2(0.7, -0.7)) + normalAt(uv + r2 * vec2(-0.7, -0.7));
  n = normalize(n);
  float soft = shadeAt(uv) * 2.0
    + shadeAt(uv + vec2(r1.x, 0.0)) + shadeAt(uv - vec2(r1.x, 0.0))
    + shadeAt(uv + vec2(0.0, r1.y)) + shadeAt(uv - vec2(0.0, r1.y))
    + shadeAt(uv + r2 * vec2(0.7, 0.7)) + shadeAt(uv + r2 * vec2(-0.7, 0.7))
    + shadeAt(uv + r2 * vec2(0.7, -0.7)) + shadeAt(uv + r2 * vec2(-0.7, -0.7));
  soft /= 10.0;

  vec2 delta = (uCursor - vUv) * vec2(uAspect, 1.0);
  vec3 l = normalize(vec3(delta, 0.6));
  vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
  float near = 1.0 - smoothstep(0.0, 0.9, length(delta));

  // A soft studio: bright from above, a grey floor below.
  float sky = smoothstep(-0.65, 0.65, n.y * 1.0 + n.x * 0.35 + 0.05);
  vec3 env = mix(vec3(0.26, 0.265, 0.275), vec3(0.97, 0.975, 0.98), sky);
  // Silver darkens as it turns away from the viewer.
  env *= 1.0 - 0.45 * smoothstep(0.15, 0.8, 1.0 - n.z);
  // The plaster's own light and shade carry the form into the metal.
  float form = smoothstep(0.3, 0.93, mix(soft, raw.r, 0.3));
  vec3 metal = env * mix(0.44, 1.08, form);
  float broad = pow(max(dot(n, h), 0.0), 12.0);
  metal += vec3(1.0) * broad * near * 0.32;
  metal = mix(metal, vec3(dot(metal, vec3(0.333))), 0.2) * vec3(0.985, 0.99, 1.0);
  gl_FragColor = vec4(mix(base, clamp(metal, 0.0, 1.0), reveal), 1.0);
}`

export function ReliefCanvas({
  name,
  className,
  place = "cover",
  brush = 0.18,
  spin = false,
  children,
  onLocalClick,
  layer,
  alt = "",
}: {
  name: ReliefName
  className?: string
  /** How the relief sits in its box. */
  place?: Placement
  /** Brush radius as a fraction of the box height. */
  brush?: number
  /** Spins the relief (not the children), e.g. the disc while playing. */
  spin?: boolean
  children?: ReactNode
  /** Click position in the relief's own 0–1 image coordinates (y down). */
  onLocalClick?: (u: number, v: number) => void
  /** Drawn over the relief, inside the spinning layer. */
  layer?: ReactNode
  alt?: string
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const spinRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  /** Pointer → the spinning layer's own coordinates (0–1, y down). */
  const local = (e: { clientX: number; clientY: number }) => {
    const spinning = spinRef.current!
    const box = boxRef.current!.getBoundingClientRect()
    const w = spinning.offsetWidth
    const h = spinning.offsetHeight
    let dx = e.clientX - (box.left + box.width / 2)
    let dy = e.clientY - (box.top + box.height / 2)
    const t = getComputedStyle(spinning).transform
    if (t && t !== "none") {
      const m = new DOMMatrix(t).inverse()
      const p = m.transformPoint(new DOMPoint(dx, dy))
      dx = p.x
      dy = p.y
    }
    return [dx / w + 0.5, dy / h + 0.5] as const
  }

  const { pointer, wake, handlers } = useReliefPointer((e) => {
    const [u, v] = local(e)
    return [u, 1 - v]
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    return mountRelief({
      canvas,
      img: imgRef.current,
      name,
      place,
      brush,
      pointer: pointer.current,
      wake,
      onReady: () => setReady(true),
    })
  }, [name, place, brush, pointer, wake])

  return (
    <div
      ref={boxRef}
      className={cn("relief", ready && "is-ready", className)}
      data-place={place}
      {...handlers}
      onClick={
        onLocalClick
          ? (e) => {
              const [u, v] = local(e)
              onLocalClick(u, v)
            }
          : undefined
      }
    >
      <div ref={spinRef} className={cn("relief-layer", spin && "is-spinning")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src(name, "base")}
          alt={alt}
          width={SIZES[name][0]}
          height={SIZES[name][1]}
          className="relief-img"
          style={{ opacity: PLASTER_SOFTNESS }}
          draggable={false}
        />
        <canvas ref={canvasRef} className="relief-gl" aria-hidden />
        {layer}
      </div>
      {children}
    </div>
  )
}

/* ───────────────────────── WebGL ───────────────────────── */

function mountRelief({
  canvas,
  img,
  name,
  place,
  brush,
  pointer,
  wake,
  onReady,
}: {
  canvas: HTMLCanvasElement
  /** The plaster <img> under the canvas. */
  img: HTMLImageElement | null
  name: ReliefName
  place: Placement
  brush: number
  pointer: Pointer
  wake: { current: () => void }
  onReady: () => void
}) {
  const box = canvas.parentElement!
  const [texW, texH] = SIZES[name]

  // The plaster <img> is placed by hand so it lines up with the shader. A
  // pillar's stretched shaft can't be drawn by one <img>, so for pillars the
  // image stays hidden and the canvas (which fades in) is the only picture.
  let fit: Fit = { x: 0, w: 1, ys: [0, 0, 0, 1], rows: [0, 0, 0, 1] }
  let boxW = 1
  let boxH = 1
  const layout = () => {
    const W = box.offsetWidth
    const H = box.offsetHeight
    if (!W || !H) return
    fit = placeRect(place, W, H, texW, texH)
    boxW = W
    boxH = H
    if (!img) return
    if (place !== "cover") {
      img.style.visibility = "hidden"
      return
    }
    img.style.left = `${fit.x}px`
    img.style.top = `${fit.ys[0]}px`
    img.style.width = `${fit.w}px`
    img.style.height = `${fit.ys[3] - fit.ys[0]}px`
    img.style.right = "auto"
    img.style.bottom = "auto"
  }

  return mountPolish({
    canvas,
    box,
    transparent: false,
    aspect: true,
    brush,
    shade: SHADE,
    samplers: [
      ["uBase", src(name, "base")],
      ["uNormal", src(name, "normal")],
      ["uMask", src(name, "mask")],
    ],
    pointer,
    wake,
    layout,
    // Draw once with no wetness so the canvas matches the <img> exactly.
    prime: true,
    uniforms: ({ gl, u, p, aspect }) => {
      const [y0, y1, y2, y3] = fit.ys
      gl.uniform2f(u.uFitX, boxW / fit.w, -fit.x / fit.w)
      gl.uniform4f(u.uYs, y0 / boxH, y1 / boxH, y2 / boxH, y3 / boxH)
      gl.uniform4f(u.uRows, ...fit.rows)
      gl.uniform2f(u.uCursor, p.x, p.y)
      gl.uniform1f(u.uAspect, aspect)
      gl.uniform1f(u.uSoft, PLASTER_SOFTNESS)
      gl.uniform2f(u.uTexel, 1 / texW, 1 / texH)
    },
    onFirstFrame: onReady,
  })
}
