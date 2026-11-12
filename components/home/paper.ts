/**
 * The "paper" laid over the painting once we land. It dissolves in outward
 * from the text as a soft white mist:
 *
 * - the land (mountains, trees, meadow, rock) stays fully visible, cut out
 *   along the painting's own silhouette from a precomputed matte;
 * - the sky opens up gradually toward the edges of the screen, away from the
 *   copy, which always sits on solid paper.
 *
 * Transitions dissolve through a fine grain rather than a hard line.
 */

const VERTEX = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT = `
precision highp float;

uniform vec2 uResolution;   // CSS pixels
uniform float uPixelRatio;
uniform float uWash;        // 0 → 1
uniform vec2 uOrigin;       // CSS pixels, where the wash starts
uniform vec4 uKeep;         // CSS pixel rect that always stays paper
uniform vec4 uPhoto;        // the film still on screen: left, top, width, height
uniform sampler2D uLand;    // mattes for the still: red the land, green what stands on it
uniform float uHasLand;
uniform vec3 uPaper;
uniform vec4 uMist;         // start, end (px from the copy), corner rounding, drift
uniform float uCompact;     // phones: full-width bands instead of a haze
uniform vec4 uBands;        // phones: top band start, end; bottom band start, end
uniform vec2 uBandDrift;    // phones: how far the top and bottom edges wander
uniform float uGrain;
uniform float uHug;         // px: how far the paper holds the scene back from the copy
uniform float uStanding;    // phones: 1 = what stands on the land is cut out over the paper
uniform float uVeil;        // how opaque the paper is at its thickest
uniform float uFill;        // 0 → 1: the paper spreading out to cover the screen
uniform vec3 uFillColor;    // the page background the paper becomes

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    amplitude *= 0.5;
  }
  return value;
}

// Distance outside a rounded box; anywhere inside it counts as its edge.
float fillDistance(vec2 p, vec2 center, vec2 halfSize, float corner) {
  vec2 q = abs(p - center) - (halfSize - corner);
  return max(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - corner, 0.0);
}

// x: the land. y: what stands on it (the night scene's pines).
vec2 land(vec2 p) {
  if (uHasLand < 0.5) return vec2(0.0);
  vec2 texel = 1.0 / uPhoto.zw;
  vec2 uv = (p - uPhoto.xy) * texel;
  if (uv.y < 0.0) return vec2(0.0);
  // A small blur so the cut is precise but never razor sharp.
  vec2 sum = texture2D(uLand, uv).rg * 0.28;
  sum += texture2D(uLand, uv + vec2(2.5, 0.0) * texel).rg * 0.09;
  sum += texture2D(uLand, uv - vec2(2.5, 0.0) * texel).rg * 0.09;
  sum += texture2D(uLand, uv + vec2(0.0, 2.5) * texel).rg * 0.09;
  sum += texture2D(uLand, uv - vec2(0.0, 2.5) * texel).rg * 0.09;
  sum += texture2D(uLand, uv + vec2(4.0, 4.0) * texel).rg * 0.09;
  sum += texture2D(uLand, uv - vec2(4.0, 4.0) * texel).rg * 0.09;
  sum += texture2D(uLand, uv + vec2(4.0, -4.0) * texel).rg * 0.09;
  sum += texture2D(uLand, uv - vec2(4.0, -4.0) * texel).rg * 0.09;
  return sum;
}

void main() {
  vec2 p = gl_FragCoord.xy / uPixelRatio;
  p.y = uResolution.y - p.y;

  vec2 mattes = land(p);
  float ground = mattes.x;

  // Distance from the copy's box (negative inside).
  vec2 k = max(uKeep.xy - p, p - uKeep.zw);
  float dKeep = length(max(k, 0.0)) + min(max(k.x, k.y), 0.0);

  // The copy sits in a soft white haze; the sky opens toward the edges. On
  // phones the haze is measured from a rounded copy box so the band of sky
  // above it curves softly.
  vec2 center = (uKeep.xy + uKeep.zw) * 0.5;
  vec2 halfSize = (uKeep.zw - uKeep.xy) * 0.5;
  float corner = min(min(halfSize.x, halfSize.y), uMist.z);
  vec2 q = abs(p - center) - (halfSize - corner);
  float dRound = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - corner;
  float drift = (fbm(p * 0.0028 + 2.0) - 0.5) * uMist.w;
  float sky = smoothstep(uMist.x, uMist.y, dRound + drift);
  float paper = 1.0 - max(ground, sky);

  // The copy always sits on paper, with a soft margin around it: a rounded,
  // drifting cloud rather than a box, wider when the scene crowds the copy
  // (short screens), so its edge never reads as the copy's outline.
  float hugCorner = min(min(halfSize.x, halfSize.y), uHug * 1.4);
  vec2 hq = abs(p - center) - (halfSize - hugCorner);
  float dHug = length(max(hq, 0.0)) + min(max(hq.x, hq.y), 0.0) - hugCorner;
  dHug = max(dHug, dKeep * 0.6);
  dHug += (fbm(p * 0.006) - 0.5) * (30.0 + uHug * 0.55);
  float hugged = 1.0 - smoothstep(uHug * 0.12, uHug, dHug);
  paper = max(paper, hugged);

  if (uCompact > 0.5) {
    // Phones: the paper runs edge to edge, so there are no sides to see. A
    // short band of sky melts into it above the copy, and the landscape
    // comes up out of it below, each edge wandering like a brush stroke.
    float above = uKeep.y - p.y;
    float topEdge = (fbm(vec2(p.x * 0.007, p.y * 0.012) + 3.0) - 0.5) * uBandDrift.x;
    float skyTop = smoothstep(uBands.x, uBands.y, above + topEdge);
    float below = p.y - uKeep.w;
    float bottomEdge = (fbm(vec2(p.x * 0.006, p.y * 0.01) + 11.0) - 0.5) * uBandDrift.y;
    float landBelow = smoothstep(uBands.z, uBands.w, below + bottomEdge);
    // Whatever stands on the land comes up through the paper along its own
    // silhouette, from just under the copy down.
    if (uStanding > 0.5) landBelow = max(landBelow, mattes.y * smoothstep(-10.0, 26.0, below));
    paper = 1.0 - max(skyTop, landBelow);
  }

  // Dissolve outward from the text.
  vec2 fromOrigin = (p - uOrigin) * vec2(1.0, 1.3);
  float reach = uWash * (length(uResolution) * 1.25 + 400.0) - 200.0;
  float front = reach - length(fromOrigin) + (fbm(p * 0.004 + 5.0) - 0.5) * 220.0;
  float washed = smoothstep(-180.0, 180.0, front);
  paper *= washed;

  // Changing pages: the paper spreads out from the copy until it is the whole
  // page background. Measured from the copy's edge (all of it counts as the
  // edge), so at 0 it adds nothing and at 1 it reaches past the farthest
  // corner.
  float fillCorner = min(halfSize.x, halfSize.y);
  float dFill = fillDistance(p, center, halfSize, fillCorner);
  // The farthest the front has to go: the screen's farthest corner.
  float fillFar = max(
    max(fillDistance(vec2(0.0), center, halfSize, fillCorner),
        fillDistance(vec2(uResolution.x, 0.0), center, halfSize, fillCorner)),
    max(fillDistance(vec2(0.0, uResolution.y), center, halfSize, fillCorner),
        fillDistance(uResolution, center, halfSize, fillCorner)));
  float fillReach = mix(-480.0, fillFar + 480.0, uFill);
  // A front that wanders a lot, in long tongues and shorter bays.
  float wander = (fbm(p * 0.0028 + 21.0) - 0.5) * 300.0
    + (fbm(p * 0.009 + 33.0) - 0.5) * 110.0;
  float fillFront = fillReach - dFill + wander;
  // How thick the paper is getting here, across a wide band (-0.3 → 1.3)...
  float density = smoothstep(-260.0, 260.0, fillFront) * 1.6 - 0.3;
  // ...which it reaches unevenly, like the mist around the copy: soft cloudy
  // patches thicken ahead of the front and thin ones linger behind it, all
  // blended rather than cut out.
  float clumps = fbm(p * 0.006 + 40.0);
  float filled = uFill > 0.0
    ? smoothstep(clumps - 0.3, clumps + 0.3, density)
    : 0.0;
  paper = max(paper, filled);

  // A veil rather than paper: never fully opaque, and thinner the farther
  // it is from the copy, so the scene shows through more around it. Where
  // the paper spreads to fill the page it thickens as it goes, from the
  // veil's own opacity to solid just before it covers the screen.
  float body = paper;
  float veil = mix(uVeil, 1.0, filled * smoothstep(0.0, 0.85, uFill));
  paper = veil * pow(paper, 1.0 + (1.0 - veil) * 1.6);

  // Grain: transitions break up into fine speckle instead of a hard line.
  float grain = hash(floor(p * uPixelRatio));
  // Only where the paper itself gives way: a veil is see-through all over,
  // and grain across all of it would read as a screen door.
  float edge = 1.0 - abs(2.0 * body - 1.0);
  float alpha = clamp(paper + (grain - 0.5) * 0.22 * veil * edge, 0.0, 1.0);

  // Filled, it is the page's own flat background: no speckle, same color.
  float speck = hash(floor(p * uPixelRatio) + 7.0) - 0.5;
  vec3 color = mix(uPaper, uFillColor, filled) * (1.0 - speck * uGrain * (1.0 - filled));
  gl_FragColor = vec4(color * alpha, alpha);
}
`

