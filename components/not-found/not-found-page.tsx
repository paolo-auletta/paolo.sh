"use client"

import { motion, useReducedMotion } from "motion/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type MouseEvent } from "react"

import { skipHomeIntro } from "@/components/home/intro"
import { entranceTransition, fadeUp } from "@/components/motion/entrance"

import { Beach } from "./beach"

/*
 * The copy is a page of 8½'s screenplay: the scene heading (404 as the scene
 * number), then the exchange on the beach. The man pulling the rope:
 * "Avvocato, l'ho preso!" The lawyer, from his horse: "Giù, definitivamente."
 * His reply is the way home. Hovering it, the man reels Guido in; pressing
 * it, Guido falls, the dream ends on bare page, and the homepage takes over
 * from there: it arrives as from any other page, its paper drawing back.
 *
 * Portrait, the copy sits at the top and the beach below; landscape, the copy
 * sits left and the beach right: the [@media(min-aspect-ratio:6/5)] classes,
 * the same query as LANDSCAPE_QUERY in beach.ts.
 */

export function NotFoundPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const beachRef = useRef<Beach | null>(null)
  const [falling, setFalling] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    const beach = new Beach(canvasRef.current!, copyRef.current!)
    beachRef.current = beach
    return () => {
      beach.destroy()
      beachRef.current = null
    }
  }, [])

  const entrance = (step: number) => ({
    variants: fadeUp,
    initial: reduced ? false : ("hidden" as const),
    animate: "visible" as const,
    transition: entranceTransition(step),
  })
  const reel = (on: boolean) => beachRef.current?.setPull(on)

  const fallHome = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey) return
    if (event.shiftKey || event.altKey) return
    event.preventDefault()
    if (falling) return
    setFalling(true)
    skipHomeIntro()
    const landed = beachRef.current?.fall() ?? Promise.resolve()
    landed.then(() => router.push("/"))
  }

  return (
    <main className="relative min-h-svh overflow-hidden">
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full text-foreground [image-rendering:pixelated]"
      />
      <div className="relative z-10 flex min-h-svh flex-col px-6 pt-[14svh] sm:px-10 [@media(min-aspect-ratio:6/5)]:justify-center [@media(min-aspect-ratio:6/5)]:pt-0 [@media(min-aspect-ratio:6/5)]:pl-[7vw]">
        <div
          ref={copyRef}
          lang="it"
          className={`flex w-fit flex-col gap-6 text-sm leading-relaxed text-muted-foreground transition-[opacity,filter,translate] duration-300 ease-out motion-reduce:transition-none sm:text-base ${falling ? "pointer-events-none -translate-y-1.5 opacity-0 blur-sm" : ""}`}
        >
          <h1 lang="en" className="sr-only">
            404: page not found
          </h1>
          <motion.p className="mb-3 flex gap-[2ch]" {...entrance(0)}>
            <span>404</span>
            <span className="font-medium text-foreground">
              EST. SPIAGGIA – GIORNO
            </span>
          </motion.p>
          <motion.div {...entrance(0.15)}>
            <p className="pl-[8ch]">L’UOMO CON LA CORDA</p>
            <p className="text-foreground">Avvocato, l’ho preso!</p>
          </motion.div>
          <motion.div {...entrance(0.3)}>
            <Link
              href="/"
              aria-label="Back to the homepage"
              data-own-transition
              className="group block w-fit cursor-pointer"
              onPointerEnter={() => reel(true)}
              onPointerLeave={() => reel(false)}
              onFocus={() => reel(true)}
              onBlur={() => reel(false)}
              onClick={fallHome}
            >
              <span className="block pl-[8ch]">L’AVVOCATO</span>
              <span className="block font-medium text-foreground underline decoration-muted-foreground/25 decoration-1 underline-offset-3 transition-colors group-hover:decoration-foreground group-focus-visible:decoration-foreground">
                Giù, definitivamente.
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
