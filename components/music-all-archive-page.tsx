"use client"

import { motion, useReducedMotion } from "motion/react"

import { Artwork } from "@/components/artwork"
import { EASE } from "@/components/motion/entrance"
import { MusicArchiveNav } from "@/components/music-archive-nav"
import { AlbumCaption, SongSummary } from "@/components/music/recap-items"
import {
  type MusicAlbum,
  type MusicArchiveMonth,
  type MusicArchiveYear,
  type MusicRecap,
  type MusicSong,
} from "@/lib/music/types"

type MusicAllArchivePageProps = {
  musicRecap: MusicRecap
  navigation: MusicArchiveYear[]
  selectedMonth: MusicArchiveMonth
  selectedYear: MusicArchiveYear
}

function archiveTransition(delay: number, reducedMotion: boolean) {
  return {
    duration: reducedMotion ? 0 : 0.62,
    delay: reducedMotion ? 0 : delay,
    ease: EASE,
  }
}

function archiveInitial(
  reducedMotion: boolean,
  options: { blur?: number; y?: number } = {}
) {
  if (reducedMotion) {
    return { opacity: 1, y: 0, filter: "blur(0px)" }
  }

  return {
    opacity: 0,
    y: options.y ?? 14,
    filter: `blur(${options.blur ?? 10}px)`,
  }
}

const archiveVisible = {
  opacity: 1,
  y: 0,
  filter: "blur(0px)",
}

function chunk<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size)
  )
}

function MusicArtwork({
  artworkUrl,
  sizes,
  title,
}: {
  artworkUrl?: string
  sizes: string
  title: string
}) {
  return (
    <Artwork
      alt={`${title} cover`}
      className="relative aspect-square overflow-hidden shadow-sm"
      imageClassName="object-fill"
      initialsClassName="absolute right-1.5 bottom-1.5 font-serif text-xs font-semibold text-muted-foreground/70"
      sizes={sizes}
      src={artworkUrl}
      title={title}
    />
  )
}

function AlbumCard({
  album,
  index,
  reducedMotion,
}: {
  album: MusicAlbum
  index: number
  reducedMotion: boolean
}) {
  return (
    <motion.article
      className="min-w-0"
      initial={archiveInitial(reducedMotion, { blur: 8, y: 10 })}
      animate={archiveVisible}
      transition={archiveTransition(0.12 + index * 0.045, reducedMotion)}
    >
      <div className="relative">
        <MusicArtwork
          artworkUrl={album.artworkUrl}
          sizes="(min-width: 1280px) 190px, (min-width: 768px) 20vw, 45vw"
          title={album.title}
        />
        <span className="absolute top-1.5 left-1.5 bg-background/80 px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums shadow-sm backdrop-blur-sm">
          {album.rank}
        </span>
      </div>
      <AlbumCaption album={album} />
    </motion.article>
  )
}

function SongRow({
  index,
  reducedMotion,
  showDivider,
  song,
}: {
  index: number
  reducedMotion: boolean
  showDivider: boolean
  song: MusicSong
}) {
  return (
    <motion.li
      className="relative grid grid-cols-[1.35rem_minmax(0,1fr)] gap-2 transition-colors hover:bg-muted/20"
      initial={archiveInitial(reducedMotion, { blur: 4, y: 8 })}
      animate={archiveVisible}
      transition={archiveTransition(0.72 + index * 0.028, reducedMotion)}
    >
      {showDivider ? (
        <span
          aria-hidden="true"
          className="absolute right-0 bottom-0 left-[2rem] h-px bg-border/70"
        />
      ) : null}
      <span className="py-2.5 text-sm font-medium text-muted-foreground/55 tabular-nums">
        {song.rank}
      </span>
      <div className="grid min-h-16 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
        <div className="size-11">
          <MusicArtwork
            artworkUrl={song.artworkUrl}
            sizes="44px"
            title={song.title}
          />
        </div>
        <SongSummary song={song} />
      </div>
    </motion.li>
  )
}

export function MusicAllArchivePage({
  musicRecap,
  navigation,
  selectedMonth,
  selectedYear,
}: MusicAllArchivePageProps) {
  const reducedMotion = useReducedMotion() ?? false
  const animationKey = `${selectedYear.year}-${selectedMonth.slug}`
  const songColumns = chunk(musicRecap.songs.slice(0, 15), 5)

  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col items-center py-10 sm:py-14 md:py-16 lg:py-20">
        <section className="w-full px-6 sm:px-10 md:px-16 lg:px-20">
          <div className="mx-auto max-w-5xl text-base">
            <div className="relative flex flex-col gap-10 2xl:flex-row">
              <motion.aside
                className="2xl:fixed 2xl:top-1/2 2xl:left-12 2xl:w-40 2xl:-translate-y-1/2"
                initial={archiveInitial(reducedMotion, { blur: 6, y: 8 })}
                animate={archiveVisible}
                transition={archiveTransition(0, reducedMotion)}
              >
                <MusicArchiveNav
                  navigation={navigation}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                />
              </motion.aside>

              <main key={animationKey} className="flex w-full flex-col gap-14">
                <section className="flex flex-col gap-3">
                  <motion.h1
                    className="text-xl font-medium text-foreground"
                    initial={archiveInitial(reducedMotion)}
                    animate={archiveVisible}
                    transition={archiveTransition(0.04, reducedMotion)}
                  >
                    Top albums
                  </motion.h1>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
                    {musicRecap.albums.slice(0, 15).map((album, index) => (
                      <AlbumCard
                        key={`${album.rank}-${album.title}`}
                        album={album}
                        index={index}
                        reducedMotion={reducedMotion}
                      />
                    ))}
                  </div>
                </section>

                <section className="flex flex-col gap-3">
                  <motion.h2
                    className="text-xl font-medium text-foreground"
                    initial={archiveInitial(reducedMotion)}
                    animate={archiveVisible}
                    transition={archiveTransition(0.62, reducedMotion)}
                  >
                    Top songs
                  </motion.h2>
                  <motion.div
                    className="border-y border-border/70"
                    initial={archiveInitial(reducedMotion, { blur: 4, y: 8 })}
                    animate={archiveVisible}
                    transition={archiveTransition(0.66, reducedMotion)}
                  >
                    <div className="grid gap-x-6 md:grid-cols-3">
                      {songColumns.map((songs, columnIndex) => (
                        <ul key={columnIndex} className="flex flex-col">
                          {songs.map((song, songIndex) => (
                            <SongRow
                              key={`${song.rank}-${song.title}`}
                              index={columnIndex * 5 + songIndex}
                              reducedMotion={reducedMotion}
                              showDivider={songIndex < songs.length - 1}
                              song={song}
                            />
                          ))}
                        </ul>
                      ))}
                    </div>
                  </motion.div>
                </section>
              </main>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
