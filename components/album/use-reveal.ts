"use client"

import { useEffect, useRef } from "react"

/**
 * Marks each [data-reveal] section with .is-revealed as it scrolls into view.
 * Sections only start hidden once this runs (.motion-ready on the page), so
 * without JS, or with reduced motion, everything simply shows. Used by the
 * album and by /miky.
 */
export function useReveal() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const page = ref.current
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return
    page.classList.add("motion-ready")
    const els = Array.from(page.querySelectorAll<HTMLElement>("[data-reveal]"))
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add("is-revealed")
          io.unobserve(e.target)
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return ref
}
