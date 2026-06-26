"use client"

import { useEffect, useRef } from "react"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useRouter } from "next/navigation"

import { type MusicArchiveMonth, type MusicArchiveYear } from "@/lib/music"

type MusicArchiveNavProps = {
  navigation: MusicArchiveYear[]
  selectedMonth: MusicArchiveMonth
  selectedYear: MusicArchiveYear
}

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

function getArchiveHref(year: MusicArchiveYear, month: MusicArchiveMonth) {
  const params = new URLSearchParams({
    month: month.slug,
    year: year.year,
  })

  return `/music/all?${params}`
}

export function MusicArchiveNav({
  navigation,
  selectedMonth,
  selectedYear,
}: MusicArchiveNavProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion() ?? false
  const monthRailRef = useRef<HTMLDivElement>(null)
  const years = [...navigation].reverse()

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const selectedMonthButton =
        monthRailRef.current?.querySelector<HTMLButtonElement>(
          `[data-month-slug="${selectedMonth.slug}"]`,
        )

      selectedMonthButton?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [reducedMotion, selectedMonth.slug, selectedYear.year])

  return (
    <nav aria-label="Music archive">
      <div className="2xl:hidden">
        <div className="flex items-center gap-5 overflow-x-auto pb-1 text-lg leading-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {years.map((year) => {
            const isSelected = year.year === selectedYear.year
            const latestMonth = year.months[0]

            return (
              <button
                key={year.year}
                type="button"
                aria-current={isSelected ? "page" : undefined}
                className={`shrink-0 cursor-pointer font-medium underline decoration-1 underline-offset-4 transition-colors ${
                  isSelected
                    ? "text-foreground decoration-muted-foreground/35"
                    : "text-muted-foreground/65 decoration-transparent hover:text-foreground hover:decoration-muted-foreground/35"
                }`}
                onClick={() => router.push(getArchiveHref(year, latestMonth))}
              >
                {year.year}
              </button>
            )
          })}
        </div>
        <motion.div
          ref={monthRailRef}
          key={selectedYear.year}
          className="mt-3 flex gap-4 overflow-x-auto pb-1 text-base leading-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease }}
        >
          {[...selectedYear.months].reverse().map((month, index) => {
            const isSelected = month.slug === selectedMonth.slug

            return (
              <motion.button
                key={month.slug}
                type="button"
                aria-current={isSelected ? "page" : undefined}
                data-month-slug={month.slug}
                className={`shrink-0 cursor-pointer underline decoration-1 underline-offset-4 transition-colors ${
                  isSelected
                    ? "font-medium text-foreground decoration-muted-foreground/35"
                    : "text-muted-foreground/65 decoration-transparent hover:text-foreground hover:decoration-muted-foreground/35"
                }`}
                initial={reducedMotion ? false : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.18,
                  delay: reducedMotion ? 0 : index * 0.015,
                  ease,
                }}
                onClick={() => router.push(getArchiveHref(selectedYear, month))}
              >
                {month.label}
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      <ul className="hidden flex-col gap-1.5 text-lg leading-relaxed 2xl:flex">
        {navigation.map((year) => {
          const isOpen = year.year === selectedYear.year
          const latestMonth = year.months[0]

          return (
            <li key={year.year}>
              <button
                type="button"
                className={`block w-fit cursor-pointer font-medium underline decoration-1 underline-offset-4 transition-colors ${
                  isOpen
                    ? "text-foreground decoration-muted-foreground/35"
                    : "text-muted-foreground/70 decoration-transparent hover:text-foreground hover:decoration-muted-foreground/35"
                }`}
                aria-expanded={isOpen}
                onClick={() => router.push(getArchiveHref(year, latestMonth))}
              >
                {year.year}
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.ul
                    key={year.year}
                    className="mt-1 flex flex-col gap-0.5 overflow-hidden pl-5"
                    initial={
                      reducedMotion ? false : { height: 0, opacity: 0, y: -4 }
                    }
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={
                      reducedMotion
                        ? { height: "auto", opacity: 1, y: 0 }
                        : { height: 0, opacity: 0, y: -4 }
                    }
                    transition={{ duration: 0.28, ease }}
                  >
                    {year.months.map((month, index) => {
                      const isSelected = month.slug === selectedMonth.slug

                      return (
                        <motion.li
                          key={month.slug}
                          initial={
                            reducedMotion ? false : { opacity: 0, y: -3 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.18,
                            delay: reducedMotion ? 0 : index * 0.018,
                            ease,
                          }}
                        >
                          <button
                            type="button"
                            aria-current={isSelected ? "page" : undefined}
                            className={`block w-fit cursor-pointer underline decoration-1 underline-offset-4 transition-colors ${
                              isSelected
                                ? "font-medium text-foreground decoration-muted-foreground/35"
                                : "text-muted-foreground/70 decoration-transparent hover:text-foreground hover:decoration-muted-foreground/35"
                            }`}
                            onClick={() =>
                              router.push(getArchiveHref(year, month))
                            }
                          >
                            {month.label}
                          </button>
                        </motion.li>
                      )
                    })}
                  </motion.ul>
                ) : null}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
