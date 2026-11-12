"use client"

import Image from "next/image"
import { useEffect, useLayoutEffect, useRef } from "react"
import { preload } from "react-dom"

import { projectPoint, rasterizePlane } from "@/components/home/ascii-plane"
import {
  INTRO,
  cameraProgress,
  flightAt,
  getLayout,
  paperProgress,
  restingFlight,
  Wanderer,
  type FlightFrame,
  type Layout,
} from "@/components/home/flight"
import {
  shouldAnimateIntro,
  takeOverHome,
  WORLD_WAIT_MS,
} from "@/components/home/intro"
import {
  createPaperRenderer,
  paperShape,
  type PaperRenderer,
} from "@/components/home/paper"
import { Smoke } from "@/components/home/smoke"
import { cn } from "@/lib/utils"

/** The baked painting: generated sky on top, the film still underneath. */
const WORLD = { src: "/home/sky-world.webp", width: 2000, height: 2883 }
/** Height of the original still at the bottom of the world image. */
const PHOTO_HEIGHT = 1083
/** Row of the still where the mountain ridge peaks. */
const RIDGE_ROW = 540
const LAND_MATTE = "/home/land-matte.webp"
const ZENITH = "rgb(9, 129, 185)"

type Cloud = {
  src: string
  width: number
  height: number
  /** Horizontal center, as a fraction of the viewport width. */
  x: number
  /** Vertical center before the descent, in viewport heights. */
  y: number
  /** Parallax: about 1 moves with the painting, >1 is closer than it. */
  depth: number
  size: number
  flip?: boolean
  blur?: number
  /** In front of the plane. */
  front?: boolean
}

const CLOUDS: Cloud[] = [
  {
    src: "/home/cloud-wisp.webp",
    width: 260,
    height: 137,
    x: 0.2,
    y: 0.2,
    depth: 0.55,
    size: 0.85,
  },
  {
    src: "/home/cloud-tower.webp",
    width: 390,
    height: 335,
    x: 0.74,
    y: 0.66,
    depth: 0.8,
    size: 1.2,
  },
  {
    src: "/home/cloud-puffs.webp",
    width: 286,
    height: 88,
    x: 0.42,
    y: 0.92,
    depth: 0.7,
    size: 0.9,
    flip: true,
  },
  {
    src: "/home/cloud-bank.webp",
    width: 335,
    height: 205,
    x: 0.16,
    y: 1.25,
    depth: 0.95,
    size: 1.25,
    flip: true,
  },
  {
    src: "/home/cloud-wisp.webp",
    width: 260,
    height: 137,
    x: 0.84,
    y: 1.45,
    depth: 1.15,
    size: 1.3,
  },
  // The plane flies behind this one about halfway down.
  {
    src: "/home/cloud-tower-dense.webp",
    width: 390,
    height: 335,
    x: 0.44,
    y: 1.66,
    depth: 1.3,
    size: 1.9,
    blur: 0.6,
    front: true,
    flip: true,
  },
  {
    src: "/home/cloud-puffs.webp",
    width: 286,
    height: 88,
    x: 0.9,
    y: 1.05,
    depth: 1.3,
    size: 1.7,
    blur: 1,
    front: true,
  },
]

type SkySceneProps = {
  playIntro: boolean
  /** Called once, when the copy should start fading in. */
  onReveal: () => void
}

