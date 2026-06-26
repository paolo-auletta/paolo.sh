"use client"

import { Dot, Heart, Star } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import Image from "next/image"
import Link from "next/link"

import { type LetterboxdMovie } from "@/lib/letterboxd"
import { type MusicAlbum, type MusicRecap, type MusicSong } from "@/lib/music"

type ActivityArchivePageProps = {
  monthLabel: string
  movies?: LetterboxdMovie[]
  musicRecap?: MusicRecap
  title: "Music" | "Movies"
  viewAllHref?: string
}

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

const fallbackMovieActivity: LetterboxdMovie[] = [
  {
    date: "22",
    title: "Superman/Batman: Apocalypse",
    director: "Lauren Montgomery",
    liked: false,
    link: "https://letterboxd.com/paoloauletta/film/superman-batman-apocalypse/",
    posterUrl:
      "https://a.ltrbxd.com/resized/film-poster/2/0/0/6/7/20067-superman-batman-apocalypse-0-600-0-900-crop.jpg?v=2d587ec513",
    releaseDate: "2010",
    rating: 1.5,
    watchedDate: "2026-06-22",
  },
  {
    date: "19",
    title: "Superman",
    director: "James Gunn",
    liked: false,
    link: "https://letterboxd.com/paoloauletta/film/superman-2025/",
    posterUrl:
      "https://a.ltrbxd.com/resized/film-poster/9/5/7/0/5/0/957050-superman-2025-0-600-0-900-crop.jpg?v=54e41a55ff",
    releaseDate: "2025",
    rating: 3,
    watchedDate: "2026-06-19",
  },
  {
    date: "07",
    title: "Obsession",
    director: "Curry Barker",
    liked: true,
    link: "https://letterboxd.com/paoloauletta/film/obsession-2025/",
    posterUrl:
      "https://a.ltrbxd.com/resized/film-poster/1/2/3/4/4/7/2/1234472-obsession-2025-2-0-600-0-900-crop.jpg?v=cff6fc00b6",
    releaseDate: "2025",
    rating: 4.5,
    watchedDate: "2026-06-07",
  },
  {
    date: "05",
    title: "Backrooms",
    director: "Kane Parsons",
    liked: true,
    link: "https://letterboxd.com/paoloauletta/film/backrooms-2026/",
    posterUrl:
      "https://a.ltrbxd.com/resized/film-poster/9/7/6/4/1/9/976419-backrooms-2026-0-600-0-900-crop.jpg?v=f7a99e3fc8",
    releaseDate: "2026",
    rating: 3.5,
    watchedDate: "2026-06-05",
  },
  {
    date: "01",
    title: "Scott Pilgrim vs. the World",
    director: "Edgar Wright",
    liked: true,
    link: "https://letterboxd.com/paoloauletta/film/scott-pilgrim-vs-the-world/",
    posterUrl:
      "https://a.ltrbxd.com/resized/sm/upload/vs/75/02/fx/2B5zjs5E3xerqAyowpw3QcOCyLq-0-600-0-900-crop.jpg?v=3aef2095df",
    releaseDate: "2010",
    rating: 4.5,
    watchedDate: "2026-06-01",
  },
]

const fallbackMusicRecap: MusicRecap = {
  monthLabel: "June 2026",
  albums: [
    {
      artist: "Kanye West",
      minutes: 42,
      rank: "1",
      title: "My Beautiful Dark Twisted Fantasy",
    },
    {
      artist: "Frank Ocean",
      minutes: 38,
      rank: "2",
      title: "Blonde",
    },
    {
      artist: "Lykke Li",
      minutes: 31,
      rank: "3",
      title: "I Never Learn",
    },
    {
      artist: "Lucio Battisti",
      minutes: 28,
      rank: "4",
      title: "Anima latina",
    },
  ],
  songs: [
    {
      artist: "Lykke Li",
      rank: "1",
      streams: 10,
      title: "I Follow Rivers (The Magician Remix)",
    },
    {
      artist: "Kanye West",
      rank: "2",
      streams: 6,
      title: "Devil In a New Dress (feat. Rick Ross)",
    },
    {
      artist: "Kanye West",
      rank: "3",
      streams: 6,
      title: "Big Brother",
    },
    {
      artist: "Frank Ocean",
      rank: "4",
      streams: 5,
      title: "Nights",
    },
    {
      artist: "Lucio Battisti",
      rank: "5",
      streams: 5,
      title: "Prendila cosi",
    },
  ],
}

