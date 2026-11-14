"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"

import { meanderRing } from "@/components/album/meander"
import { mountPolish } from "@/components/album/relief-gl"
import { useReliefPointer } from "@/components/album/use-relief-pointer"

/*
 * His coin: at rest, his head printed in the album's blue on plaster inside
 * a Greek key. Under the cursor it turns to struck silver, as the album's
 * reliefs turn to metal: the cursor paints a "wetness" that slowly dries,
 * and wherever it is wet the coin is drawn as polished silver, lit by a
 * light that follows the cursor across the relief.
 *
 * The relief is baked by scripts/miky-coin/bake.py (normals, the relief's
 * own shading, and the coin's disc). The wetness and its frame loop are the
 * album's (components/album/relief-gl.ts), and the silver is the album's
 * shading, drawn over the page instead of in place of it, so wherever the
 * silver hasn't reached the blue print shows.
 */

const src = (name: string) => `/miky/coin/${name}.webp`
/** Brush radius, as a share of the coin. */
const BRUSH = 0.2

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

/*
 * A running Greek key bent into the coin's rim, as on the album's play
 * button: one key on a 10×8 grid (x along the rim, y inwards), wrapped
 * around the circle, its straight runs bent into short arcs. The key is baked
 * into the silver too, so these must match scripts/miky-coin/bake.py.
 */
const COIN_KEYS = 30
const COIN_OUTER = 48.4
const COIN_STEP = 0.8
const COIN_INNER = COIN_OUTER - 10 * COIN_STEP
const COIN_KEY = meanderRing({
  keys: COIN_KEYS,
  outer: COIN_OUTER,
  step: COIN_STEP,
  inset: 0.6,
})

/**
 * His head in the album's blue, on a plaster flan, inside a running Greek
 * key that draws itself around the rim as the coin lands.
 */
export function Coin() {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { pointer, wake, handlers } = useReliefPointer((e) => {
    const box = boxRef.current!.getBoundingClientRect()
    return [
      (e.clientX - box.left) / box.width,
      1 - (e.clientY - box.top) / box.height,
    ]
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    return mountPolish({
      canvas,
      box: canvas,
      transparent: true,
      aspect: false,
      brush: BRUSH,
      shade: SHADE,
      samplers: [
        ["uNormal", src("normal")],
        ["uShade", src("shade")],
        ["uMask", src("mask")],
      ],
      pointer: pointer.current,
      wake,
      prime: false,
      uniforms: ({ gl, u, p }) => {
        gl.uniform2f(u.uCursor, p.x, p.y)
        gl.uniform2f(u.uTexel, 1 / 1024, 1 / 1024)
      },
    })
  }, [pointer, wake])

  return (
    <div ref={boxRef} className="mk-coin" {...handlers}>
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
      <svg className="mk-coin-rim" viewBox="0 0 100 100" aria-hidden>
        <circle className="mk-coin-edge" cx="50" cy="50" r="49.5" />
        <path className="mk-coin-key" d={COIN_KEY} pathLength={1} />
        <circle className="mk-coin-edge" cx="50" cy="50" r={COIN_INNER} />
      </svg>
      <canvas ref={canvasRef} className="mk-coin-silver" aria-hidden />
    </div>
  )
}
