"use client"

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react"

import { cn } from "@/lib/utils"

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
 * draws while the cursor is over it or the metal is still fading.
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
type Fit = { x: number; w: number; ys: number[]; rows: number[] }

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
export const PLASTER_SOFTNESS = 0.5

const src = (name: ReliefName, layer: "base" | "normal" | "mask") =>
  `/album/relief/${name}-${layer}.webp`

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

// Wetness: last frame's value, drying out unevenly, plus a brush stroke along
// the cursor's path that gets heavier the faster the cursor moves.
const PAINT = `
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uFrom, uTo, uTexel;
uniform float uAspect, uBrush, uStrength, uDt, uTime;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float segment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
  return length(p - a - ab * t);
}
void main() {
  float prev = texture2D(uPrev, vUv).r;
  float spread = (texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).r + texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).r
                + texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).r + texture2D(uPrev, vUv - vec2(0.0, uTexel.y)).r) * 0.25;
  prev = mix(prev, spread, 0.1);
  float n = noise(vUv * 7.0 + uTime * 0.15);
  prev = max(prev - uDt * mix(0.05, 0.22, n), 0.0);

  vec2 a = vec2(uAspect, 1.0);
  float d = segment(vUv * a, uFrom * a, uTo * a);
  float brush = 1.0 - smoothstep(0.0, uBrush, d);
  brush *= brush * (3.0 - 2.0 * brush);
  brush *= mix(0.85, 1.0, noise(vUv * 9.0 + uTime * 0.3));
  gl_FragColor = vec4(max(prev, brush * uStrength), 0.0, 0.0, 1.0);
}`

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
uniform float uAspect, uTime, uSoft;
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