const pinnedMovieActivity: LetterboxdMovie[] = [
  {
    date: "",
    director: "Federico Fellini",
    liked: true,
    link: "https://letterboxd.com/film/8-half/",
    posterUrl: "/movies/8-half.jpg",
    releaseDate: "1963",
    title: "8½",
    watchedDate: "",
  },
  {
    date: "",
    director: "Hideaki Anno, Kazuya Tsurumaki",
    liked: true,
    link: "https://letterboxd.com/film/neon-genesis-evangelion-the-end-of-evangelion/",
    posterUrl:
      "https://a.ltrbxd.com/resized/film-poster/4/0/3/1/1/40311-neon-genesis-evangelion-the-end-of-evangelion-0-600-0-900-crop.jpg?v=cecd0c42",
    releaseDate: "1997",
    title: "Neon Genesis Evangelion",
    watchedDate: "",
  },
  {
    date: "",
    director: "Woody Allen",
    liked: true,
    link: "https://letterboxd.com/film/crimes-and-misdemeanors/",
    posterUrl:
      "https://a.ltrbxd.com/resized/film-poster/4/5/1/8/6/45186-crimes-and-misdemeanors-0-600-0-900-crop.jpg?v=c65bc92f",
    releaseDate: "1989",
    title: "Crimes and Misdemeanors",
    watchedDate: "",
  },
  {
    date: "",
    director: "Hayao Miyazaki",
    liked: true,
    link: "https://letterboxd.com/paoloauletta/film/the-wind-rises/",
    posterUrl:
      "https://a.ltrbxd.com/resized/film-poster/1/1/2/9/5/7/112957-the-wind-rises-0-600-0-900-crop.jpg?v=42f2af65",
    releaseDate: "2013",
    title: "The Wind Rises",
    watchedDate: "",
  },
]

function archiveTransition(delay: number, reducedMotion: boolean) {
  return {
    duration: reducedMotion ? 0 : 0.62,
    delay: reducedMotion ? 0 : delay,
    ease,
  }
}

function archiveInitial(
  reducedMotion: boolean,
  options: { blur?: number; x?: number; y?: number } = {}
) {
  if (reducedMotion) {
    return { opacity: 1, x: 0, y: 0, filter: "blur(0px)" }
  }

  return {
    opacity: 0,
    x: options.x ?? 0,
    y: options.y ?? 14,
    filter: `blur(${options.blur ?? 10}px)`,
  }
}

const archiveVisible = {
  opacity: 1,
  x: 0,
  y: 0,
  filter: "blur(0px)",
}

function ActivityArtwork({
  posterUrl,
  title,
  variant,
}: {
  posterUrl?: string
  title: string
  variant: "cover" | "poster"
}) {
  const initials = title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")

  return (
    <div
      aria-label={title}
      className={`relative shrink-0 overflow-hidden border border-border/70 shadow-sm ${
        variant === "poster"
          ? "aspect-[2/3] w-10 sm:w-11"
          : "size-12 sm:size-13"
      }`}
    >
      {posterUrl ? (
        <Image
          src={posterUrl}
          alt={`${title} poster`}
          fill
          className="object-cover"
          sizes="44px"
          unoptimized
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgb(255_255_255/0.34),transparent_42%),radial-gradient(circle_at_70%_80%,rgb(0_0_0/0.38),transparent_38%)]" />
          <span className="absolute right-1 bottom-1 font-serif text-[10px] font-semibold text-white/85">
            {initials}
          </span>
        </>
      )}
    </div>
  )
}

function PinnedArtwork({
  posterUrl,
  title,
  variant,
}: {
  posterUrl?: string
  title: string
  variant: "cover" | "poster"
}) {
  const initials = title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")

  return (
    <div
      aria-label={title}
      className={`relative overflow-hidden border border-border/70 shadow-sm ${
        variant === "poster" ? "aspect-[2/3]" : "aspect-square"
      }`}
    >
      {posterUrl ? (
        <Image
          src={posterUrl}
          alt={`${title} poster`}
          fill
          className="object-cover"
          sizes="(min-width: 640px) 135px, 50vw"
          unoptimized
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgb(255_255_255/0.34),transparent_42%),radial-gradient(circle_at_70%_80%,rgb(0_0_0/0.38),transparent_38%)]" />
          <span className="absolute right-1.5 bottom-1.5 font-serif text-xs font-semibold text-white/85">
            {initials}
          </span>
        </>
      )}
    </div>
  )
}

