"use client"

import { useRef, useState, type ReactNode } from "react"

import { paper } from "@/components/motion/paper"
import { useEntrance } from "@/components/motion/use-entrance"
import { previousPathname } from "@/components/navigation-history"

/**
 * The Music and Movies page itself, as it is dealt in by Paper: the covers
 * are dealt onto the table and the list unfolds. Only when the page is
 * entered, from the homepage or as the first page of a visit; coming back
 * from within the section (the monthly archive, say), everything is
 * already on the table. A `still` sheet is never dealt: it is laid out only
 * to be measured (see components/archive-ghost.tsx).
 */
export function PaperSheet({
  children,
  still = false,
}: {
  children: ReactNode
  still?: boolean
}) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // Read once, while the page renders.
  const [deal] = useState(() => {
    const from = previousPathname()
    return !still && (from === null || from === "/")
  })
  useEntrance(
    sheetRef,
    {
      pending: "paperPending",
      probe: '[data-paper~="title"]',
      enabled: deal,
    },
    paper
  )

  return (
    <div
      ref={sheetRef}
      data-paper-pending={deal ? "" : undefined}
      className="flex flex-col gap-8 sm:absolute sm:inset-x-0 sm:top-0 sm:pb-16"
    >
      {children}
    </div>
  )
}
