"use client"

import Image from "next/image"
import { useRef } from "react"

/**
 * A photo printed in blue on plaster. Wherever the cursor is, a soft patch
 * of it comes back to its own colors, and closes up again once the cursor
 * leaves. A finger does the same where it touches.
 */
export function Duo({
  src,
  alt,
  sizes,
}: {
  src: string
  alt: string
  sizes: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const touch = useRef(false)

  const aim = (e: { clientX: number; clientY: number }) => {
    const el = ref.current
    if (!el) return
    const box = el.getBoundingClientRect()
    el.style.setProperty(
      "--x",
      `${(((e.clientX - box.left) / box.width) * 100).toFixed(1)}%`
    )
    el.style.setProperty(
      "--y",
      `${(((e.clientY - box.top) / box.height) * 100).toFixed(1)}%`
    )
  }

  return (
    <div
      ref={ref}
      className="mk-duo"
      onPointerEnter={(e) => {
        aim(e)
        if (e.pointerType === "mouse") ref.current?.classList.add("is-lit")
      }}
      onPointerMove={(e) => {
        if (e.pointerType === "mouse") aim(e)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") ref.current?.classList.remove("is-lit")
      }}
      onPointerDown={(e) => {
        touch.current = e.pointerType !== "mouse"
      }}
      onClick={(e) => {
        // A tap (not a scroll) opens it where it lands, or closes it.
        if (!touch.current) return
        aim(e)
        ref.current?.classList.toggle("is-lit")
      }}
    >
      <Image src={src} alt={alt} fill sizes={sizes} className="mk-mono" />
      <span className="mk-wall" aria-hidden />
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        className="mk-true"
        aria-hidden
      />
    </div>
  )
}
