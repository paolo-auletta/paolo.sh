"use client"

import { useRef, type PointerEvent } from "react"

import type { Pointer } from "./relief-gl"

/**
 * The cursor for a polishing surface (relief-gl.ts): pointer handlers for
 * its box, the pointer they drive, and the `wake` that asks for frames.
 * `locate` maps an event to the canvas's 0–1 space, y up.
 */
export function useReliefPointer(
  locate: (e: { clientX: number; clientY: number }) => readonly [number, number]
) {
  const pointer = useRef<Pointer>({
    x: 0.5,
    y: 0.5,
    px: 0.5,
    py: 0.5,
    tx: 0.5,
    ty: 0.5,
    speed: 0,
    over: false,
    down: false,
    last: 0,
  })
  const wake = useRef<() => void>(() => {})

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const [u, v] = locate(e)
    const p = pointer.current
    const now = performance.now()
    if (!p.over) {
      p.x = p.px = p.tx = u
      p.y = p.py = p.ty = v
      p.speed = 0
    } else {
      const dt = Math.max((now - p.last) / 1000, 1 / 120)
      p.speed = Math.min(4, Math.hypot(u - p.tx, v - p.ty) / dt)
    }
    p.tx = u
    p.ty = v
    p.last = now
    p.over = true
    wake.current()
  }

  const leave = () => {
    pointer.current.over = false
    pointer.current.down = false
    wake.current()
  }

  return {
    pointer,
    wake,
    handlers: {
      onPointerEnter: move,
      onPointerMove: move,
      onPointerLeave: leave,
      onPointerCancel: leave,
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        pointer.current.down = true
        move(e)
      },
      onPointerUp: () => {
        pointer.current.down = false
      },
    },
  }
}