function PinnedActivityGrid({
  albums,
  isMusic,
  reducedMotion,
}: {
  albums: MusicAlbum[]
  isMusic: boolean
  reducedMotion: boolean
}) {
  if (isMusic) {
    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
        {albums.map((item, index) => (
          <motion.div
            key={item.title}
            className="min-w-0"
            initial={archiveInitial(reducedMotion, { blur: 8, y: 8 })}
            animate={archiveVisible}
            transition={archiveTransition(0.1 + index * 0.07, reducedMotion)}
          >
            <PinnedArtwork
              posterUrl={item.artworkUrl}
              title={item.title}
              variant="cover"
            />
            <div className="mt-2 min-w-0">
              <h3 className="truncate text-sm font-medium text-foreground">
                {item.title}
              </h3>
              <p className="flex min-w-0 items-center text-xs text-muted-foreground">
                <span className="truncate">{item.artist}</span>
                <Dot className="size-3 shrink-0" aria-hidden="true" />
                <span className="shrink-0 tabular-nums">
                  {formatMinutes(item.minutes)}
                </span>
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
      {pinnedMovieActivity.map((item, index) => (
        <motion.a
          key={item.title}
          href={item.link}
          target="_blank"
          rel="noreferrer"
          className="group min-w-0"
          initial={archiveInitial(reducedMotion, { blur: 8, y: 8 })}
          animate={archiveVisible}
          transition={archiveTransition(0.1 + index * 0.07, reducedMotion)}
        >
          <PinnedArtwork
            posterUrl={item.posterUrl}
            title={item.title}
            variant="poster"
          />
          <div className="mt-2 min-w-0">
            <h3 className="truncate text-sm font-medium text-foreground underline decoration-transparent decoration-1 underline-offset-3 transition-colors group-hover:decoration-muted-foreground/40">
              {item.title}
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {item.director ?? item.releaseDate}
            </p>
          </div>
        </motion.a>
      ))}
    </div>
  )
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const fill = Math.max(0, Math.min(1, rating - index)) * 100

        return (
          <span key={index} className="relative size-3.5">
            <Star className="size-3.5 fill-current text-muted-foreground/20" />
            <span
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${fill}%` }}
            >
              <Star className="size-3.5 fill-current text-primary" />
            </span>
          </span>
        )
      })}
    </div>
  )
}

function MovieActivityList({
  movies,
  reducedMotion,
}: {
  movies: LetterboxdMovie[]
  reducedMotion: boolean
}) {
  return (
    <ul className="flex flex-col border-y border-border/70">
      {movies.map((movie, index) => (
        <motion.li
          key={movie.title}
          className="group relative"
          initial={archiveInitial(reducedMotion, { blur: 4, y: 8 })}
          animate={archiveVisible}
          transition={archiveTransition(0.54 + index * 0.045, reducedMotion)}
        >
          {index < movies.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute right-0 bottom-0 left-[2.1rem] h-px bg-border/70 sm:left-[2.4rem]"
            />
          ) : null}
          <a
            href={movie.link}
            target="_blank"
            rel="noreferrer"
            className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-2 sm:grid-cols-[1.9rem_minmax(0,1fr)] sm:gap-2.5"
          >
            <span className="py-2.5 text-sm font-medium text-muted-foreground/55 tabular-nums sm:py-3">
              {movie.date}
            </span>
            <div className="grid min-h-18 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5 sm:min-h-20 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:gap-4 sm:py-3">
              <ActivityArtwork
                posterUrl={movie.posterUrl}
                title={movie.title}
                variant="poster"
              />
              <div className="min-w-0">
                <h3 className="truncate font-medium text-foreground underline decoration-transparent decoration-1 underline-offset-3 transition-colors group-hover:decoration-muted-foreground/40">
                  {movie.title}
                </h3>
                <span className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                  <p>
                    {movie.director ?? movie.review ?? "Watched on Letterboxd"},
                  </p>
                  {movie.releaseDate}
                </span>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-3">
                {movie.rating !== undefined ? (
                  <RatingStars rating={movie.rating} />
                ) : null}
                <Heart
                  className={`size-4 ${
                    movie.liked
                      ? "fill-current text-primary"
                      : "fill-current text-muted-foreground/25"
                  }`}
                  aria-label={movie.liked ? "Liked" : "Not liked"}
                />
              </div>
            </div>
          </a>
        </motion.li>
      ))}
    </ul>
  )
}

function formatStreams(streams: number) {
  return `${streams} ${streams === 1 ? "stream" : "streams"}`
}

function formatMinutes(minutes: number) {
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`
}

function MusicActivityList({
  reducedMotion,
  songs,
}: {
  reducedMotion: boolean
  songs: MusicSong[]
}) {
  return (
    <ul className="flex flex-col border-y border-border/70">
      {songs.map((song, index) => (
        <motion.li
          key={song.title}
          className="relative grid grid-cols-[1.6rem_minmax(0,1fr)] gap-2 transition-colors hover:bg-muted/20 sm:grid-cols-[1.9rem_minmax(0,1fr)] sm:gap-2.5"
          initial={archiveInitial(reducedMotion, { blur: 4, y: 8 })}
          animate={archiveVisible}
          transition={archiveTransition(0.54 + index * 0.045, reducedMotion)}
        >
          {index < songs.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute right-0 bottom-0 left-[2.1rem] h-px bg-border/70 sm:left-[2.4rem]"
            />
          ) : null}
          <span className="py-2.5 text-sm font-medium text-muted-foreground/55 tabular-nums sm:py-3">
            {song.rank}
          </span>
          <div className="grid min-h-18 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5 sm:min-h-20 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:gap-4 sm:py-3">
            <ActivityArtwork
              posterUrl={song.artworkUrl}
              title={song.title}
              variant="cover"
            />
            <div className="min-w-0">
              <h3 className="truncate font-medium text-foreground">
                {song.title}
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                {song.artist}
              </p>
            </div>
            <p className="ml-auto shrink-0 text-right text-sm text-muted-foreground tabular-nums">
              {formatStreams(song.streams)}
            </p>
          </div>
        </motion.li>
      ))}
    </ul>
  )
}

function HomePagePositionAnchor() {
  return (
    <div className="relative flex flex-col gap-4">
      <div className="relative h-24 w-24 overflow-hidden sm:h-26 sm:w-26 lg:absolute lg:top-1 lg:right-[calc(100%+1.5rem)]" />
      <div className="flex flex-col gap-2 leading-relaxed">
        <h1 className="flex items-center gap-1.5">
          <span className="font-medium">
            <span className="text-muted-foreground">Ciao, I&apos;m </span>
            <span>Paolo</span>
          </span>
        </h1>
        <p className="text-muted-foreground">
          I&apos;m a 19 y/o{" "}
          <span className="text-foreground"> software developer </span> and{" "}
          <span className="text-foreground"> bachelor student </span>. I care
          deeply about craft, detail, and the{" "}
          <span className="bg-[linear-gradient(180deg,oklch(0.7012_0.0685_231.14),oklch(0.4303_0.1342_260.26))] bg-clip-text pr-1 font-caveat text-sm text-xl leading-0 font-bold whitespace-nowrap text-transparent">
            {" "}
            little things
          </span>{" "}
          that make a{" "}
          <span className="font-serif text-sm leading-0 text-foreground">
            {" "}
            difference
          </span>{" "}
          {"\u2013"} I like to make people feel something through my work.
        </p>
        <p className="items-center text-muted-foreground">
          Currently, I&apos;m working at{" "}
          <span className="inline font-medium whitespace-nowrap text-primary">
            <span className="mx-1 inline-block h-[1em] w-[1.45em] -translate-y-px align-middle" />
            BarCloud
          </span>{" "}
          and managing{" "}
          <span className="inline font-medium whitespace-nowrap text-primary">
            <span className="mx-1 mb-1 inline-block h-[0.9em] w-[0.9em] align-middle" />
            BAINSA
          </span>
          . <br /> Recently, I&apos;ve also been studying{" "}
          <span className="font-medium text-primary">Stanford CS 224N</span>,
          listening to{" "}
          <span className="font-medium text-primary">Graduation</span>, and
          watching <span className="font-medium text-primary">Obsession</span>.
        </p>
      </div>
      <p className="items-center text-muted-foreground">
        You can reach me on{" "}
        <span className="inline font-medium whitespace-nowrap text-primary">
          <span className="mr-1 mb-1 inline-block h-[1em] w-[1em] align-middle" />
          LinkedIn
        </span>{" "}
        or via{" "}
        <span className="inline font-medium whitespace-nowrap text-primary">
          <span className="mr-1 mb-0.5 inline-block size-4 align-middle" />
          email
        </span>
        .
      </p>
      <div className="flex flex-col gap-4 leading-relaxed">
        <div className="w-fit text-sm font-medium text-muted-foreground/60">
          Read more
        </div>
        <div className="flex flex-col gap-2 overflow-hidden">
          <p className="items-center text-muted-foreground">
            <span>I&apos;m currently in Los Angeles, interning at </span>
            <span className="inline font-medium whitespace-nowrap text-primary">
              BarCloud
            </span>{" "}
            <span>
              as a Software Engineer, where I&apos;m building frontier AI
              systems that automate complex workflows. Before that, I interned
              at{" "}
            </span>
            <span className="inline font-medium whitespace-nowrap text-primary">
              DataPizza
            </span>{" "}
            <span>as a Frontend Software Engineer, where I worked on </span>
            <span className="inline font-medium whitespace-nowrap text-primary">
              DualOS
            </span>
            <span>
              , an enterprise platform for AI workflows and automations.
            </span>
          </p>
          <div className="items-center text-muted-foreground">
            <span>I&apos;m also vice president of </span>
            <span className="inline font-medium whitespace-nowrap text-primary">
              BAINSA
            </span>
            <span>
              , the largest Italian and one of the largest European student
              associations focused on AI and neuroscience.
            </span>
          </div>
          <p className="items-center text-muted-foreground">
            <span>Here you can checkout my </span>
            <span className="inline font-medium whitespace-nowrap text-primary">
              projects
            </span>
            <span>.</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export function ActivityArchivePage({
  monthLabel,
  movies = fallbackMovieActivity,
  musicRecap = fallbackMusicRecap,
  title,
  viewAllHref,
}: ActivityArchivePageProps) {
  const isMusic = title === "Music"
  const movieItems = movies.length > 0 ? movies : fallbackMovieActivity
  const albumItems = musicRecap.albums.slice(0, 4)
  const songItems = musicRecap.songs.slice(0, 5)
  const reducedMotion = useReducedMotion() ?? false
  const listLength = isMusic ? songItems.length : movieItems.length
  const isExternalViewAll = viewAllHref?.startsWith("http")
  const footerLinkClassName =
    "w-fit text-sm font-medium text-muted-foreground underline decoration-muted-foreground/35 decoration-1 underline-offset-3 transition-colors hover:text-foreground hover:decoration-foreground/50"
  const footerTransition = archiveTransition(
    0.56 + listLength * 0.045,
    reducedMotion
  )

  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col items-center [justify-content:safe_center] py-10 sm:py-14 md:py-16">
        <section className="w-full px-6 sm:px-10 md:px-16 lg:px-20">
          <div className="mx-auto max-w-xl text-base">
            <div className="relative overflow-visible">
              <div
                aria-hidden="true"
                className="pointer-events-none invisible select-none"
              >
                <HomePagePositionAnchor />
              </div>
              <div className="absolute inset-x-0 top-0 flex flex-col gap-8 pb-16">
                <div className="flex flex-col gap-3">
                  <motion.h1
                    className="text-xl font-medium text-foreground"
                    initial={archiveInitial(reducedMotion)}
                    animate={archiveVisible}
                    transition={archiveTransition(0, reducedMotion)}
                  >
                    {title}
                  </motion.h1>
                  <PinnedActivityGrid
                    albums={albumItems}
                    isMusic={isMusic}
                    reducedMotion={reducedMotion}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <motion.div
                    className="flex items-baseline justify-between gap-4"
                    initial={archiveInitial(reducedMotion)}
                    animate={archiveVisible}
                    transition={archiveTransition(0.43, reducedMotion)}
                  >
                    <h2 className="font-medium text-foreground">
                      Recent Activity
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {monthLabel}
                    </p>
                  </motion.div>
                  <div className="flex flex-col gap-3">
                    {isMusic ? (
                      <MusicActivityList
                        reducedMotion={reducedMotion}
                        songs={songItems}
                      />
                    ) : (
                      <MovieActivityList
                        movies={movieItems}
                        reducedMotion={reducedMotion}
                      />
                    )}
                    <motion.div
                      className="flex items-center justify-between gap-4"
                      initial={archiveInitial(reducedMotion, {
                        blur: 4,
                        y: 8,
                      })}
                      animate={archiveVisible}
                      transition={footerTransition}
                    >
                      <button
                        type="button"
                        className={`${footerLinkClassName} cursor-pointer`}
                        onClick={() => window.history.back()}
                      >
                        Back
                      </button>
                      {viewAllHref && isExternalViewAll ? (
                        <a
                          href={viewAllHref}
                          target="_blank"
                          rel="noreferrer"
                          className={footerLinkClassName}
                        >
                          View all
                        </a>
                      ) : null}
                      {viewAllHref && !isExternalViewAll ? (
                        <Link
                          href={viewAllHref}
                          className={footerLinkClassName}
                        >
                          View all
                        </Link>
                      ) : null}
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