export type PaperFrame = {
  layout: { width: number; height: number }
  wash: number
  origin: { x: number; y: number }
  keep: { left: number; top: number; right: number; bottom: number }
  photo: { left: number; top: number; width: number; height: number }
  /**
   * Distance from the copy where the mist starts and finishes thinning, how
   * much to round the copy's box, and how far the edge drifts.
   */
  mist: { start: number; end: number; corner: number; drift: number }
  /**
   * Phones only: the band of sky above the copy and of land below it, each
   * as px from the copy where the paper starts and finishes thinning.
   */
  bands?: {
    top: [number, number]
    bottom: [number, number]
    drift: [number, number]
  }
  /** px: how far the paper holds the scene back from the copy. */
  hug: number
  color: [number, number, number]
  dark: boolean
  /**
   * Phones only: what the matte's green channel marks (the night scene's
   * pines) stands over the paper below the copy, cut along its silhouette.
   */
  standing?: boolean
  /**
   * How opaque the paper is at its thickest, 0–1 (default 1). Below 1 it
   * becomes a veil that the scene shows through, more so toward its edges.
   */
  veil?: number
  /**
   * 0–1: the paper spreading out from the copy to cover the whole screen,
   * for changing pages (default 0).
   */
  fill?: number
  /** The color the paper becomes where it fills the page (default `color`). */
  fillColor?: [number, number, number]
}