export function SkyScene({ playIntro, onReveal }: SkySceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const cloudRefs = useRef<(HTMLDivElement | null)[]>([])
  const planeCanvasRef = useRef<HTMLCanvasElement>(null)
  const paperCanvasRef = useRef<HTMLCanvasElement>(null)
  const onRevealRef = useRef(onReveal)
  const worldReadyRef = useRef(false)
  const fallbackRef = useRef<HTMLDivElement>(null)

  // The land matte is only fetched by script; start it with the page.
  preload(LAND_MATTE, { as: "image" })

  useEffect(() => {
    onRevealRef.current = onReveal
  }, [onReveal])

  // Layout effect: when coming back to the homepage the settled scene is
  // drawn before the first paint, so there's never an empty frame.
  useLayoutEffect(() => {
    const scene = sceneRef.current
    const world = worldRef.current
    const planeCanvas = planeCanvasRef.current
    const paperCanvas = paperCanvasRef.current
    const context = planeCanvas?.getContext("2d")
    if (!scene || !world || !planeCanvas || !paperCanvas || !context) return

    const debugTime =
      process.env.NODE_ENV === "development"
        ? Number.parseFloat(
            new URLSearchParams(window.location.search).get("t") ?? ""
          )
        : Number.NaN

    // On a slow load the copy may already be showing on plain paper (the
    // fallback in globals.css). Don't make anyone sit through the intro after
    // that, or when they've asked to save data.
    const {
      reducedMotion,
      arrivedLate,
      animate: animateIntro,
    } = shouldAnimateIntro(playIntro)
    let clock = Number.isFinite(debugTime)
      ? debugTime
      : animateIntro
        ? 0
        : INTRO.settled
    let speed = 1
    let revealed = false
    let running = !animateIntro
    const mountedAt = performance.now()
    if (world.querySelector("img")?.complete) worldReadyRef.current = true

    const releaseHome = takeOverHome(
      fallbackRef.current,
      arrivedLate && playIntro
    )

    let lastPaperKey = ""
    const paper: PaperRenderer | null = createPaperRenderer(
      paperCanvas,
      LAND_MATTE,
      () => {
        lastPaperKey = ""
      }
    )
    const planeFont = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-mono")
      .trim()
    const smoke = new Smoke()
    let smokeClock = clock
    const buckets = new Map<number, number[]>()
    const colorStrings = new Map<number, string>()

    let layout: Layout = getLayout(window.innerWidth, window.innerHeight)
    let wanderer = new Wanderer(layout)
    let worldScale = 1
    let descent = 0
    let camera = 0
    let paperColor = readPaperColor()
    let isDark = document.documentElement.classList.contains("dark")

    const resize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      layout = getLayout(width, height)
      wanderer = new Wanderer(layout)
      worldScale = Math.max(width / WORLD.width, height / PHOTO_HEIGHT)
      // Land so the ridge sits at layout.ridge, without ever leaving a gap
      // under the painting. A ridge of 0 rests the still on the bottom edge.
      const photoTop = Math.max(
        height * layout.ridge - RIDGE_ROW * worldScale,
        height - PHOTO_HEIGHT * worldScale
      )
      descent = (WORLD.height - PHOTO_HEIGHT) * worldScale - photoTop
      world.style.width = `${WORLD.width * worldScale}px`
      world.style.height = `${WORLD.height * worldScale}px`
      world.style.left = `${(width - WORLD.width * worldScale) / 2}px`
      planeCanvas.width = Math.round(width * ratio)
      planeCanvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      paper?.resize(width, height, ratio)
      lastPaperKey = ""
      smoke.clear()
    }

    const placeScene = (t: number) => {
      const progress = cameraProgress(t)
      camera = progress * descent
      world.style.transform = `translate3d(0, ${-camera}px, 0)`
      // Clouds parallax on progress, so every viewport ends with them gone.
      const span = Math.max(1.55, descent / layout.height)

      CLOUDS.forEach((cloud, index) => {
        const element = cloudRefs.current[index]
        if (!element) return
        const width = cloud.width * worldScale * cloud.size
        const height = cloud.height * worldScale * cloud.size
        const x = cloud.x * layout.width - width / 2 + t * 5 * cloud.depth
        const y =
          (cloud.y - progress * cloud.depth * span) * layout.height - height / 2
        const visible = y < layout.height && y + height > 0
        element.style.visibility = visible ? "visible" : "hidden"
        if (!visible) return
        element.style.width = `${width}px`
        element.style.height = `${height}px`
        element.style.transform = `translate3d(${x}px, ${y}px, 0)`
      })
    }

    const drawPlane = (frame: FlightFrame | null, t: number) => {
      context.clearRect(0, 0, layout.width, layout.height)
      // Over the paper on the way in; inside the sky window once circling.
      planeCanvas.style.zIndex = frame?.phase === "intro" ? "3" : "1"
      // Smoke runs on the scene clock, so it pauses with it.
      const dt = Math.min(0.1, Math.max(0, t - smokeClock))
      smokeClock = t
      if (!frame) {
        smoke.update(dt, 0, 0, 0)
        smoke.draw(context, planeFont || "monospace")
        return
      }

      const compact = layout.width < 640
      // A fine grid: small enough that the glyphs read as texture.
      const fontSize =
        frame.phase === "intro" ? (compact ? 7 : 8) : compact ? 5.5 : 6.5
      const cellWidth = fontSize * 0.6
      const cellHeight = fontSize * 0.85

      // Smoke from the back of the engine nacelle, drawn under the plane.
      const exhaust = projectPoint(frame.pose, frame.scale, -0.2, 0.4, 0)
      smoke.update(dt, frame.x + exhaust.x, frame.y + exhaust.y, frame.scale)
      smoke.draw(context, planeFont || "monospace")

      context.font = `700 ${fontSize}px ${planeFont || "monospace"}`
      context.textAlign = "center"
      context.textBaseline = "middle"

      for (const cells of buckets.values()) cells.length = 0
      rasterizePlane(
        frame.pose,
        {
          originX: frame.x,
          originY: frame.y,
          scale: frame.scale,
          cellWidth,
          cellHeight,
          viewWidth: layout.width,
          viewHeight: layout.height,
        },
        (col, row, glyph, color) => {
          let cells = buckets.get(color)
          if (!cells) {
            cells = []
            buckets.set(color, cells)
          }
          cells.push(col, row, glyph.charCodeAt(0))
        }
      )

      for (const [color, cells] of buckets) {
        if (!cells.length) continue
        let style = colorStrings.get(color)
        if (!style) {
          style = `#${color.toString(16).padStart(6, "0")}`
          colorStrings.set(color, style)
        }
        context.fillStyle = style
        for (let i = 0; i < cells.length; i += 3) {
          context.fillText(
            String.fromCharCode(cells[i + 2]),
            (cells[i] + 0.5) * cellWidth,
            (cells[i + 1] + 0.5) * cellHeight
          )
        }
      }
    }

    const drawPaper = (t: number) => {
      const wash = paperProgress(t)
      const keep = readKeepRect()
      const photo = {
        left: (layout.width - WORLD.width * worldScale) / 2,
        top: (WORLD.height - PHOTO_HEIGHT) * worldScale - camera,
        width: WORLD.width * worldScale,
        height: PHOTO_HEIGHT * worldScale,
      }
      const { mist, bands, hug } = paperShape(layout.width, layout.height, keep)
      const mistEnd = mist.end
      const key = `${mistEnd.toFixed(0)}|${hug.toFixed(0)}|${wash.toFixed(4)}|${keep.left}|${keep.top}|${keep.right}|${keep.bottom}|${layout.width}x${layout.height}|${photo.top.toFixed(1)}|${paperColor.join()}`
      if (key === lastPaperKey) return
      lastPaperKey = key
      if (paper) {
        paper.render({
          layout,
          wash,
          origin: {
            x: (keep.left + keep.right) / 2,
            y: (keep.top + keep.bottom) / 2,
          },
          keep,
          photo,
          mist,
          bands,
          hug,
          color: paperColor,
          dark: isDark,
        })
      } else {
        paperCanvas.style.background = `rgb(${paperColor.map((c) => c * 255).join(",")})`
        paperCanvas.style.opacity = String(wash)
      }
    }

    const frameAt = (t: number) =>
      reducedMotion ? restingFlight(layout) : flightAt(t, layout, wanderer)

    // Safari tints its toolbars from this fixed layer's background: sky blue
    // while we fly in, paper once the page has settled.
    let tinted: boolean | null = null
    const tintBars = (t: number) => {
      const settled = t >= INTRO.paperEnd
      if (settled === tinted) return
      tinted = settled
      scene.style.background = settled ? "var(--background)" : ZENITH
    }

    const render = (t: number) => {
      tintBars(t)
      placeScene(t)
      drawPlane(frameAt(t), t)
      drawPaper(t)
      if (!revealed && t >= INTRO.reveal) {
        revealed = true
        onRevealRef.current()
      }
    }

    resize()
    render(clock)

    const skip = () => {
      if (clock < INTRO.paperEnd) speed = 3.2
    }
    if (animateIntro) {
      window.addEventListener("wheel", skip, { passive: true })
      window.addEventListener("touchstart", skip, { passive: true })
      window.addEventListener("keydown", skip)
      window.addEventListener("pointerdown", skip)
    }

    const onResize = () => {
      resize()
      render(clock)
    }
    window.addEventListener("resize", onResize)

    const themeObserver = new MutationObserver(() => {
      paperColor = readPaperColor()
      isDark = document.documentElement.classList.contains("dark")
      lastPaperKey = ""
      render(clock)
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    let frameId = 0
    let previous = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000)
      previous = now
      // Wait for the painting, but never hold the copy hostage to it.
      if (
        !running &&
        (worldReadyRef.current || now - mountedAt > WORLD_WAIT_MS)
      ) {
        running = true
      }
      if (running && !Number.isFinite(debugTime)) {
        clock += dt * speed
        if (clock > INTRO.paperEnd) speed = 1
      }
      render(clock)
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
      releaseHome()
      window.removeEventListener("resize", onResize)
      window.removeEventListener("wheel", skip)
      window.removeEventListener("touchstart", skip)
      window.removeEventListener("keydown", skip)
      window.removeEventListener("pointerdown", skip)
      themeObserver.disconnect()
      paper?.dispose()
    }
  }, [playIntro])

  return (
    <div
      ref={sceneRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden select-none",
        // Coming back, anything not drawn yet should read as paper, not sky.
        !playIntro && "bg-background"
      )}
      style={playIntro ? { background: ZENITH } : undefined}
    >
      <div className="absolute inset-0 z-0 dark:brightness-85">
        <div
          ref={worldRef}
          className="absolute top-0 left-0 will-change-transform"
          style={playIntro ? { background: ZENITH } : undefined}
        >
          <Image
            src={WORLD.src}
            alt=""
            fill
            priority
            sizes="(max-aspect-ratio: 2000/1083) 185vh, 100vw"
            className="object-cover"
            onLoad={() => {
              worldReadyRef.current = true
            }}
          />
        </div>
        {CLOUDS.map((cloud, index) =>
          cloud.front ? null : (
            <CloudSprite
              key={index}
              cloud={cloud}
              ref={(element) => {
                cloudRefs.current[index] = element
              }}
            />
          )
        )}
      </div>
      <canvas
        ref={planeCanvasRef}
        className="absolute inset-0 z-[1] h-full w-full"
      />
      <canvas
        ref={paperCanvasRef}
        className="absolute inset-0 z-[2] h-full w-full"
      />
      {/* Plain paper for a slow or script-less load; see globals.css. */}
      <div
        ref={fallbackRef}
        data-home-fallback
        className="absolute inset-0 z-[5] bg-background opacity-0"
      />
      {/* Close clouds the plane passes behind; gone before the paper arrives. */}
      <div className="absolute inset-0 z-[4] dark:brightness-85">
        {CLOUDS.map((cloud, index) =>
          cloud.front ? (
            <CloudSprite
              key={index}
              cloud={cloud}
              ref={(element) => {
                cloudRefs.current[index] = element
              }}
            />
          ) : null
        )}
      </div>
    </div>
  )
}

