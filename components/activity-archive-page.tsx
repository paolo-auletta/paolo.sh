import Link from "next/link"
import { type ReactNode } from "react"

import { HomePagePositionAnchor } from "@/components/home-page-position-anchor"
import { PaperSheet } from "@/components/paper-sheet"

type ActivityArchivePageProps = {
  /** The month the activity list covers. */
  monthLabel: string
  /** The pinned cards, four across from sm up. Each marks data-paper="card". */
  pinned: ReactNode
  /** The activity list's rows. Each marks data-paper="row". */
  rows: ReactNode
  title: string
  /** An http(s) link opens in a new tab; a path stays on the site. */
  viewAllHref: string
}

const footerLinkClassName =
  "w-fit text-sm font-medium text-muted-foreground underline decoration-muted-foreground/35 decoration-1 underline-offset-3 transition-colors hover:text-foreground hover:decoration-foreground/50"

/** The rule under every row but the last, starting past the rank column. */
export function ActivityRowDivider() {
  return (
    <span
      aria-hidden="true"
      className="absolute right-0 bottom-0 left-[2.1rem] h-px bg-border/70 sm:left-[2.4rem]"
    />
  )
}

/**
 * The list as one sheet of paper: its top and bottom rules are their own
 * elements so Paper can lay them down separately from the rows.
 */
function ActivitySheet({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        data-paper="rule"
        className="absolute inset-x-0 top-0 h-px bg-border/70"
      />
      <ul className="flex flex-col py-px">{children}</ul>
      <span
        aria-hidden="true"
        data-paper="rule"
        className="absolute inset-x-0 bottom-0 h-px bg-border/70"
      />
    </div>
  )
}

/**
 * The Music and Movies pages: a title over pinned cards, then the month's
 * activity as a list, dealt in by Paper (see PaperSheet).
 */
export function ActivityArchivePage({
  monthLabel,
  pinned,
  rows,
  title,
  viewAllHref,
}: ActivityArchivePageProps) {
  const isExternalViewAll = viewAllHref.startsWith("http")

  return (
    <div className="relative flex min-h-svh flex-col">
      {/*
       * From sm up: same spacing as the homepage (app/page.tsx), so the page
       * starts where the homepage copy does. Phones just start at the top.
       */}
      <div className="flex flex-1 flex-col items-center justify-start pt-10 pb-16 sm:[justify-content:safe_center] sm:pt-14 sm:pb-[40svh] md:pt-16">
        <section className="w-full px-6 sm:px-10 md:px-16 lg:px-20">
          <div className="mx-auto max-w-xl text-base lg:max-w-[40rem]">
            <div className="relative overflow-visible">
              <div
                aria-hidden="true"
                className="pointer-events-none invisible hidden select-none sm:block"
              >
                <HomePagePositionAnchor />
              </div>
              <PaperSheet>
                <div className="flex flex-col gap-3">
                  <h1
                    data-paper="title"
                    className="text-xl font-medium text-foreground"
                  >
                    {title}
                  </h1>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
                    {pinned}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div
                    data-paper="head"
                    className="flex items-baseline justify-between gap-4"
                  >
                    <h2 className="font-medium text-foreground">
                      Recent Activity
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {monthLabel}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <ActivitySheet>{rows}</ActivitySheet>
                    <div
                      data-paper="footer"
                      className="flex items-center justify-between gap-4"
                    >
                      <Link
                        className={`${footerLinkClassName} cursor-pointer`}
                        href="/"
                      >
                        Back
                      </Link>
                      {isExternalViewAll ? (
                        <a
                          href={viewAllHref}
                          target="_blank"
                          rel="noreferrer"
                          className={footerLinkClassName}
                        >
                          View all
                        </a>
                      ) : (
                        <Link
                          href={viewAllHref}
                          className={footerLinkClassName}
                        >
                          View all
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </PaperSheet>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
