"use client"

import { useLayoutEffect, useState, type RefObject } from "react"

import { ActivityArchivePage } from "@/components/activity-archive-page"
import {
  MovieActivityRows,
  PinnedFilmCards,
} from "@/components/movies/movie-activity"
import { PinnedAlbumCards } from "@/components/music/music-activity"
import { type LetterboxdMovie } from "@/lib/letterboxd"
import { pinnedFilms } from "@/lib/movies"
import { type MusicAlbum } from "@/lib/music/types"

/**
 * The Music and Movies pages, laid out invisibly over the homepage, so a
 * preview carried there (components/motion/carried-cover.ts) knows exactly
 * where it will land before the page exists, at any size of window.
 *
 * Each ghost is the page's own layout, built from its own parts, with blank
 * stand-ins for the pictures and the words: only the geometry is real. The
 * landing is marked as on the page itself (data-paper="landing").
 */

/** A single line of nothing: holds a line's height without saying anything. */
const BLANK = " "

const albums: MusicAlbum[] = Array.from({ length: 4 }, (_, index) => ({
  artist: BLANK,
  minutes: 0,
  rank: String(index + 1),
  title: `${BLANK}${index}`,
}))

const films = pinnedFilms.map((film) => ({ ...film, posterUrl: "" }))

const diary = (rows: number): LetterboxdMovie[] =>
  Array.from({ length: rows }, (_, index) => ({
    date: BLANK,
    liked: false,
    link: `#${index}`,
    releaseDate: BLANK,
    title: BLANK,
    watchedDate: BLANK,
  }))

function Ghost({
  href,
  pinned,
  rows,
  ref,
}: {
  href: string
  pinned: React.ReactNode
  rows?: React.ReactNode
  ref?: RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      inert
      data-ghost={href}
      className="pointer-events-none invisible fixed inset-0 overflow-hidden"
    >
      <ActivityArchivePage
        still
        title={BLANK}
        monthLabel={BLANK}
        pinned={pinned}
        rows={rows}
        viewAllHref="https://letterboxd.com"
      />
    </div>
  )
}

export function MusicGhost({
  ref,
}: {
  ref?: RefObject<HTMLDivElement | null>
}) {
  return (
    <Ghost
      ref={ref}
      href="/music"
      pinned={<PinnedAlbumCards albums={albums} />}
    />
  )
}

/** `row`: the diary row of the film the homepage names. */
export function MoviesGhost({ row }: { row: number }) {
  return (
    <Ghost
      href="/movies"
      pinned={<PinnedFilmCards films={films} />}
      rows={<MovieActivityRows movies={diary(row + 1)} landing={row} />}
    />
  )
}

/**
 * The width of a pinned card, read off a ghost: the homepage's previews
 * open at exactly the size their picture has on its page.
 */
export function usePinnedCardWidth(
  ghost: RefObject<HTMLElement | null>,
  fallback: number
) {
  const [width, setWidth] = useState(fallback)

  useLayoutEffect(() => {
    const card = ghost.current?.querySelector('[data-paper~="card"]')
    if (!card) return
    const observer = new ResizeObserver(() =>
      setWidth(card.getBoundingClientRect().width)
    )
    observer.observe(card)
    return () => observer.disconnect()
  }, [ghost])

  return width
}
