"use client"

import Image from "next/image"
import { useEffect, useRef, type PointerEvent, type ReactNode } from "react"

/*
 * His coin: at rest, his head printed in the album's blue on plaster inside
 * a Greek key. Under the cursor it turns to struck silver, as the album's
 * reliefs turn to metal: the cursor paints a "wetness" that slowly dries,
 * and wherever it is wet the coin is drawn as polished silver, lit by a
 * light that follows the cursor across the relief.
 *
 * The relief is baked by scripts/miky-coin/bake.py (normals, the relief's
 * own shading, and the coin's disc). The shaders are the album's
 * (components/album/relief-canvas.tsx), drawn over the page instead of in
 * place of it, so wherever the silver hasn't reached the blue print shows.
 */

const TEXTURES = ["normal", "shade", "mask"] as const
const src = (name: string) => `/miky/coin/${name}.webp`
/** Brush radius, as a share of the coin. */
const BRUSH = 0.2

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

// Wetness: the album's. Last frame's value, drying unevenly, plus a brush
// along the cursor's path, heavier the faster it moves.
const PAINT = `
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uFrom, uTo, uTexel;
uniform float uBrush, uStrength, uDt, uTime;
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
  float d = segment(vUv, uFrom, uTo);
  float brush = 1.0 - smoothstep(0.0, uBrush, d);
  brush *= brush * (3.0 - 2.0 * brush);
  brush *= mix(0.85, 1.0, noise(vUv * 9.0 + uTime * 0.3));
  gl_FragColor = vec4(max(prev, brush * uStrength), 0.0, 0.0, 1.0);
}`

