/**
 * How the 404's beach is drawn: as 35mm black and white, the way 8½ was
 * shot. The beach (beach.ts) composes each frame as tone and fade per dot;
 * this draws it on the GPU at the screen's own resolution, in continuous
 * tone, with what film adds: grain that changes every frame (heaviest in the
 * mid-tones, as with silver), a little flicker in the exposure, the frame
 * weaving in the gate, and the corners falling off.
 */

import { GLSL_HASH, QUAD_VERTEX, link, uniformsOf } from "@/components/home/gl"

import { DOT, type Ink } from "./beach"

/**
 * How strongly the picture is inked, 0–1. On dark, the ink is light, and at
 * full strength it glares against the page, so it is dimmed a little.
 */
const INK_ALPHA = { light: 1, dark: 0.8 } as const

/** Device px per CSS px, at most. */
const MAX_RATIO = 2

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uInk;     // luminance: tone; alpha: fade
uniform vec2 uResolution;   // device px
uniform float uRatio;       // device px per CSS px
uniform vec2 uInkSize;      // dots
uniform float uDot;         // CSS px per dot
uniform vec3 uColor;
uniform float uAlpha;
uniform float uDark;
uniform float uFrame;       // film frames, at 24 a second
${GLSL_HASH}

void main() {
  // This fragment in CSS px from the top left, weaving with the frame.
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uRatio;
  vec2 weave = vec2(
    hash(vec2(uFrame, 1.0)) - 0.5,
    hash(vec2(uFrame, 2.0)) - 0.5
  ) * vec2(0.5, 0.8);
  vec4 ink = texture2D(uInk, (p + weave) / (uDot * uInkSize));
  float tone = pow(ink.r, 0.8);
  // On dark, ink is light: a print's shoulder rolls the highlights off
  // instead of clipping them, so the rope and the shine on the shoe sit in
  // the picture, not on it. (On light, the highlights are bare paper.)
  float over = max(tone - 0.55, 0.0) / 0.45;
  float shoulder = min(tone, 0.55) + 0.45 * 0.45 * over * (2.0 - over);
  tone = mix(tone, shoulder, uDark);
  float flicker = 1.0 + 0.07 * (hash(vec2(uFrame, 3.0)) - 0.5);
  vec2 seed = vec2(fract(uFrame * 0.618) * 731.0, fract(uFrame * 0.414) * 517.0);
  float grain =
    0.65 * (hash(floor(gl_FragCoord.xy / 1.5) + seed) - 0.5) +
    0.35 * (hash(floor(gl_FragCoord.xy / 3.0) + seed * 1.7) - 0.5);
  float value = tone * flicker + grain * (0.12 + tone * (1.0 - tone) * 1.3);
  vec2 v = gl_FragCoord.xy / uResolution - vec2(0.6, 0.5);
  value *= 1.0 - 0.55 * dot(v, v);
  float a = clamp(value * ink.a, 0.0, 1.0) * uAlpha;
  gl_FragColor = vec4(uColor * a, a);
}
`

const UNIFORMS = {
  ink: "uInk",
  resolution: "uResolution",
  ratio: "uRatio",
  inkSize: "uInkSize",
  dot: "uDot",
  color: "uColor",
  alpha: "uAlpha",
  dark: "uDark",
  frame: "uFrame",
} as const
type Uniform = keyof typeof UNIFORMS

export class Grain {
  private readonly gl: WebGLRenderingContext | null
  private readonly program: WebGLProgram | null = null
  private readonly quad: WebGLBuffer | null = null
  private readonly texture: WebGLTexture | null = null
  private readonly uniforms: Record<
    Uniform,
    WebGLUniformLocation | null
  > | null = null
  private bytes = new Uint8Array(0)

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true })
    this.gl = gl
    if (!gl) return
    this.program = link(gl, QUAD_VERTEX, FRAGMENT)
    if (!this.program) return
    this.uniforms = uniformsOf(gl, this.program, UNIFORMS)
    this.quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    )
    const position = gl.getAttribLocation(this.program, "aPosition")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.useProgram(this.program)

    this.texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  }

  paint(ink: Ink) {
    const { gl, canvas, uniforms: u } = this
    if (!gl || !u) return

    const ratio = Math.min(MAX_RATIO, window.devicePixelRatio || 1)
    const width = Math.round(canvas.clientWidth * ratio)
    const height = Math.round(canvas.clientHeight * ratio)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    gl.viewport(0, 0, width, height)

    // Tone and fade, a byte each, as one luminance-alpha texture.
    const size = ink.width * ink.height
    if (this.bytes.length !== size * 2) this.bytes = new Uint8Array(size * 2)
    for (let i = 0; i < size; i++) {
      this.bytes[i * 2] = ink.tone[i] * 255
      this.bytes[i * 2 + 1] = ink.fade[i] * 255
    }
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE_ALPHA,
      ink.width,
      ink.height,
      0,
      gl.LUMINANCE_ALPHA,
      gl.UNSIGNED_BYTE,
      this.bytes
    )

    const [r, g, b] = ink.color
    gl.uniform1i(u.ink, 0)
    gl.uniform2f(u.resolution, width, height)
    gl.uniform1f(u.ratio, ratio)
    gl.uniform2f(u.inkSize, ink.width, ink.height)
    gl.uniform1f(u.dot, DOT)
    gl.uniform3f(u.color, r / 255, g / 255, b / 255)
    gl.uniform1f(u.alpha, ink.dark ? INK_ALPHA.dark : INK_ALPHA.light)
    gl.uniform1f(u.dark, ink.dark ? 1 : 0)
    gl.uniform1f(u.frame, Math.floor(ink.time * 24) % 10000)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  destroy() {
    const { gl } = this
    if (!gl) return
    gl.deleteProgram(this.program)
    gl.deleteBuffer(this.quad)
    gl.deleteTexture(this.texture)
  }
}
