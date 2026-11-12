import { link } from "@/components/home/paper"

/**
 * The Giant's eyes as searchlights. A beam from each eye to a point on the
 * screen, lit against the painting as if it had depth: the night scene's
 * mattes carry a depth map of the painting (blue: how near each pixel is),
 * so the beam
 *
 * - passes behind whatever stands in front of it and in front of whatever
 *   is behind it, glowing in the air only where it is not hidden;
 * - lights the surfaces it reaches, by how squarely they face it and how far
 *   they are from the eyes;
 * - is stopped by what stands in its way, so the trees it grazes throw
 *   shadows onto what is behind them.
 *
 * Everything is worked out in the painting's own pixels, unprojected with a
 * simple pinhole camera, so it holds at any screen size.
 */

const VERTEX = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT = `
precision highp float;

uniform vec2 uResolution;   // CSS px
uniform float uPixelRatio;
uniform vec4 uPhoto;        // the painting's resting part on screen: left, top, width, height
uniform sampler2D uAlbedo;  // that part of the painting
uniform sampler2D uMattes;  // r: the land; b: how near it is (0 the sky, 1 the nearest pines)
uniform vec2 uEyeL;         // CSS px
uniform vec2 uEyeR;
uniform float uEyeDepth;
uniform vec2 uEnd;          // painting px: where the beam ends
uniform float uEndDepth;
uniform float uHit;         // 1: it ends on something; 0: it runs off the screen
uniform float uPower;       // 0 off, 1 full
uniform vec3 uLight;

const vec2 PHOTO = vec2(2000.0, 1100.0);
const vec2 CENTER = vec2(1000.0, 560.0);
const float FOCAL = 1500.0;
const float SKY = 30.0;
// How fast the beam widens, and how wide it leaves the eye (painting px).
const float SPREAD = 0.06;
const float LENS = 11.0;

vec2 toPhoto(vec2 p) {
  return (p - uPhoto.xy) / uPhoto.zw * PHOTO;
}

float nearness(vec2 q) {
  if (q.y < 0.0) return 0.0;
  return texture2D(uMattes, clamp(q / PHOTO, 0.0, 1.0)).b;
}

// Depth from nearness: the nearest pines at 1, the far hills around 4, the
// sky far off.
float depthOf(float n) {
  return 1.0 / (1.0 / SKY + (1.0 - 1.0 / SKY) * n);
}

float depthAt(vec2 q) {
  return depthOf(nearness(q));
}

vec3 place(vec2 q, float z) {
  return vec3((q - CENTER) / FOCAL * z, z);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// How much of one beam a point gets: a soft-edged cone from the eye along
// the beam, gone past its end (x: fully there until, y: gone by).
float cone(vec3 x, vec3 eye, vec3 dir, float lens, vec2 end) {
  vec3 l = x - eye;
  float along = dot(l, dir);
  if (along <= 0.0) return 0.0;
  float radius = lens + along * SPREAD;
  float off = length(l - along * dir) / radius;
  return exp(-off * off * 2.2) * (1.0 - smoothstep(end.x, end.y, along));
}

float segmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float k = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  return length(p - a - ab * k);
}

void main() {
  vec2 p = gl_FragCoord.xy / uPixelRatio;
  p.y = uResolution.y - p.y;
  vec2 q = toPhoto(p);

  vec2 qL = toPhoto(uEyeL);
  vec2 qR = toPhoto(uEyeR);
  vec2 qE = (qL + qR) * 0.5;
  float zE = uEyeDepth;
  vec3 eyeL = place(qL, zE);
  vec3 eyeR = place(qR, zE);
  vec3 eye = (eyeL + eyeR) * 0.5;
  float lens = LENS / FOCAL * zE;

  // Where the beam ends (traced on the CPU): on whatever stops it, or past
  // the edge of the screen. Each eye's beam converges on it, like a gaze.
  vec3 tip = place(uEnd, uEndDepth);
  vec3 dir = normalize(tip - eye);
  vec3 dirL = normalize(tip - eyeL);
  vec3 dirR = normalize(tip - eyeR);
  float span = length(tip - eye);
  // What it lands on is lit all over, a little past the point; in the air
  // it stops right there. Off the screen, it just goes on.
  vec2 fade = uHit > 0.5 ? vec2(span * 1.12, span * 1.45) : vec2(span, span * 1.3);
  vec2 airFade = uHit > 0.5 ? vec2(span * 0.97, span * 1.03) : fade;
  float end = fade.y;

  // Far from the beam on screen: nothing to do.
  float reach = (lens + end * SPREAD) / min(zE, uEndDepth) * FOCAL * 2.2 + 40.0;
  if (segmentDistance(q, qE, uEnd) > reach) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float n = nearness(q);
  bool sky = n < 0.004;
  float z = sky ? SKY : depthOf(n);
  vec3 surface = place(q, z);
  vec3 light = vec3(0.0);

  if (!sky) {
    float spot = max(
      cone(surface, eyeL, dirL, lens, fade),
      cone(surface, eyeR, dirR, lens, fade)
    );
    if (spot > 0.003) {
      // Its slope, from the depth around it, facing the camera.
      vec2 dx = vec2(3.0, 0.0);
      vec2 dy = vec2(0.0, 3.0);
      vec3 px = place(q + dx, depthAt(q + dx));
      vec3 py = place(q + dy, depthAt(q + dy));
      vec3 normal = normalize(cross(py - surface, px - surface));
      if (normal.z > 0.0) normal = -normal;
      vec3 toEye = eye - surface;
      float dist = length(toEye);
      // Lit from behind, it is the far side that faces him: count it all
      // the same, a little dimmer.
      float facing = dot(normal, toEye / dist);
      facing = facing > 0.0 ? facing : -facing * 0.6;

      // Walk from here toward the eyes: wherever the light's path runs
      // behind something, that thing may be in its way. Only if it is
      // clearly nearer (the depth is a painting's guess, so its own slopes
      // must not shade themselves), and only as deep as it plausibly goes:
      // a pine is a thin thing the light can pass behind, a hill is solid.
      // Starting a little way off the surface, for the same reason.
      float blocked = 0.0;
      float jitter = hash(p);
      float skip = min(0.5, 14.0 / max(length(qE - q), 1.0));
      for (int i = 0; i < 24; i++) {
        float k = mix(skip, 0.97, (float(i) + jitter) / 24.0);
        vec2 s = mix(q, qE, k);
        float zr = 1.0 / mix(1.0 / z, 1.0 / zE, k);
        vec3 m = s.y < 0.0 ? vec3(0.0) : texture2D(uMattes, clamp(s / PHOTO, 0.0, 1.0)).rgb;
        float rel = (zr - depthOf(m.b)) / zr;
        float thick = mix(0.5, 0.14, m.g);
        blocked += smoothstep(0.06, 0.12, rel) * (1.0 - smoothstep(thick, thick + 0.08, rel));
      }
      // A few stray samples only dim it; a real obstacle puts it out.
      float lit = 1.0 - smoothstep(0.0, 5.0, blocked);

      vec3 albedo = texture2D(uAlbedo, q / PHOTO).rgb;
      float falloff = 1.0 / (1.0 + 0.05 * dist * dist);
      // Night paint is dark: lit, it shows its colors, and even the
      // blackest hill catches a pale patch.
      light += (albedo * 2.6 + 0.09) * spot * mix(0.4, 1.0, facing) * lit * falloff * 1.6;
    }
  }

  // The beam in the air: along this pixel's line of sight, up to whatever
  // it lands on, sum how much of either cone it passes through.
  float zTip = uEndDepth;
  float pad = lens + end * SPREAD + 0.15;
  float zNear = max(0.2, min(eye.z, zTip) - pad);
  float zFar = min(z, max(eye.z, zTip) + pad);
  if (zFar > zNear) {
    vec3 view = vec3((q - CENTER) / FOCAL, 1.0);
    float dz = (zFar - zNear) / 40.0;
    float jitter = hash(p + 3.1);
    float haze = 0.0;
    for (int i = 0; i < 40; i++) {
      vec3 x = view * (zNear + (float(i) + jitter) * dz);
      vec3 l = x - eye;
      float along = max(dot(l, dir), 0.0);
      float radius = lens + along * SPREAD;
      haze += (cone(x, eyeL, dirL, lens, airFade) + cone(x, eyeR, dirR, lens, airFade))
        / (radius * (1.0 + 0.35 * along));
    }
    light += vec3(min(haze * dz * 0.055, 1.6));
  }

  gl_FragColor = vec4(min(light * uLight * uPower, vec3(1.0)), 1.0);
}
`