function CloudSprite({
  cloud,
  ref,
}: {
  cloud: Cloud
  ref: (element: HTMLDivElement | null) => void
}) {
  return (
    <div
      ref={ref}
      className="invisible absolute top-0 left-0 will-change-transform"
      style={{ filter: cloud.blur ? `blur(${cloud.blur}px)` : undefined }}
    >
      <Image
        src={cloud.src}
        alt=""
        width={cloud.width}
        height={cloud.height}
        unoptimized
        loading="eager"
        className={cn("block h-full w-full", cloud.flip && "-scale-x-100")}
      />
    </div>
  )
}

/** The page background as linear-ish 0–1 RGB, whatever color space CSS uses. */
function readPaperColor(): [number, number, number] {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) return [1, 1, 1]
  context.fillStyle = getComputedStyle(document.body).backgroundColor
  context.fillRect(0, 0, 1, 1)
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

/** Union of everything the paper must stay under, in viewport pixels. */
function readKeepRect() {
  const rect = {
    left: Infinity,
    top: Infinity,
    right: -Infinity,
    bottom: -Infinity,
  }
  document.querySelectorAll<HTMLElement>("[data-paper-keep]").forEach((el) => {
    const box = el.getBoundingClientRect()
    if (!box.width || !box.height) return
    rect.left = Math.min(rect.left, box.left)
    rect.top = Math.min(rect.top, box.top)
    rect.right = Math.max(rect.right, box.right)
    rect.bottom = Math.max(rect.bottom, box.bottom)
  })
  if (!Number.isFinite(rect.left)) {
    const w = window.innerWidth
    const h = window.innerHeight
    return { left: w * 0.3, top: h * 0.3, right: w * 0.7, bottom: h * 0.6 }
  }
  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
  }
}
