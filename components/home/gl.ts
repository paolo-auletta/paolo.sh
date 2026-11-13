/**
 * What the homepage's two WebGL layers (the paper and the night's
 * searchlights) share: each is one fragment shader drawn over a quad that
 * covers its canvas.
 */

/** The quad's vertex shader: the fragment shader does all the work. */
export const QUAD_VERTEX = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

/** GLSL: hash noise in [0, 1) for a 2D point. */
export const GLSL_HASH = `float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}`

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

/**
 * Feeds `program` (now in use) a quad over the whole canvas. Returns its
 * buffer, to delete on dispose.
 */
export function bindFullScreenQuad(
  gl: WebGLRenderingContext,
  program: WebGLProgram
) {
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
  return buffer
}

/** Looks up a program's uniforms, in the order given, by their GLSL names. */
export function uniformsOf<K extends string>(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  names: Record<K, string>
) {
  const locations = {} as Record<K, WebGLUniformLocation | null>
  for (const key in names) {
    locations[key] = gl.getUniformLocation(program, names[key])
  }
  return locations
}

/** Sizes a canvas to the screen at `ratio` device px per CSS px. */
export function sizeCanvas(
  gl: WebGLRenderingContext,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  ratio: number
) {
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  gl.viewport(0, 0, canvas.width, canvas.height)
}
