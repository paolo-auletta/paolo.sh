"use client"

import { EyeOff } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"

import { MUTED_RULE, MuteFeed } from "@/components/mute-feed"
import { usePageEntranceAnimation } from "@/components/use-page-entrance-animation"
import { Button } from "@/components/ui/button"

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(12px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
}

const transition = (delay: number) => ({
  duration: 0.95,
  delay: delay * 0.82,
  ease,
})

/*
 * The demo block gets the entrance without the blur: Motion leaves
 * `filter: blur(0px)` on the element it animates, and any filtered ancestor
 * becomes a backdrop root, which would leave the veil's backdrop-filter with
 * nothing to blur.
 */
const fadeUpPlain = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
}

const REPO_URL = "https://github.com/paolo-auletta/mute"
// Swap for the listing URL once the store review clears.
const INSTALL_URL = `${REPO_URL}#install`

/** Lucide dropped brand marks in v1, so the GitHub mark ships with the page. */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

const externalLinkProps = { target: "_blank", rel: "noreferrer" } as const

export default function MutePage() {
  const shouldAnimatePageEntrance = usePageEntranceAnimation("mute")
  const entranceInitial = shouldAnimatePageEntrance ? "hidden" : false
  const entranceTransition = (delay: number) =>
    shouldAnimatePageEntrance ? transition(delay) : { duration: 0 }

  const entrance = (delay: number) => ({
    variants: fadeUp,
    initial: entranceInitial,
    animate: "visible" as const,
    transition: entranceTransition(delay),
  })

  const entrancePlain = (delay: number) => ({
    variants: fadeUpPlain,
    initial: entranceInitial,
    animate: "visible" as const,
    transition: entranceTransition(delay),
  })

  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col items-center [justify-content:safe_center] py-10 sm:py-14 md:py-16">
        <section className="w-full px-6 sm:px-10 md:px-16 lg:px-20">
          <div className="mx-auto flex max-w-xl flex-col gap-10 text-base">
            <div className="flex flex-col gap-3 leading-relaxed">
              <motion.h1
                className="text-xl font-medium text-foreground"
                {...entrance(0)}
              >
                Mute
              </motion.h1>
              <motion.p className="text-muted-foreground" {...entrance(0.15)}>
                A Chrome extension that hides what you describe in a sentence.
                No keyword lists, no per-site rules — it reads the post and
                decides.
              </motion.p>
            </div>

            <motion.div className="flex flex-col gap-4" {...entrancePlain(0.3)}>
              <MuteFeed />
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm">
                <span className="text-muted-foreground">Your rule</span>
                <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-border py-1 pr-3 pl-2.5">
                  <EyeOff
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="truncate">{MUTED_RULE}</span>
                </span>
              </div>
            </motion.div>

            <motion.div className="flex flex-col gap-4" {...entrance(0.45)}>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <a href={INSTALL_URL} {...externalLinkProps}>
                    Add to Chrome
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href={REPO_URL} {...externalLinkProps}>
                    <GithubMark className="size-4" />
                    GitHub
                  </a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Open source, MIT. Runs on your own provider key — no account, no
                server.
              </p>
            </motion.div>

            <motion.div className="flex items-center gap-4" {...entrance(0.6)}>
              <Link
                href="/"
                className="w-fit text-sm font-medium text-muted-foreground underline decoration-muted-foreground/35 decoration-1 underline-offset-3 transition-colors hover:text-foreground hover:decoration-foreground/50"
              >
                Back
              </Link>
              <Link
                href="/mute/privacy"
                className="w-fit text-sm text-muted-foreground underline decoration-muted-foreground/35 decoration-1 underline-offset-3 transition-colors hover:text-foreground hover:decoration-foreground/50"
              >
                Privacy
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  )
}
