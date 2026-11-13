import { type LetterboxdMovie } from "@/lib/letterboxd"

/** A favourite film, pinned above the diary on /movies. */
export type PinnedFilm = {
  director: string
  link: string
  posterUrl: string
  title: string
}

export const pinnedFilms: PinnedFilm[] = [
  {
    director: "Federico Fellini",
    link: "https://letterboxd.com/film/8-half/",
    posterUrl: "/movies/8-half.jpg",
    title: "8½",
  },
  {
    director: "Hideaki Anno, Kazuya Tsurumaki",
    link: "https://letterboxd.com/film/neon-genesis-evangelion-the-end-of-evangelion/",
    posterUrl:
      "https://a.ltrbxd.com/resized/film-poster/4/0/3/1/1/40311-neon-genesis-evangelion-the-end-of-evangelion-0-600-0-900-crop.jpg?v=cecd0c42",
    title: "Neon Genesis Evangelion",
  },
  {
    director: "Woody Allen",
    link: "https://letterboxd.com/film/crimes-and-misdemeanors/",
    posterUrl:
      "https://a.ltrbxd.com/resized/film-poster/4/5/1/8/6/45186-crimes-and-misdemeanors-0-600-0-900-crop.jpg?v=c65bc92f",
    title: "Crimes and Misdemeanors",
  },
  {
    director: "Hayao Miyazaki",
    link: "https://letterboxd.com/paoloauletta/film/the-wind-rises/",
    posterUrl:
      "https://a.ltrbxd.com/resized/film-poster/1/1/2/9/5/7/112957-the-wind-rises-0-600-0-900-crop.jpg?v=42f2af65",
    title: "The Wind Rises",
  },
]

/**
 * Shown on /movies when the Letterboxd diary can't be read: a month of
 * real entries, so the page never stands empty.
 */
export const fallbackMovieActivity: LetterboxdMovie[] = [
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