type Keep = { left: number; top: number; right: number; bottom: number }

/**
 * The paper's shape for a screen and where the copy sits on it. Shared by
 * the day and night scenes so both settle into the same layout.
 */
export function paperShape(width: number, height: number, keep: Keep) {
  const compact = width < 640
  // Desktop and tablets: a wide, slow haze, so the copy reads first and the
  // scene opens only toward the edges. Phones: a short band above the copy.
  const short = Math.min(width, height)
  const band = Math.max(70, keep.top * 0.8)
  const mist = compact
    ? { start: band * 0.12, end: band, corner: band * 1.2, drift: band * 0.8 }
    : { start: short * 0.1, end: short * 0.62, corner: 0, drift: short * 0.35 }
  // Phones: the scene melts in over most of the space above the copy and
  // below it. Measured from the copy, so they follow it when the page
  // scrolls or bounces; each fade keeps its start below its end even once
  // the copy has moved off screen (a reversed fade would wipe the paper out).
  const above = Math.max(0, keep.top)
  const room = Math.max(0, height - keep.bottom)
  const topStart = Math.max(14, above * 0.12)
  const bottomStart = Math.max(14, room * 0.06)
  const bands = compact
    ? {
        top: [topStart, Math.max(topStart + 40, above * 0.8)] as [
          number,
          number,
        ],
        bottom: [bottomStart, Math.max(bottomStart + 56, room * 0.7)] as [
          number,
          number,
        ],
        drift: [
          Math.max(24, above * 0.45),
          Math.min(160, Math.max(24, room * 0.5)),
        ] as [number, number],
      }
    : undefined
  // The less room around the copy, the further the paper reaches out.
  const tight = Math.min(
    1,
    Math.max(0, (320 - Math.min(room, above + 120)) / 320)
  )
  const hug = 90 + tight * 190
  return { mist, bands, hug }
}

export type PaperRenderer = {
  render: (frame: PaperFrame) => void
  resize: (width: number, height: number, pixelRatio: number) => void
  dispose: () => void
}

