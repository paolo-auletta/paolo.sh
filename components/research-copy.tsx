"use client"

import Link from "next/link"
import { useRef } from "react"

import { Ink } from "@/components/ink"
import { Scene } from "@/components/motion/scene"
import { useEntrance } from "@/components/motion/use-entrance"

/** The homepage copy's entrance: the same curve, duration and stagger. */
const ENTRANCE = { duration: 950, stagger: 820 }
const entranceEase = "cubic-bezier(0.22, 1, 0.36, 1)"

/** Paragraph by paragraph, as on the homepage. */
function rise(root: HTMLElement) {
  const scene = new Scene()
  for (const block of root.querySelectorAll<HTMLElement>("[data-entrance]")) {
    scene.animate(
      block,
      [
        { opacity: 0, transform: "translateY(18px)", filter: "blur(12px)" },
        { opacity: 1, transform: "none", filter: "blur(0px)" },
      ],
      {
        duration: ENTRANCE.duration,
        delay: Number(block.dataset.entrance || 0) * ENTRANCE.stagger,
        easing: entranceEase,
      }
    )
  }
  return scene.go()
}

/**
 * The research page's copy. It arrives like the homepage's, paragraph by
 * paragraph, and once the title has cleared it inks in from grey.
 */
export function ResearchCopy() {
  const ref = useRef<HTMLDivElement>(null)

  useEntrance(
    ref,
    { pending: "entrancePending", probe: "[data-entrance]" },
    rise
  )

  return (
    <div
      ref={ref}
      data-entrance-pending=""
      className="mx-auto flex max-w-xl flex-col gap-8 text-base"
    >
      <div className="flex flex-col gap-3 leading-relaxed">
        <h1 data-entrance="0" className="text-xl font-medium text-foreground">
          <Ink mode="play" delay={ENTRANCE.stagger}>
            Research
          </Ink>
        </h1>
        <p data-entrance="0.15" className="text-muted-foreground">
          Notes, experiments, and research work will live here soon.
        </p>
      </div>
      <div data-entrance="0.28">
        <Link
          href="/"
          className="w-fit text-sm font-medium text-muted-foreground underline decoration-muted-foreground/35 decoration-1 underline-offset-3 transition-colors hover:text-foreground hover:decoration-foreground/50"
        >
          Back
        </Link>
      </div>
    </div>
  )
}
