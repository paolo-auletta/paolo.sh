/*
 * The WebGL behind every surface that polishes under the cursor: the album's
 * reliefs (relief-canvas.tsx) and Miky's coin (app/miky/coin.tsx).
 *
 * The cursor paints into a small "wetness" buffer that slowly dries up. Each
 * surface brings its own shading pass, which reads that wetness and draws
 * metal wherever it is wet. Nothing renders at rest: frames only run while
 * the cursor is over the surface or the metal is still fading.
 */

/** The cursor in the canvas's 0–1 space (y up), eased toward its target. */
export type Pointer = {
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

export type Uniforms = Record<string, WebGLUniformLocation | null>

/** What a surface's shading pass gets to set its own uniforms. */
export type ShadeFrame = {
  gl: WebGLRenderingContext
  u: Uniforms
  p: Pointer
  /** The canvas's width over its height. */
  aspect: number
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

// Wetness: last frame's value, drying out unevenly, plus a brush stroke along
// the cursor's path that gets heavier the faster the cursor moves. With
// `aspect`, the brush is measured in the box's own proportions, so it stays
// round on a box that isn't square.
const paintShader = (aspect: boolean) => `
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uFrom, uTo, uTexel;
uniform float ${aspect ? "uAspect, " : ""}uBrush, uStrength, uDt, uTime;
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
${
  aspect
    ? `
  vec2 a = vec2(uAspect, 1.0);
  float d = segment(vUv * a, uFrom * a, uTo * a);`
    : `  float d = segment(vUv, uFrom, uTo);`
}
  float brush = 1.0 - smoothstep(0.0, uBrush, d);
  brush *= brush * (3.0 - 2.0 * brush);
  brush *= mix(0.85, 1.0, noise(vUv * 9.0 + uTime * 0.3));
  gl_FragColor = vec4(max(prev, brush * uStrength), 0.0, 0.0, 1.0);
}`

type Target = { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }

/**
 * Starts a polishing surface on `canvas` and returns its cleanup. Frames are
 * requested through `wake.current`, which the pointer handlers call.
 */
export function mountPolish({
  canvas,
  box,
  transparent,
  aspect: keepRound,
  brush,
  shade: shadeSource,
  samplers,
  pointer: p,
  wake,
  layout,
  prime,
  uniforms,
  onFirstFrame,
}: {
  canvas: HTMLCanvasElement
  /** The element whose size the canvas takes; it is watched for resizes. */
  box: HTMLElement
  /**
   * Opaque (the album: the canvas is drawn in place of the page) or
   * premultiplied alpha, cleared every frame (the coin: drawn over the page).
   */
  transparent: boolean
  /** Keep the brush round on a box that isn't square. */
  aspect: boolean
  /** Brush radius, as a share of the box's height. */
  brush: number
  /** The shading pass's fragment shader; it reads the wetness as uWet. */
  shade: string
  /** The shading pass's images, as [sampler uniform, url], in texture units 0, 1, … */
  samplers: [string, string][]
  pointer: Pointer
  wake: { current: () => void }
  /** Runs on mount and on every resize, before the next frame. */
  layout?: () => void
  /** Draw one frame as soon as the images load, with no wetness yet. */
  prime: boolean
  /** Sets the shading pass's own uniforms. */
  uniforms: (frame: ShadeFrame) => void
  onFirstFrame?: () => void
}) {
  const gl = canvas.getContext("webgl", {
    alpha: transparent,
    antialias: false,
    premultipliedAlpha: transparent,
  })
  if (!gl) return () => {}

  const paint = program(gl, paintShader(keepRound))
  const shade = program(gl, shadeSource)
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
  let shown = false
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
    if (disposed || !read || !write || textures.length < samplers.length) return
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
    const aspect = canvas.width / canvas.height

    // 1. Paint wetness.
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb)
    gl.viewport(0, 0, write.w, write.h)
    gl.useProgram(paint.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, read.tex)
    gl.uniform1i(paint.u.uPrev, 0)
    gl.uniform2f(paint.u.uFrom, p.px, p.py)
    gl.uniform2f(paint.u.uTo, p.x, p.y)
    gl.uniform2f(paint.u.uTexel, 1 / write.w, 1 / write.h)
    if (keepRound) gl.uniform1f(paint.u.uAspect, aspect)
    gl.uniform1f(paint.u.uBrush, brush)
    gl.uniform1f(paint.u.uStrength, strength)
    gl.uniform1f(paint.u.uDt, dt)
    gl.uniform1f(paint.u.uTime, now / 1000)
    draw(paint.prog)
    ;[read, write] = [write, read]

    // 2. Shade.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    if (transparent) {
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    gl.useProgram(shade.prog)
    samplers.forEach(([key], i) => {
      gl.activeTexture(gl.TEXTURE0 + i)
      gl.bindTexture(gl.TEXTURE_2D, textures[i])
      gl.uniform1i(shade.u[key], i)
    })
    const wet = samplers.length
    gl.activeTexture(gl.TEXTURE0 + wet)
    gl.bindTexture(gl.TEXTURE_2D, read.tex)
    gl.uniform1i(shade.u.uWet, wet)
    uniforms({ gl, u: shade.u, p, aspect })
    draw(shade.prog)
    if (!shown) {
      shown = true
      onFirstFrame?.()
    }

    if (life > 0) raf = requestAnimationFrame(frame)
  }

  wake.current = () => {
    if (disposed || raf) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  layout?.()
  const ro = new ResizeObserver(() => {
    layout?.()
    wake.current()
  })
  ro.observe(box)
  Promise.all(samplers.map(([, url]) => image(url)))
    .then((imgs) => {
      if (disposed) return
      textures = imgs.map((img) => texture(gl, img))
      resize()
      if (prime) {
        life = 0.001
        wake.current()
      }
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
  const u: Uniforms = {}
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
    const img = new Image()
    img.decoding = "async"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}
