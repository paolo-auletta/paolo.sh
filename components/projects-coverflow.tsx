"use client"

import React, {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react"
import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"

const PROJECTS = [
  {
    id: 0,
    title: "Better Skills",
    href: "https://better-skills.dev",
    image: "/images/better-skills.webp",
  },
  {
    id: 1,
    title: "Cravit",
    href: "https://getcravit.com",
    image: "/images/cravit.webp",
  },
  {
    id: 2,
    title: "Maturamente",
    href: "https://maturamente.it",
    image: "/images/maturamente.webp",
  },
  {
    id: 3,
    title: "AnimalAID Italia",
    href: "https://animalaid.it",
    image: "/images/animal-aid.webp",
  },
  {
    id: 4,
    title: "Roamlit",
    href: "https://roamlit.com",
    image: "/images/roamlit.webp",
  },
]

const GAP = 210
const DIAGONAL_OFFSET_NEAR = 105
const DIAGONAL_OFFSET_FAR = 210
const STACK_OVERLAP_RATIO = 0.24
const MOBILE_GAP = 10
const MOBILE_DIAGONAL_OFFSET_NEAR = 84
const MOBILE_DIAGONAL_OFFSET_FAR = 144
const ANIMATION_EASE = 16
const WHEEL_IDLE_GRACE_MS = 200

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

function getProjectLinkLabel(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "")
  } catch {
    return href.replace(/^https?:\/\//, "")
  }
}

function getItemTransform(
  index: number,
  playhead: number,
  isMobileLayout: boolean
): { transform: string; opacity: number; zIndex: number; clipInset: number } {
  const distance = index - playhead
  const absD = Math.abs(distance)
  const sign = distance >= 0 ? 1 : -1

  let translateX = 0
  let translateY = 0
  let translateZ = 0
  let scale = 1
  let rotateY = 0
  let opacity = 1
  let clipInset = 0

  if (isMobileLayout) {
    if (absD <= 1) {
      translateX = lerp(0, 20, absD)
      translateY = lerp(0, MOBILE_DIAGONAL_OFFSET_NEAR, absD)
      translateZ = lerp(0, -90, absD)
      scale = lerp(1, 0.95, absD)
      rotateY = lerp(0, 10, absD)
      opacity = lerp(1, 0.78, absD)
      clipInset = lerp(0, 12, absD)
    } else if (absD <= 2) {
      const progress = absD - 1
      translateX = lerp(20, 34, progress)
      translateY = lerp(
        MOBILE_DIAGONAL_OFFSET_NEAR,
        MOBILE_DIAGONAL_OFFSET_FAR,
        progress
      )
      translateZ = lerp(-90, -180, progress)
      scale = lerp(0.95, 0.88, progress)
      rotateY = lerp(10, 16, progress)
      opacity = lerp(0.78, 0.56, progress)
      clipInset = lerp(12, 16, progress)
    } else {
      const farProgress = Math.min(absD - 2, 1)
      translateX = 34
      translateY = lerp(
        MOBILE_DIAGONAL_OFFSET_FAR,
        MOBILE_DIAGONAL_OFFSET_FAR + 24,
        farProgress
      )
      translateZ = lerp(-180, -260, farProgress)
      scale = lerp(0.88, 0.8, farProgress)
      rotateY = 16
      opacity = lerp(0.56, 0.42, farProgress)
      clipInset = lerp(16, 19, farProgress)
    }
  } else if (absD <= 1) {
    translateX = lerp(0, 48, absD)
    translateY = lerp(0, DIAGONAL_OFFSET_NEAR, absD)
    translateZ = lerp(0, -120, absD)
    scale = lerp(1, 0.915, absD)
    rotateY = lerp(0, 12, absD)
    opacity = lerp(1, 0.88, absD)
    clipInset = lerp(0, 11, absD)
  } else if (absD <= 2) {
    const progress = absD - 1
    translateX = lerp(48, 78, progress)
    translateY = lerp(DIAGONAL_OFFSET_NEAR, DIAGONAL_OFFSET_FAR, progress)
    translateZ = lerp(-120, -260, progress)
    scale = lerp(0.915, 0.82, progress)
    rotateY = lerp(12, 22, progress)
    opacity = lerp(0.88, 0.72, progress)
    clipInset = lerp(11, 16, progress)
  } else {
    const farProgress = Math.min(absD - 2, 1)
    translateX = 78
    translateY = DIAGONAL_OFFSET_FAR
    translateZ = lerp(-260, -420, farProgress)
    scale = lerp(0.82, 0.74, farProgress)
    rotateY = 22
    opacity = lerp(0.72, 0.54, farProgress)
    clipInset = lerp(16, 19, farProgress)
  }

  return {
    transform:
      absD < 0.001
        ? "none"
        : `translateX(${-sign * translateX}px) translateY(${sign * translateY}px) translateZ(${translateZ}px) scale(${scale}) rotateY(${sign * rotateY}deg)`,
    opacity,
    zIndex: Math.max(10, Math.round(100 - absD * 10)),
    clipInset,
  }
}