// Silver: the album's, read from the coin's relief and drawn with its
// coverage as alpha (premultiplied), so the blue print shows where it's dry.
const SHADE = `
precision highp float;
uniform sampler2D uNormal, uShade, uMask, uWet;
uniform vec2 uCursor, uTexel;
varying vec2 vUv;

vec3 normalAt(vec2 uv) { return texture2D(uNormal, uv).rgb * 2.0 - 1.0; }
float shadeAt(vec2 uv) { return texture2D(uShade, uv).r; }

void main() {
  vec2 uv = vUv;
  float mask = texture2D(uMask, uv).r;
  float wet = texture2D(uWet, vUv).r;
  wet = wet * wet * (3.0 - 2.0 * wet);
  float reveal = wet * mask;
  if (reveal < 0.002) { gl_FragColor = vec4(0.0); return; }

  // Softened normals and shading: struck metal, not every crease.
  vec2 r1 = uTexel * 2.0, r2 = uTexel * 4.5;
  vec3 n = normalAt(uv) * 2.0;
  n += normalAt(uv + vec2(r1.x, 0.0)) + normalAt(uv - vec2(r1.x, 0.0))
     + normalAt(uv + vec2(0.0, r1.y)) + normalAt(uv - vec2(0.0, r1.y));
  n += normalAt(uv + r2 * vec2(0.7, 0.7)) + normalAt(uv + r2 * vec2(-0.7, 0.7))
     + normalAt(uv + r2 * vec2(0.7, -0.7)) + normalAt(uv + r2 * vec2(-0.7, -0.7));
  n = normalize(n);
  float raw = shadeAt(uv);
  float soft = raw * 2.0
    + shadeAt(uv + vec2(r1.x, 0.0)) + shadeAt(uv - vec2(r1.x, 0.0))
    + shadeAt(uv + vec2(0.0, r1.y)) + shadeAt(uv - vec2(0.0, r1.y))
    + shadeAt(uv + r2 * vec2(0.7, 0.7)) + shadeAt(uv + r2 * vec2(-0.7, 0.7))
    + shadeAt(uv + r2 * vec2(0.7, -0.7)) + shadeAt(uv + r2 * vec2(-0.7, -0.7));
  soft /= 10.0;

  vec2 delta = uCursor - vUv;
  vec3 l = normalize(vec3(delta, 0.6));
  vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
  float near = 1.0 - smoothstep(0.0, 0.9, length(delta));

  // A soft studio: bright from above, a grey floor below.
  float sky = smoothstep(-0.65, 0.65, n.y + n.x * 0.35 + 0.05);
  vec3 env = mix(vec3(0.26, 0.265, 0.275), vec3(0.97, 0.975, 0.98), sky);
  env *= 1.0 - 0.45 * smoothstep(0.15, 0.8, 1.0 - n.z);
  float form = smoothstep(0.3, 0.93, mix(soft, raw, 0.3));
  vec3 metal = env * mix(0.44, 1.08, form);
  float broad = pow(max(dot(n, h), 0.0), 12.0);
  metal += vec3(1.0) * broad * near * 0.32;
  metal = mix(metal, vec3(dot(metal, vec3(0.333))), 0.2) * vec3(0.985, 0.99, 1.0);
  gl_FragColor = vec4(clamp(metal, 0.0, 1.0) * reveal, reveal);
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

export function Coin({
  rim,
}: {
  /** The page's Greek key, drawn over the face. */
  rim: ReactNode
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointer = useRef<Pointer>({
    x: 0.5,
    y: 0.5,
    px: 0.5,
    py: 0.5,
    tx: 0.5,
    ty: 0.5,
    speed: 0,
    over: false,
    down: false,
    last: 0,
  })
  const wake = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    return mount(canvas, pointer.current, wake)
  }, [])

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const box = boxRef.current!.getBoundingClientRect()
    const u = (e.clientX - box.left) / box.width
    const v = 1 - (e.clientY - box.top) / box.height
    const p = pointer.current
    const now = performance.now()
    if (!p.over) {
      p.x = p.px = p.tx = u
      p.y = p.py = p.ty = v
      p.speed = 0
    } else {
      const dt = Math.max((now - p.last) / 1000, 1 / 120)
      p.speed = Math.min(4, Math.hypot(u - p.tx, v - p.ty) / dt)
    }
    p.tx = u
    p.ty = v
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
      className="mk-coin"
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
    >
      <div className="mk-coin-face">
        <div className="mk-duo is-print">
          <Image
            src={src("face")}
            alt="Michail, struck on a coin"
            fill
            sizes="(max-width: 809px) 80vw, 46vh"
            priority
            className="mk-mono"
          />
          <span className="mk-wall" aria-hidden />
        </div>
      </div>
      {rim}
      <canvas ref={canvasRef} className="mk-coin-silver" aria-hidden />
    </div>
  )
}

/* ───────────────────────── WebGL ───────────────────────── */

type Target = { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }

function mount(
  canvas: HTMLCanvasElement,
  p: Pointer,
  wake: { current: () => void }
) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
  })
  if (!gl) return () => {}
  const paint = program(gl, PAINT)
  const shade = program(gl, SHADE)
  if (!paint || !shade) return () => {}

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  )

  let disposed = false
  let raf = 0
  let last = 0
  let life = 0
  let textures: WebGLTexture[] = []
  let read: Target | null = null
  let write: Target | null = null

  const draw = (prog: WebGLProgram) => {
    const loc = gl.getAttribLocation(prog, "aPos")
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.round(canvas.offsetWidth * dpr))
    const h = Math.max(1, Math.round(canvas.offsetHeight * dpr))
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
    if (disposed || !read || !write || textures.length < TEXTURES.length) return
    resize()
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
    last = now

    const ease = 1 - Math.exp(-16 * dt)
    p.px = p.x
    p.py = p.y
    p.x += (p.tx - p.x) * ease
    p.y += (p.ty - p.y) * ease
    p.speed *= Math.exp(-7 * dt)
    const strength = p.over
      ? Math.max(Math.min(1, p.speed * 1.6), p.down ? 0.6 : 0, 0.18)
      : 0
    life = p.over ? 1 : Math.max(0, life - dt / 7)

    // 1. Wetness.
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb)
    gl.viewport(0, 0, write.w, write.h)
    gl.useProgram(paint.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, read.tex)
    gl.uniform1i(paint.u.uPrev!, 0)
    gl.uniform2f(paint.u.uFrom!, p.px, p.py)
    gl.uniform2f(paint.u.uTo!, p.x, p.y)
    gl.uniform2f(paint.u.uTexel!, 1 / write.w, 1 / write.h)
    gl.uniform1f(paint.u.uBrush!, BRUSH)
    gl.uniform1f(paint.u.uStrength!, strength)
    gl.uniform1f(paint.u.uDt!, dt)
    gl.uniform1f(paint.u.uTime!, now / 1000)
    draw(paint.prog)
    ;[read, write] = [write, read]

    // 2. Silver.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(shade.prog)
    ;(["uNormal", "uShade", "uMask"] as const).forEach((key, i) => {
      gl.activeTexture(gl.TEXTURE0 + i)
      gl.bindTexture(gl.TEXTURE_2D, textures[i]!)
      gl.uniform1i(shade.u[key]!, i)
    })
    gl.activeTexture(gl.TEXTURE3)
    gl.bindTexture(gl.TEXTURE_2D, read.tex)
    gl.uniform1i(shade.u.uWet!, 3)
    gl.uniform2f(shade.u.uCursor!, p.x, p.y)
    gl.uniform2f(shade.u.uTexel!, 1 / 1024, 1 / 1024)
    draw(shade.prog)

    if (life > 0) raf = requestAnimationFrame(frame)
  }

  wake.current = () => {
    if (disposed || raf) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  const ro = new ResizeObserver(() => wake.current())
  ro.observe(canvas)
  Promise.all(TEXTURES.map((name) => image(src(name))))
    .then((imgs) => {
      if (disposed) return
      textures = imgs.map((img) => texture(gl, img))
      resize()
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
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    w,
    h,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  )
  const fb = gl.createFramebuffer()!
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  )
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
    const img = new window.Image()
    img.decoding = "async"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}