/**
 * The matte outlives the renderer, so coming back to the homepage can draw
 * the land on the very first frame instead of waiting for it again.
 */
let sharedLandImage: HTMLImageElement | null = null

export function createPaperRenderer(
  canvas: HTMLCanvasElement,
  /** The matte of the land kept clear of paper, or null for none. */
  landMatte: string | null,
  onLandReady: () => void
): PaperRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
  })
  if (!gl) return null

  const program = link(gl, VERTEX, FRAGMENT)
  if (!program) return null

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  )
  const position = gl.getAttribLocation(program, "aPosition")
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  gl.useProgram(program)

  const uniform = (name: string) => gl.getUniformLocation(program, name)
  const u = {
    resolution: uniform("uResolution"),
    pixelRatio: uniform("uPixelRatio"),
    wash: uniform("uWash"),
    origin: uniform("uOrigin"),
    keep: uniform("uKeep"),
    photo: uniform("uPhoto"),
    land: uniform("uLand"),
    hasLand: uniform("uHasLand"),
    paper: uniform("uPaper"),
    grain: uniform("uGrain"),
    mist: uniform("uMist"),
    compact: uniform("uCompact"),
    bands: uniform("uBands"),
    bandDrift: uniform("uBandDrift"),
    hug: uniform("uHug"),
    standing: uniform("uStanding"),
    veil: uniform("uVeil"),
    fill: uniform("uFill"),
    fillColor: uniform("uFillColor"),
  }

  const texture = gl.createTexture()
  let hasLand = false
  if (
    landMatte &&
    (!sharedLandImage ||
      sharedLandImage.src !== new URL(landMatte, location.href).href)
  ) {
    sharedLandImage = new Image()
    sharedLandImage.decoding = "async"
    sharedLandImage.src = landMatte
  }
  const image = landMatte ? sharedLandImage : null
  const upload = () => {
    if (!image) return
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
    hasLand = true
    onLandReady()
  }
  if (image) {
    const ready = image.complete && image.naturalWidth > 0
    if (ready) upload()
    else image.addEventListener("load", upload, { once: true })
  }

  let pixelRatio = 1

  return {
    resize(width, height, ratio) {
      pixelRatio = ratio
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      gl.viewport(0, 0, canvas.width, canvas.height)
    },
    render({
      layout,
      wash,
      origin,
      keep,
      photo,
      mist,
      bands,
      hug,
      color,
      dark,
      standing,
      veil = 1,
      fill = 0,
      fillColor = color,
    }) {
      gl.uniform2f(u.resolution, layout.width, layout.height)
      gl.uniform1f(u.pixelRatio, pixelRatio)
      gl.uniform1f(u.wash, wash)
      gl.uniform2f(u.origin, origin.x, origin.y)
      gl.uniform4f(u.keep, keep.left, keep.top, keep.right, keep.bottom)
      gl.uniform4f(u.photo, photo.left, photo.top, photo.width, photo.height)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.uniform1i(u.land, 0)
      gl.uniform1f(u.hasLand, hasLand ? 1 : 0)
      gl.uniform3f(u.paper, color[0], color[1], color[2])
      gl.uniform4f(u.mist, mist.start, mist.end, mist.corner, mist.drift)
      gl.uniform1f(u.compact, bands ? 1 : 0)
      if (bands) {
        gl.uniform4f(u.bands, ...bands.top, ...bands.bottom)
        gl.uniform2f(u.bandDrift, ...bands.drift)
      }
      gl.uniform1f(u.hug, hug)
      gl.uniform1f(u.standing, standing ? 1 : 0)
      gl.uniform1f(u.veil, veil)
      gl.uniform1f(u.fill, fill)
      gl.uniform3f(u.fillColor, fillColor[0], fillColor[1], fillColor[2])
      gl.uniform1f(u.grain, dark ? 0.03 : 0.012)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    dispose() {
      image?.removeEventListener("load", upload)
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    },
  }
}

export function link(
  gl: WebGLRenderingContext,
  vertex: string,
  fragment: string
) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }
    return shader
  }

  const vs = compile(gl.VERTEX_SHADER, vertex)
  const fs = compile(gl.FRAGMENT_SHADER, fragment)
  const program = gl.createProgram()
  if (!vs || !fs || !program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    return null
  }
  return program
}