export function ProjectsCoverflow() {
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const [playhead, setPlayhead] = useState(0)
  const [targetIndex, setTargetIndex] = useState(0)
  const [cardWidth, setCardWidth] = useState(640)
  const [isDragging, setIsDragging] = useState(false)
  const firstCardRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef(0)
  const dragState = useRef<{
    pointerId: number
    startX: number
    startPlayhead: number
  } | null>(null)
  const didDragRef = useRef(false)
  const wheelAccumulator = useRef(0)
  const lastWheelTime = useRef(0)
  const ignoreWheelUntil = useRef(0)
  const manualNavigationLock = useRef(false)
  const targetPlayheadRef = useRef(0)

  const isAtStart = targetIndex === 0
  const isAtEnd = targetIndex === PROJECTS.length - 1

  const setTargetPlayhead = useCallback((value: number) => {
    const next = clamp(value, 0, PROJECTS.length - 1)
    targetPlayheadRef.current = next
    setTargetIndex(Math.round(next))
  }, [])

  const syncPlayhead = useCallback((value: number) => {
    const next = clamp(value, 0, PROJECTS.length - 1)
    targetPlayheadRef.current = next
    playheadRef.current = next
    setTargetIndex(Math.round(next))
    setPlayhead(next)
  }, [])

  const nudgePlayhead = useCallback(
    (step: number) => {
      setTargetPlayhead(Math.round(targetPlayheadRef.current) + step)
    },
    [setTargetPlayhead]
  )

  const suppressWheelMomentum = useCallback((lockNavigation = false) => {
    wheelAccumulator.current = 0
    lastWheelTime.current = 0
    ignoreWheelUntil.current = Date.now() + WHEEL_IDLE_GRACE_MS
    manualNavigationLock.current = lockNavigation
  }, [])

  useLayoutEffect(() => {
    const el = firstCardRef.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setCardWidth(entry.contentRect.width)
      }
    })

    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        suppressWheelMomentum(true)
        nudgePlayhead(-1)
      }

      if (e.key === "ArrowRight") {
        suppressWheelMomentum(true)
        nudgePlayhead(1)
      }
    }

    window.addEventListener("keydown", handleKey)

    return () => window.removeEventListener("keydown", handleKey)
  }, [nudgePlayhead, suppressWheelMomentum])

  useEffect(() => {
    let frameId = 0
    let previousTime = 0

    const animate = (time: number) => {
      const deltaSeconds =
        previousTime === 0 ? 0 : Math.min((time - previousTime) / 1000, 0.05)
      previousTime = time

      if (dragState.current === null) {
        const current = playheadRef.current
        const target = targetPlayheadRef.current
        const delta = target - current

        if (Math.abs(delta) > 0.0005) {
          const blend = 1 - Math.exp(-ANIMATION_EASE * deltaSeconds)
          const next = current + delta * blend
          playheadRef.current = next
          setPlayhead(next)
        } else if (current !== target) {
          playheadRef.current = target
          setPlayhead(target)
        }

        if (
          manualNavigationLock.current &&
          Math.abs(target - playheadRef.current) < 0.001
        ) {
          manualNavigationLock.current = false
          ignoreWheelUntil.current = Date.now() + WHEEL_IDLE_GRACE_MS
        }
      }

      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)

    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const overlap = clamp(cardWidth * STACK_OVERLAP_RATIO, 88, 200)
  const isMobileLayout = cardWidth < 520
  const isCompactMetaLayout = cardWidth < 700
  const responsiveGap = isMobileLayout
    ? MOBILE_GAP
    : lerp(120, GAP, clamp((cardWidth - 320) / 320, 0, 1))
  const effectiveOverlap = isMobileLayout ? 0 : overlap
  const stackStep = cardWidth - effectiveOverlap + responsiveGap
  const offset = playhead * stackStep + cardWidth / 2

  const trackStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: `${responsiveGap}px`,
    minWidth: "100%",
    minHeight: "100%",
    opacity: 1,
    transformStyle: "preserve-3d",
    pointerEvents: "none",
    willChange: "transform",
    transform: `translateX(-${offset}px) translateY(-50%)`,
    transition: "none",
  }

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const now = Date.now()

      if (manualNavigationLock.current || now < ignoreWheelUntil.current) {
        ignoreWheelUntil.current = now + WHEEL_IDLE_GRACE_MS
        return
      }

      if (now - lastWheelTime.current > 500) {
        wheelAccumulator.current = 0
      }
      lastWheelTime.current = now

      const delta =
        Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX

      if (wheelAccumulator.current !== 0) {
        const accumulatorDirection = Math.sign(wheelAccumulator.current)
        const deltaDirection = Math.sign(delta)
        if (
          deltaDirection !== 0 &&
          accumulatorDirection !== 0 &&
          deltaDirection !== accumulatorDirection
        ) {
          wheelAccumulator.current = 0
        }
      }

      const roundedTarget = Math.round(targetPlayheadRef.current)
      const isPushingPastStart = roundedTarget === 0 && delta < 0
      const isPushingPastEnd =
        roundedTarget === PROJECTS.length - 1 && delta > 0
      if (isPushingPastStart || isPushingPastEnd) {
        wheelAccumulator.current = 0
        ignoreWheelUntil.current = now + WHEEL_IDLE_GRACE_MS
        return
      }

      wheelAccumulator.current += delta
      const threshold = 35

      while (wheelAccumulator.current >= threshold) {
        wheelAccumulator.current -= threshold
        nudgePlayhead(1)
      }

      while (wheelAccumulator.current <= -threshold) {
        wheelAccumulator.current += threshold
        nudgePlayhead(-1)
      }
    },
    [nudgePlayhead]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return

      didDragRef.current = false
      dragState.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startPlayhead: playheadRef.current,
      }
      setTargetPlayhead(playheadRef.current)
      suppressWheelMomentum(false)
      setIsDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [setTargetPlayhead, suppressWheelMomentum]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragState.current
      if (!drag || drag.pointerId !== e.pointerId) return

      e.preventDefault()
      const pixelsPerCard = Math.max(220, stackStep * 0.78)
      const diff = drag.startX - e.clientX
      if (Math.abs(diff) > 6) {
        didDragRef.current = true
      }
      syncPlayhead(drag.startPlayhead + diff / pixelsPerCard)
    },
    [stackStep, syncPlayhead]
  )

  const stopDragging = useCallback(
    (pointerId: number) => {
      if (dragState.current?.pointerId !== pointerId) return

      setTargetPlayhead(Math.round(playheadRef.current))
      dragState.current = null
      setIsDragging(false)
    },
    [setTargetPlayhead]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      stopDragging(e.pointerId)
    },
    [stopDragging]
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      stopDragging(e.pointerId)
    },
    [stopDragging]
  )

  return (
    <div className="min-h-svh bg-background">
      <Link
        href="/"
        className="fixed top-3 left-3 z-20 inline-flex h-9 items-center gap-1 rounded-full border border-border/70 bg-background/88 px-3 text-sm font-medium text-foreground shadow-xs backdrop-blur-md transition-all hover:bg-background dark:border-white/12 dark:bg-black/45 dark:text-white dark:shadow-black/30 dark:hover:bg-black/60"
      >
        <span className="flex items-center gap-0.5">
          <svg
            className="size-3"
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15.0002 20L8.4144 13.4142C7.63335 12.6332 7.63335 11.3669 8.4144 10.5858L15.0002 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </span>
      </Link>

      <div className="h-svh touch-none">
        <div
          role="listbox"
          className={cn(
            "relative h-svh w-full overflow-hidden select-none",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{ touchAction: "none", perspective: "450px" }}
          onWheel={handleWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div data-slot="coverflow-track" style={trackStyle}>
            {PROJECTS.map((project, index) => {
              const { transform, opacity, zIndex, clipInset } =
                getItemTransform(index, playhead, isMobileLayout)
              const distanceFromCenter = Math.abs(index - playhead)
              const isFocusedProject =
                index === targetIndex && Math.abs(index - playhead) < 0.12
              const isCenteredProject = distanceFromCenter < 0.35
              const revealMetaOnHover =
                isCenteredProject && !isCompactMetaLayout
              const showCompactMeta = isCenteredProject && isCompactMetaLayout
              const previewProgress = clamp(distanceFromCenter / 0.9, 0, 1)
              const mobileFocusProgress = clamp(1 - distanceFromCenter, 0, 1)
              const mobileCardHeight = clamp(
                lerp(cardWidth * 0.82, cardWidth * 1.34, mobileFocusProgress),
                232,
                460
              )

              const itemStyle: React.CSSProperties = {
                flexShrink: 0,
                marginLeft:
                  index === 0 || isMobileLayout ? 0 : `${-effectiveOverlap}px`,
                pointerEvents: "auto",
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
                opacity,
                zIndex,
                filter: "blur(0px)",
                willChange: "transform, opacity",
                transform,
                transition: "none",
              }

              const clippedMask = `inset(${clipInset}% ${clipInset}% round 24px)`

              const containerStyle: React.CSSProperties = {
                clipPath: clippedMask,
                WebkitClipPath: clippedMask,
                borderRadius: 24,
                overflow: "hidden",
                isolation: "isolate",
                transition: "none",
              }

              const mediaStyle: React.CSSProperties = {
                clipPath: clippedMask,
                WebkitClipPath: clippedMask,
                borderRadius: 24,
                transition: "none",
              }

              const imageStyle: React.CSSProperties = {
                ...mediaStyle,
                filter: `brightness(${lerp(1, 0.82, previewProgress)}) contrast(${lerp(1, 0.92, previewProgress)})`,
              }

              const overlayStyle: React.CSSProperties = {
                ...mediaStyle,
                backgroundColor: `rgba(0, 0, 0, ${lerp(isMobileLayout ? 0.12 : 0.08, 0.4, previewProgress)})`,
              }

              return (
                <div
                  key={project.id}
                  style={itemStyle}
                  ref={index === 0 ? firstCardRef : undefined}
                >
                  <a
                    href={project.href}
                    aria-label={`Open ${project.title}`}
                    className="group block"
                    onDragStart={(e) => e.preventDefault()}
                    onClick={(e) => {
                      if (didDragRef.current) {
                        e.preventDefault()
                        didDragRef.current = false
                        return
                      }

                      if (isFocusedProject) return

                      e.preventDefault()
                      suppressWheelMomentum(true)
                      setTargetPlayhead(index)
                    }}
                  >
                    <div
                      className="relative flex w-[80vw] items-center justify-center overflow-hidden md:aspect-[16/10] md:w-[480px] lg:w-[45vw] xl:w-[50vw]"
                      style={{
                        ...containerStyle,
                        height: isMobileLayout
                          ? `${mobileCardHeight}px`
                          : undefined,
                      }}
                    >
                      <Image
                        src={project.image}
                        alt={project.title}
                        fill
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover"
                        style={imageStyle}
                        sizes="(max-width: 768px) 80vw, (max-width: 1024px) 480px, (max-width: 1280px) 45vw, 50vw"
                        priority={index === 0}
                      />
                      <div className="absolute inset-0" style={overlayStyle} />
                      {/* <div
                        className={cn(
                          "group/meta pointer-events-auto absolute inset-x-[12px] bottom-[12px] flex translate-y-2 items-center justify-between gap-3 rounded-[12px] border border-white/10 bg-black/75 py-4 pr-4 pl-6 text-white opacity-0 shadow-[0_16px_32px_rgba(0,0,0,0.22)] transition-all duration-200 ease-out md:translate-y-2 md:opacity-0",
                          showCompactMeta && "translate-y-0 opacity-100",
                          revealMetaOnHover &&
                            "md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-visible:translate-y-0 md:group-focus-visible:opacity-100"
                        )}
                      >
                        <div className="flex min-w-0 flex-col gap-px">
                          <div className="truncate text-lg">
                            {project.title}
                          </div>
                          <div className="truncate font-mono text-xs text-white/58">
                            {getProjectLinkLabel(project.href)}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/[0.06] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200",
                            revealMetaOnHover &&
                              "group-hover/meta:scale-105 group-hover/meta:border-white/22 group-hover/meta:bg-white/[0.1] group-focus-visible/meta:scale-105 group-focus-visible/meta:border-white/22 group-focus-visible/meta:bg-white/[0.1]"
                          )}
                        >
                          <svg
                            className="size-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M7 17L17 7M9 7H17V15"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div> */}
                    </div>
                  </a>
                </div>
              )
            })}
          </div>

          <div
            className="absolute bottom-4 left-1/2 z-[120] flex -translate-x-1/2 flex-row gap-2"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Previous project"
              disabled={hasMounted ? isAtStart : undefined}
              onClick={() => {
                suppressWheelMomentum(true)
                nudgePlayhead(-1)
              }}
              className="inline-flex min-h-10 min-w-12 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-xs transition-all hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M10 5.75L3.75 12L10 18.25M4.5 12H20.25"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next project"
              disabled={hasMounted ? isAtEnd : undefined}
              onClick={() => {
                suppressWheelMomentum(true)
                nudgePlayhead(1)
              }}
              className="inline-flex min-h-10 min-w-12 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-xs transition-all hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 5.75L20.25 12L14 18.25M19.5 12H3.75"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