type Pointer = {
  x: number
  y: number
  px: number
  py: number
  tx: number
  ty: number
  speed: number
  over: boolean
  down: boolean
  last: number
}

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointer = useRef<Pointer>({
    x: 0.5, y: 0.5, px: 0.5, py: 0.5, tx: 0.5, ty: 0.5, speed: 0, over: false, down: false, last: 0,
  })
  const wake = useRef<() => void>(() => {})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    return mount(canvas, name, place, brush, pointer.current, wake, () => setReady(true))
  }, [name, place, brush])

  /** Pointer → the spinning layer's own coordinates (0–1, y down). */
  const local = (e: { clientX: number; clientY: number }) => {
    const layer = spinRef.current!
    const box = boxRef.current!.getBoundingClientRect()
    const w = layer.offsetWidth
    const h = layer.offsetHeight
    let dx = e.clientX - (box.left + box.width / 2)
    let dy = e.clientY - (box.top + box.height / 2)
    const t = getComputedStyle(layer).transform
    if (t && t !== "none") {
      const m = new DOMMatrix(t).inverse()
      const p = m.transformPoint(new DOMPoint(dx, dy))
      dx = p.x
      dy = p.y
    }
    return [dx / w + 0.5, dy / h + 0.5] as const
  }

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const [u, v] = local(e)
    const p = pointer.current
    const now = performance.now()
    const gy = 1 - v
    if (!p.over) {
      p.x = p.px = p.tx = u
      p.y = p.py = p.ty = gy
      p.speed = 0
    } else {
      const dt = Math.max((now - p.last) / 1000, 1 / 120)
      p.speed = Math.min(4, Math.hypot(u - p.tx, gy - p.ty) / dt)
    }
    p.tx = u
    p.ty = gy
    p.last = now
    p.over = true
    wake.current()
  }

  const leave = () => {
    pointer.current.over = false
    pointer.current.down = false
    wake.current()
  }

  return (
    <div
      ref={boxRef}
      className={cn("relief", ready && "is-ready", className)}
      data-place={place}
      onPointerEnter={move}
      onPointerMove={move}
      onPointerLeave={leave}
      onPointerCancel={leave}
      onPointerDown={(e) => {
        pointer.current.down = true
        move(e)
      }}
      onPointerUp={() => {
        pointer.current.down = false
      }}
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

type Target = { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }

function mount(
  canvas: HTMLCanvasElement,
  name: ReliefName,
  place: Placement,
  brush: number,
  p: Pointer,
  wake: { current: () => void },
  onReady: () => void
) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false })
  if (!gl) return () => {}

  const paint = program(gl, PAINT)
  const shade = program(gl, SHADE)
  if (!paint || !shade) return () => {}

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)

  let disposed = false
  let raf = 0
  let last = 0
  let life = 0
  let shown = false
  let textures: WebGLTexture[] = []
  let read: Target | null = null
  let write: Target | null = null
  const [texW, texH] = SIZES[name]

  const draw = (prog: WebGLProgram) => {
    const loc = gl.getAttribLocation(prog, "aPos")
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  // The plaster <img> is placed by hand so it lines up with the shader. A
  // pillar's stretched shaft can't be drawn by one <img>, so for pillars the
  // image stays hidden and the canvas (which fades in) is the only picture.
  const img = canvas.previousElementSibling as HTMLImageElement | null
  let fit: Fit = { x: 0, w: 1, ys: [0, 0, 0, 1], rows: [0, 0, 0, 1] }
  let boxW = 1
  let boxH = 1
  const layout = () => {
    const box = canvas.parentElement!
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
    img.style.height = `${fit.ys[3]! - fit.ys[0]!}px`
    img.style.right = "auto"
    img.style.bottom = "auto"
  }

  const resize = () => {
    const box = canvas.parentElement!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.round(box.offsetWidth * dpr))
    const h = Math.max(1, Math.round(box.offsetHeight * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    const tw = Math.max(1, Math.round(w * 0.5))
    const th = Math.max(1, Math.round(h * 0.5))
    if (!read || read.w !== tw || read.h !== th) {
      if (read) drop(gl, read)
      if (write) drop(gl, write)
      read = target(gl, tw, th)
      write = target(gl, tw, th)
    }
  }

  const frame = (now: number) => {
    raf = 0
    if (disposed || !read || !write || textures.length < 3) return
    resize()
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
    last = now

    const ease = 1 - Math.exp(-16 * dt)
    p.px = p.x
    p.py = p.y
    p.x += (p.tx - p.x) * ease
    p.y += (p.ty - p.y) * ease
    p.speed *= Math.exp(-7 * dt)
    const strength = p.over ? Math.max(Math.min(1, p.speed * 1.6), p.down ? 0.6 : 0, 0.18) : 0

    life = p.over ? 1 : Math.max(0, life - dt / 7)
    const aspect = canvas.width / canvas.height

    // 1. paint wetness
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb)
    gl.viewport(0, 0, write.w, write.h)
    gl.useProgram(paint.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, read.tex)
    gl.uniform1i(paint.u.uPrev, 0)
    gl.uniform2f(paint.u.uFrom, p.px, p.py)
    gl.uniform2f(paint.u.uTo, p.x, p.y)
    gl.uniform2f(paint.u.uTexel, 1 / write.w, 1 / write.h)
    gl.uniform1f(paint.u.uAspect, aspect)
    gl.uniform1f(paint.u.uBrush, brush)
    gl.uniform1f(paint.u.uStrength, strength)
    gl.uniform1f(paint.u.uDt, dt)
    gl.uniform1f(paint.u.uTime, now / 1000)
    draw(paint.prog)
    ;[read, write] = [write, read]

    // 2. shade
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(shade.prog)
    ;["uBase", "uNormal", "uMask"].forEach((key, i) => {
      gl.activeTexture(gl.TEXTURE0 + i)
      gl.bindTexture(gl.TEXTURE_2D, textures[i]!)
      gl.uniform1i(shade.u[key]!, i)
    })
    gl.activeTexture(gl.TEXTURE3)
    gl.bindTexture(gl.TEXTURE_2D, read.tex)
    gl.uniform1i(shade.u.uWet, 3)
    gl.uniform2f(shade.u.uFitX, boxW / fit.w, -fit.x / fit.w)
    gl.uniform4f(shade.u.uYs, ...(fit.ys.map((y) => y / boxH) as [number, number, number, number]))
    gl.uniform4f(shade.u.uRows, ...(fit.rows as [number, number, number, number]))
    gl.uniform2f(shade.u.uCursor, p.x, p.y)
    gl.uniform1f(shade.u.uAspect, aspect)
    gl.uniform1f(shade.u.uTime, now / 1000)
    gl.uniform1f(shade.u.uSoft, PLASTER_SOFTNESS)
    gl.uniform2f(shade.u.uTexel, 1 / texW, 1 / texH)
    draw(shade.prog)
    if (!shown) {
      shown = true
      onReady()
    }

    if (life > 0) raf = requestAnimationFrame(frame)
  }

  wake.current = () => {
    if (disposed || raf) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  layout()
  const ro = new ResizeObserver(() => {
    layout()
    wake.current()
  })
  ro.observe(canvas.parentElement!)
  Promise.all((["base", "normal", "mask"] as const).map((l) => image(src(name, l))))
    .then((imgs) => {
      if (disposed) return
      textures = imgs.map((img) => texture(gl, img))
      resize()
      // Draw once with no wetness so the canvas matches the <img> exactly.
      life = 0.001
      wake.current()
    })
    .catch(() => undefined)

  return () => {
    disposed = true
    if (raf) cancelAnimationFrame(raf)
    ro.disconnect()
    textures.forEach((t) => gl.deleteTexture(t))
    if (read) drop(gl, read)
    if (write) drop(gl, write)
    gl.deleteProgram(paint.prog)
    gl.deleteProgram(shade.prog)
    gl.deleteBuffer(quad)
    wake.current = () => {}
  }
}

function program(gl: WebGLRenderingContext, fragment: string) {
  const make = (type: number, source: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, source)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s))
      return null
    }
    return s
  }
  const vs = make(gl.VERTEX_SHADER, VERT)
  const fs = make(gl.FRAGMENT_SHADER, fragment)
  if (!vs || !fs) return null
  const prog = gl.createProgram()!
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  const u: Record<string, WebGLUniformLocation | null> = {}
  const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(prog, i)
    if (info) u[info.name] = gl.getUniformLocation(prog, info.name)
  }
  return { prog, u }
}

function texture(gl: WebGLRenderingContext, img: HTMLImageElement) {
  const t = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  return t
}

function target(gl: WebGLRenderingContext, w: number, h: number): Target {
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  const fb = gl.createFramebuffer()!
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.clearColor(0, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return { fb, tex, w, h }
}

function drop(gl: WebGLRenderingContext, t: Target) {
  gl.deleteFramebuffer(t.fb)
  gl.deleteTexture(t.tex)
}

function image(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.decoding = "async"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}
