import { Heart, Star } from "lucide-react"

import { ActivityRowDivider } from "@/components/activity-archive-page"
import { Artwork } from "@/components/artwork"
import { type LetterboxdMovie } from "@/lib/letterboxd"
import { type PinnedFilm } from "@/lib/movies"

/** The favourite films, pinned on /movies. */
export function PinnedFilmCards({ films }: { films: PinnedFilm[] }) {
  return films.map((film) => (
    <a
      key={film.title}
      href={film.link}
      target="_blank"
      rel="noreferrer"
      data-paper="card"
      className="group min-w-0"
    >
      <Artwork
        alt={`${film.title} poster`}
        className="relative aspect-[2/3] overflow-hidden border border-border/70 shadow-sm"
        imageClassName="object-cover"
        initialsClassName="absolute right-1.5 bottom-1.5 font-serif text-xs font-semibold text-muted-foreground/70"
        paper="cover"
        sizes="(min-width: 640px) 135px, 50vw"
        src={film.posterUrl}
        title={film.title}
      />
      <div data-paper="caption" className="mt-2 min-w-0">
        <h3 className="truncate text-sm font-medium text-foreground underline decoration-transparent decoration-1 underline-offset-3 transition-colors group-hover:decoration-muted-foreground/40">
          {film.title}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {film.director}
        </p>
      </div>
    </a>
  ))
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

/** Diary entries, as the rows of /movies' activity list. */
export function MovieActivityRows({ movies }: { movies: LetterboxdMovie[] }) {
  return movies.map((movie, index) => (
    // A rewatch repeats the title; each diary entry has its own link.
    <li key={movie.link} data-paper="row" className="group relative">
      {index < movies.length - 1 ? <ActivityRowDivider /> : null}
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
          <Artwork
            alt={`${movie.title} poster`}
            className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden border border-border/70 shadow-sm sm:w-11"
            imageClassName="object-cover"
            initialsClassName="absolute right-1 bottom-1 font-serif text-[10px] font-semibold text-muted-foreground/70"
            sizes="44px"
            src={movie.posterUrl}
            title={movie.title}
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
    </li>
  ))
}
