"use client"

import Image from "next/image"
import { useEffect, useLayoutEffect, useRef } from "react"
import { preload } from "react-dom"

import { createBeaconRenderer } from "@/components/home/beacon"
import {
  isInteractive,
  watchDoubleClicks,
} from "@/components/home/double-click"
import {
  shouldAnimateIntro,
  takeOverHome,
  WORLD_WAIT_MS,
} from "@/components/home/intro"
import { smoothstep } from "@/components/home/math"
import { createNightClouds } from "@/components/home/night/clouds"
import {
  EYE_RGB,
  GIANT,
  MATTES,
  PHOTO_HEIGHT,
  VEIL,
  WORLD,
  ZENITH,
} from "@/components/home/night/config"
import { GiantEyes } from "@/components/home/night/eyes"
import {
  drawFallingGiant,
  type NightType,
} from "@/components/home/night/falling-giant"
import { loadLand } from "@/components/home/night/land"
import { drawLanding, LANDING_LASTS } from "@/components/home/night/landing"
import {
  cameraAt,
  landingX,
  layoutFor,
  photoOnScreen,
  photoWorldTop,
} from "@/components/home/night/layout"
import { createSkyTint } from "@/components/home/night/sky-tint"
import { loadSprites, spritePainter } from "@/components/home/night/sprites"
import { Trail } from "@/components/home/night/trail"
import { createPaperRenderer, paperShape } from "@/components/home/paper"
import {
  canvasPixelRatio,
  readBackgroundRgb,
  readDebugTime,
  readKeepRect,
  readMonoFont,
} from "@/components/home/scene-dom"
import { paperFillAt } from "@/components/paper-fill"

/**
 * The homepage in dark mode: the falling star from The Iron Giant.
 *
 * A starry night with a few small clouds. One star flares up and starts to
 * fall: the Giant, diving head first like a missile, ray-marched in ASCII
 * the way the day scene's seaplane is. The camera follows him down (the
 * film's own tilt from the stars onto the pine hills) until he drops behind
 * the ridge, where the film's hand-drawn burst and smoke go up. His eyes
 * open between the trees, and the night paper comes in around the copy.
 *
 * Its parts live in ./night: the painting, sprites and timeline (config),
 * where the world sits on screen (layout), the clouds, the Giant and his
 * trail, the landing, and his eyes. This file runs the clock and puts
 * them together, frame by frame.
 */

/** What the colors read off the page fall back to. */
const UNREADABLE: [number, number, number] = [0.04, 0.04, 0.04]

type GiantNightProps = {
  /** False when the scene should simply be there, settled. */
  playIntro: boolean
  /** Called once, when the copy should start fading in. */
  onReveal: () => void
}

