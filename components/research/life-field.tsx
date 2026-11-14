"use client"

import { useEffect, useRef } from "react"

import { Life } from "./life"

/**
 * The Game of Life playing behind the research page (see life.ts). The
 * canvas fills its positioned parent, draws in its own text colour, and
 * keeps a clearing around the element in there marked `data-life-clear`.
 */
export function LifeField() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const clear =
      canvas.parentElement?.querySelector<HTMLElement>("[data-life-clear]") ??
      null
    const life = new Life(canvas, clear)
    return () => life.destroy()
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full text-foreground"
    />
  )
}