const PHOTO_WIDTH = 2000
const SKY = 30
/** Depth from nearness, as in the shader. */
const depthOf = (near: number) => 1 / (1 / SKY + (1 - 1 / SKY) * near)

export type BeaconFrame = {
  width: number
  height: number
  /** The painting's resting part on screen. */
  photo: { left: number; top: number; width: number; height: number }
  eyes: [{ x: number; y: number }, { x: number; y: number }]
  aim: { x: number; y: number }
  /** 0 off, 1 full. */
  power: number
  /** 0–1 RGB. */
  color: [number, number, number]
}

export type BeaconRenderer = {
  render: (frame: BeaconFrame) => void
  resize: (width: number, height: number, pixelRatio: number) => void
  /** True once the painting and its depth are in. */
  ready: () => boolean
  dispose: () => void
}

export function createBeaconRenderer(
  canvas: HTMLCanvasElement,
  /** The painting; its resting part is the bottom `photoHeight` rows. */
  world: { src: string; width: number; height: number },
  photoHeight: number,
  mattesSrc: string
): BeaconRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: false,
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
    photo: uniform("uPhoto"),
    albedo: uniform("uAlbedo"),
    mattes: uniform("uMattes"),
    eyeL: uniform("uEyeL"),
    eyeR: uniform("uEyeR"),
    eyeDepth: uniform("uEyeDepth"),
    end: uniform("uEnd"),
    endDepth: uniform("uEndDepth"),
    hit: uniform("uHit"),
    power: uniform("uPower"),
    light: uniform("uLight"),
  }
  gl.uniform1i(u.albedo, 0)
  gl.uniform1i(u.mattes, 1)

  let pending = 2
  let disposed = false
  const textures: WebGLTexture[] = []
  const load = (
    unit: number,
    src: string,
    prepare: (image: HTMLImageElement) => TexImageSource
  ) => {
    const texture = gl.createTexture()
    if (!texture) return
    textures.push(texture)
    const image = new window.Image()
    image.decoding = "async"
    image.onload = () => {
      if (disposed) return
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        prepare(image)
      )
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      pending--
    }
    image.src = src
  }
  // Only the part the scene rests on, at its own size.
  load(0, world.src, (image) => {
    const crop = document.createElement("canvas")
    crop.width = world.width
    crop.height = photoHeight
    const c = crop.getContext("2d")
    const scale = image.naturalWidth / world.width
    c?.drawImage(
      image,
      0,
      (world.height - photoHeight) * scale,
      image.naturalWidth,
      photoHeight * scale,
      0,
      0,
      crop.width,
      crop.height
    )
    return crop
  })
  // The depth and the pines, kept on the CPU too, to trace the beam.
  let mattes: {
    width: number
    height: number
    data: Uint8ClampedArray
  } | null = null
  load(1, mattesSrc, (image) => {
    const copy = document.createElement("canvas")
    copy.width = image.naturalWidth
    copy.height = image.naturalHeight
    const c = copy.getContext("2d", { willReadFrequently: true })
    if (c) {
      c.drawImage(image, 0, 0)
      try {
        mattes = {
          width: copy.width,
          height: copy.height,
          data: c.getImageData(0, 0, copy.width, copy.height).data,
        }
      } catch {
        // A tainted canvas: the beam just runs off the screen.
      }
    }
    return image
  })

  /** Nearness (0 the sky, 1 the nearest pines) and pine-ness at a point. */
  const sample = (qx: number, qy: number) => {
    if (!mattes || qy < 0) return { near: 0, pine: 0 }
    const x = Math.round(
      Math.min(1, Math.max(0, qx / PHOTO_WIDTH)) * (mattes.width - 1)
    )
    const y = Math.round(
      Math.min(1, Math.max(0, qy / photoHeight)) * (mattes.height - 1)
    )
    const i = (y * mattes.width + x) * 4
    return { near: mattes.data[i + 2] / 255, pine: mattes.data[i + 1] / 255 }
  }

  /**
   * Follows the beam from the eyes through the point, as far as it goes.
   * Its depth runs from the eyes' to the point's (just in front of the land
   * there, or the pine itself, or a little farther off than the eyes for the
   * sky) and on, along a straight line in space. It stops on a pine at
   * about its own depth (nearer pines it just passes behind), on a hill
   * rising in its way, or when it comes too close or leaves the screen.
   * Open ground below it never stops it: it skims over.
   */
  const trace = (
    eye: { x: number; y: number },
    aim: { x: number; y: number },
    photo: BeaconFrame["photo"],
    width: number,
    height: number
  ) => {
    const toQ = (p: { x: number; y: number }) => ({
      x: ((p.x - photo.left) / photo.width) * PHOTO_WIDTH,
      y: ((p.y - photo.top) / photo.height) * photoHeight,
    })
    const qE = toQ(eye)
    const qA = toQ(aim)
    const zE = depthOf(sample(qE.x, qE.y).near) * 0.97
    const at = sample(qA.x, qA.y)
    // A pine, or a hill rising above him: it lands there (unless something
    // stops it first). Open ground: it skims over it and on.
    const land = at.near > 0.004
    const target = land && (at.pine > 0.5 || qA.y < qE.y)
    const zA = !land
      ? zE * 1.2
      : target
        ? depthOf(at.near)
        : depthOf(at.near) * 0.95
    const toAim = Math.hypot(qA.x - qE.x, qA.y - qE.y)
    if (toAim < 1) return { zE, end: qA, endDepth: zA, hit: target }
    const dx = (qA.x - qE.x) / toAim
    const dy = (qA.y - qE.y) / toAim
    const toScreen = photo.width / PHOTO_WIDTH
    /** CSS px past the edges before it counts as gone. */
    const margin = 60
    const step = 3
    let d = 16
    let last = { x: qA.x, y: qA.y, z: zA }
    for (; d < 6000; d += step) {
      if (target && d >= toAim) {
        return { zE, end: qA, endDepth: zA, hit: true }
      }
      const k = d / toAim
      const inverse = 1 / zE + (1 / zA - 1 / zE) * k
      if (inverse <= 0 || 1 / inverse > 40) break
      const zb = 1 / inverse
      if (zb < 0.45) return { zE, end: last, endDepth: last.z, hit: false }
      const q = { x: qE.x + dx * d, y: qE.y + dy * d }
      const sx = photo.left + q.x * toScreen
      const sy = photo.top + q.y * toScreen
      last = { x: q.x, y: q.y, z: zb }
      if (
        sx < -margin ||
        sy < -margin ||
        sx > width + margin ||
        sy > height + margin
      ) {
        return { zE, end: last, endDepth: zb, hit: false }
      }
      const there = sample(q.x, q.y)
      if (there.near < 0.004) continue
      const rel = (zb - depthOf(there.near)) / zb
      const blocks =
        there.pine > 0.5
          ? rel > 0.02 && rel < 0.2
          : q.y < qE.y && rel > 0.03 && rel < 0.5
      if (blocks) return { zE, end: last, endDepth: zb, hit: true }
    }
    return { zE, end: last, endDepth: last.z, hit: false }
  }

  let pixelRatio = 1
  let blank = true

  return {
    ready: () => pending === 0,
    resize(width, height, ratio) {
      pixelRatio = ratio
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      gl.viewport(0, 0, canvas.width, canvas.height)
      blank = false
    },
    render({ width, height, photo, eyes, aim, power, color }) {
      if (pending > 0 || power <= 0.001) {
        if (!blank) {
          gl.clearColor(0, 0, 0, 1)
          gl.clear(gl.COLOR_BUFFER_BIT)
          blank = true
        }
        return
      }
      blank = false
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, textures[0])
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, textures[1])
      gl.uniform2f(u.resolution, width, height)
      gl.uniform1f(u.pixelRatio, pixelRatio)
      gl.uniform4f(u.photo, photo.left, photo.top, photo.width, photo.height)
      gl.uniform2f(u.eyeL, eyes[0].x, eyes[0].y)
      gl.uniform2f(u.eyeR, eyes[1].x, eyes[1].y)
      const center = {
        x: (eyes[0].x + eyes[1].x) / 2,
        y: (eyes[0].y + eyes[1].y) / 2,
      }
      const beam = trace(center, aim, photo, width, height)
      gl.uniform1f(u.eyeDepth, beam.zE)
      gl.uniform2f(u.end, beam.end.x, beam.end.y)
      gl.uniform1f(u.endDepth, beam.endDepth)
      gl.uniform1f(u.hit, beam.hit ? 1 : 0)
      gl.uniform1f(u.power, power)
      gl.uniform3f(u.light, ...color)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    dispose() {
      disposed = true
      for (const texture of textures) gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    },
  }
}