export function GiantNight({ playIntro, onReveal }: GiantNightProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const fxRef = useRef<HTMLCanvasElement>(null)
  const paperRef = useRef<HTMLCanvasElement>(null)
  const beaconRef = useRef<HTMLCanvasElement>(null)
  const onRevealRef = useRef(onReveal)
  const worldReadyRef = useRef(false)

  // The mattes and effects are only fetched by script; start them with the page.
  preload(MATTES, { as: "image" })

  useEffect(() => {
    onRevealRef.current = onReveal
  }, [onReveal])

  // Layout effect: a settled scene is drawn before the first paint, so
  // coming back to the homepage never shows an empty frame.
  useLayoutEffect(() => {
    const scene = sceneRef.current
    const world = worldRef.current
    const fx = fxRef.current
    const paperCanvas = paperRef.current
    const beaconCanvas = beaconRef.current
    const ctx = fx?.getContext("2d")
    if (!scene || !world || !fx || !paperCanvas || !beaconCanvas || !ctx) return

    const debug = readDebugTime()
    const scrub = Number.isFinite(debug)
    const font = readMonoFont()

    // No intro for reduced motion, or once a slow load has already put the
    // copy on plain paper: the scene just comes up settled around it.
    const { arrivedLate, animate: animateIntro } = shouldAnimateIntro(playIntro)
    const releaseHome = takeOverHome(null, arrivedLate && playIntro)
    if (arrivedLate && playIntro) {
      scene.style.opacity = "0"
      requestAnimationFrame(() => {
        scene.style.transition = "opacity 0.9s ease"
        scene.style.opacity = "1"
      })
    }

    let layout = layoutFor(window.innerWidth, window.innerHeight)
    let clock = scrub ? debug : animateIntro ? 0 : GIANT.settled
    let running = !animateIntro
    let revealed = false
    let lastPaperKey = ""
    const mountedAt = performance.now()

    // The sky's color down the world, to tint the Giant with the air he is
    // falling through. Read off the painting once it's in.
    const sky = createSkyTint(world, () => {
      worldReadyRef.current = true
    })
    const airAt = (y: number) => sky.at(y, layout)

    const beacon = createBeaconRenderer(
      beaconCanvas,
      WORLD,
      PHOTO_HEIGHT,
      MATTES
    )
    const paper = createPaperRenderer(paperCanvas, MATTES, () => {
      lastPaperKey = ""
    })
    // This scene's own background, on purpose: the night paper's color.
    const paperColor = readBackgroundRgb(scene, UNREADABLE)
    // What the paper becomes when it spreads to change pages: exactly the
    // background the next page is drawn on.
    const pageColor = readBackgroundRgb(document.body, UNREADABLE)

    // The land as an alpha mask: whatever falls behind the hills is cut out.
    const land = loadLand()
    const drawSprite = spritePainter(loadSprites(), ctx)

    const buckets = new Map<number, number[]>()
    const trail = new Trail(clock)

    const resize = () => {
      const ratio = canvasPixelRatio()
      layout = layoutFor(window.innerWidth, window.innerHeight)
      world.style.width = `${WORLD.width * layout.scale}px`
      world.style.height = `${WORLD.height * layout.scale}px`
      world.style.left = `${layout.left}px`
      fx.width = Math.round(layout.width * ratio)
      fx.height = Math.round(layout.height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      paper?.resize(layout.width, layout.height, ratio)
      // Soft light: a pixel per CSS pixel is plenty, and keeps it cheap.
      beacon?.resize(layout.width, layout.height, 1)
      lastPaperKey = ""
      trail.clear()
      if (scrub) trail.simulate(clock, layout)
    }

    // The eyes keep to the wall clock (s), which moves on once the intro's
    // clock has come to rest. Set once a frame, before anything reads it.
    let wall = performance.now() / 1000
    let lastWall = wall
    const eyes = new GiantEyes()
    const doubleAt = (x: number, y: number) => eyes.double(x, y, clock, wall)

    const clouds = createNightClouds(drawSprite)

    const drawFx = (t: number, camera: number, sway: number) => {
      const { width, height, scale } = layout
      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.translate(sway, 0)

      const ratio = fx.width / width
      clouds.draw(ctx, fx, ratio, t, camera, sway, layout, wall)

      const fontSize = layout.compact ? 5.5 : 6
      const type: NightType = {
        font,
        fontSize,
        cellWidth: fontSize * 0.6,
        cellHeight: fontSize * 0.85,
      }
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      trail.draw(ctx, t, camera, layout, fontSize, font)
      drawFallingGiant(ctx, t, camera, layout, type, buckets, airAt)

      // The landing, behind the ridge.
      const photoTop = photoWorldTop(layout) - camera
      const since = t - GIANT.impact
      if (since > 0 && since < LANDING_LASTS) {
        drawLanding(
          ctx,
          drawSprite,
          since,
          landingX(layout),
          photoTop + land.ridgeRow * scale,
          scale,
          fontSize,
          font
        )
      }

      // As the copy comes in, the landing's smoke parts around it, as the
      // clouds do: the blast still goes up all around the copy, but the
      // words never sit on top of it.
      const part = 0.88 * smoothstep(GIANT.impact + 0.1, GIANT.reveal + 0.35, t)
      if (part > 0 && since > 0 && since < LANDING_LASTS) {
        clouds.partAroundCopy(ctx, ratio, part, layout)
      }

      // Everything so far is behind the hills.
      if (land.ready) {
        ctx.globalCompositeOperation = "destination-out"
        ctx.drawImage(
          land.canvas,
          layout.left,
          photoTop,
          WORLD.width * scale,
          PHOTO_HEIGHT * scale
        )
        ctx.globalCompositeOperation = "source-over"
      }

      const open = t - GIANT.eyes
      if (open > 0) eyes.draw(ctx, open, photoTop, layout, wall)
      ctx.restore()
    }

    const drawPaper = (
      t: number,
      camera: number,
      sway: number,
      fill: number
    ) => {
      const wash = smoothstep(GIANT.paperStart, GIANT.paperEnd, t)
      const keep = readKeepRect()
      const photo = photoOnScreen(layout, camera, sway)
      const { mist, bands, hug } = paperShape(layout.width, layout.height, keep)
      if (bands) {
        // The land under the copy is as dark as the paper, so the paper can
        // give way to it sooner than the day scene's does to its meadow.
        const room = Math.max(0, layout.height - keep.bottom)
        bands.bottom = [10, Math.max(52, room * 0.45)]
      }
      const key = `${wash.toFixed(4)}|${fill.toFixed(4)}|${keep.left}|${keep.top}|${keep.right}|${keep.bottom}|${layout.width}x${layout.height}|${photo.top.toFixed(1)}|${photo.left.toFixed(1)}`
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
          dark: true,
          standing: true,
          veil: VEIL,
          fill,
          fillColor: pageColor,
        })
      } else {
        paperCanvas.style.background = `rgb(${paperColor.map((c) => c * 255).join(",")})`
        paperCanvas.style.opacity = String(Math.max(wash, fill))
      }
    }

    let beaconShown = false
    const drawBeacon = (t: number, camera: number, sway: number) => {
      if (!beacon) return
      const lit = eyes.at(photoWorldTop(layout) - camera, layout, wall)
      const power = eyes.beaming && t > GIANT.eyes ? lit.power : 0
      const show = power > 0.001 && beacon.ready()
      if (show !== beaconShown) {
        beaconShown = show
        beaconCanvas.style.visibility = show ? "visible" : "hidden"
      }
      const aim = eyes.aim(wall)
      if (!show || !aim) return
      beacon.render({
        width: layout.width,
        height: layout.height,
        photo: photoOnScreen(layout, camera, sway),
        eyes: [lit.left, lit.right],
        aim,
        power,
        color: [EYE_RGB[0] / 255, EYE_RGB[1] / 255, EYE_RGB[2] / 255],
      })
    }

    const render = (t: number) => {
      const fill = paperFillAt(performance.now())
      // The ground shakes when he lands.
      // Two rhythms on each axis, so it rattles instead of bouncing.
      const since = t - GIANT.impact
      const jolt = since > 0 && since < 1.2 ? 7 * Math.exp(-since / 0.2) : 0
      // Sideways only as far as the world overhangs the screen.
      const slack = Math.max(
        0,
        Math.min(
          -layout.left,
          layout.left + WORLD.width * layout.scale - layout.width
        )
      )
      const sway = Math.max(
        -slack,
        Math.min(
          slack,
          jolt * (0.6 * Math.sin(since * 47 + 1) + 0.4 * Math.sin(since * 83))
        )
      )
      const camera =
        cameraAt(t, layout) +
        jolt * (0.65 * Math.sin(since * 61) + 0.35 * Math.sin(since * 109 + 2))
      world.style.transform = `translate3d(${sway}px, ${-camera}px, 0)`
      drawFx(t, camera, sway)
      drawBeacon(t, camera, sway)
      drawPaper(t, camera, sway, fill)
      if (!revealed && t >= GIANT.reveal) {
        revealed = true
        onRevealRef.current?.()
      }
    }

    // Safari tints its toolbars from this fixed layer's background: night
    // sky while he falls, paper once the page has settled.
    let tinted: boolean | null = null
    const tintBars = (t: number) => {
      const settled = t >= GIANT.paperEnd
      if (settled === tinted) return
      tinted = settled
      scene.style.background = settled ? "var(--background)" : ZENITH
    }

    resize()
    sky.read()
    tintBars(clock)
    render(clock)

    const onResize = () => {
      resize()
      render(clock)
    }
    window.addEventListener("resize", onResize)

    const { pointer } = eyes
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.known = true
    }
    const onPointerLeave = () => {
      pointer.known = false
    }
    // A double click (or double tap) lights the way there.
    const stopDoubleClicks = watchDoubleClicks(doubleAt, { touch: true })
    // Touch: a tap is where he looks.
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || isInteractive(event.target)) return
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.known = true
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerup", onPointerUp, { passive: true })
    document.documentElement.addEventListener("mouseleave", onPointerLeave)

    let frame = 0
    let frames = 0
    let previous = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000)
      previous = now
      frames++
      if (!sky.known) sky.read()
      // Wait for the painting, but never hold the copy hostage to it.
      if (
        !running &&
        (worldReadyRef.current || now - mountedAt > WORLD_WAIT_MS)
      ) {
        running = true
      }
      if (running && !scrub) {
        clock += dt
      }
      tintBars(clock)
      // Once everything has come to rest only his eyes move, and slowly:
      // a third of the frames is plenty, except through a blink.
      wall = now / 1000
      const moving =
        clock > GIANT.eyes &&
        eyes.step(
          clock,
          Math.min(0.05, wall - lastWall),
          photoWorldTop(layout) - cameraAt(clock, layout),
          layout,
          wall
        )
      lastWall = wall
      const resting =
        clock > GIANT.impact + 5.5 &&
        eyes.still(clock - GIANT.eyes, moving, wall)
      // Changing pages, every frame.
      const filling = paperFillAt(now) > 0
      if (!resting || filling || frames % 3 === 0) render(clock)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      releaseHome()
      window.removeEventListener("resize", onResize)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      stopDoubleClicks()
      document.documentElement.removeEventListener("mouseleave", onPointerLeave)
      beacon?.dispose()
      land.dispose()
      paper?.dispose()
    }
  }, [playIntro])

  return (
    <div
      ref={sceneRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      style={{ background: playIntro ? ZENITH : "var(--background)" }}
    >
      <div
        ref={worldRef}
        className="absolute top-0 left-0 will-change-transform"
        style={{ background: ZENITH }}
      >
        <Image
          src={WORLD.src}
          alt=""
          fill
          priority
          // Already a small webp; re-encoding it loses the faint stars
          // low in the sky, which is the part the page rests on.
          unoptimized
          className="object-cover"
          onLoad={() => {
            worldReadyRef.current = true
          }}
        />
      </div>
      <canvas ref={fxRef} className="absolute inset-0 z-[1] h-full w-full" />
      {/* The searchlights: added onto the scene, under the paper. */}
      <canvas
        ref={beaconRef}
        className="invisible absolute inset-0 z-[1] h-full w-full mix-blend-screen"
      />
      <canvas ref={paperRef} className="absolute inset-0 z-[2] h-full w-full" />
    </div>
  )
}
