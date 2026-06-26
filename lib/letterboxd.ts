export type LetterboxdMovie = {
  date: string
  director?: string
  liked: boolean
  link: string
  posterUrl?: string
  rating?: number
  releaseDate: string
  review?: string
  title: string
  tmdbId?: string
  watchedDate: string
}

const LETTERBOXD_RSS_URL = "https://letterboxd.com/paoloauletta/rss/"
export const LETTERBOXD_PROFILE_URL = "https://letterboxd.com/paoloauletta/"

const ONE_HOUR = 60 * 60

function decodeHtml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function getTagValue(xml: string, tagName: string) {
  const match = xml.match(
    new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`),
  )

  return match ? decodeHtml(match[1].trim()) : undefined
}

function getPosterUrl(description?: string) {
  return description?.match(/<img[^>]+src="([^"]+)"/)?.[1]
}

function getReview(description?: string) {
  if (!description) {
    return undefined
  }

  const paragraphs = Array.from(description.matchAll(/<p>([\s\S]*?)<\/p>/g))
    .map((match) =>
      decodeHtml(match[1])
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)

  return paragraphs.find((paragraph) => !paragraph.startsWith("Watched on "))
}

function getFilmPageUrl(entryLink: string) {
  const slug = entryLink.match(/\/film\/([^/]+)\//)?.[1]

  return slug ? `https://letterboxd.com/film/${slug}/` : undefined
}

function getDirectorFromHtml(html: string) {
  const twitterDirector = html.match(
    /<meta name="twitter:label1" content="Directed by"><meta name="twitter:data1" content="([^"]+)">/,
  )?.[1]

  if (twitterDirector) {
    return decodeHtml(twitterDirector)
  }

  return html.match(/<span class="introduction">Directed by <\/span>[\s\S]*?<a[^>]*>([^<]+)<\/a>/)?.[1]
}

async function getDirectorForMovie(entryLink: string) {
  const filmPageUrl = getFilmPageUrl(entryLink)

  if (!filmPageUrl) {
    return undefined
  }

  try {
    const response = await fetch(filmPageUrl, {
      next: { revalidate: ONE_HOUR },
    })

    if (!response.ok) {
      return undefined
    }

    return getDirectorFromHtml(await response.text())
  } catch {
    return undefined
  }
}

function parseMovieItem(itemXml: string): LetterboxdMovie | undefined {
  const title = getTagValue(itemXml, "letterboxd:filmTitle")
  const watchedDate = getTagValue(itemXml, "letterboxd:watchedDate")

  if (!title || !watchedDate) {
    return undefined
  }

  const link = getTagValue(itemXml, "link")
  const description = getTagValue(itemXml, "description")
  const rating = getTagValue(itemXml, "letterboxd:memberRating")

  return {
    date: watchedDate.slice(-2),
    liked: getTagValue(itemXml, "letterboxd:memberLike") === "Yes",
    link: link ?? LETTERBOXD_PROFILE_URL,
    posterUrl: getPosterUrl(description),
    rating: rating ? Number(rating) : undefined,
    releaseDate: getTagValue(itemXml, "letterboxd:filmYear") ?? "",
    review: getReview(description),
    title,
    tmdbId: getTagValue(itemXml, "tmdb:movieId"),
    watchedDate,
  }
}

async function getLetterboxdMovies() {
  let response: Response

  try {
    response = await fetch(LETTERBOXD_RSS_URL, {
      next: { revalidate: ONE_HOUR },
    })
  } catch {
    return []
  }

  if (!response.ok) {
    return []
  }

  const xml = await response.text()

  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g))
    .map((match) => parseMovieItem(match[1]))
    .filter((movie): movie is LetterboxdMovie => Boolean(movie))
}

export async function getRecentLetterboxdMovies(limit = 5) {
  const movies = (await getLetterboxdMovies()).slice(0, limit)
  const directors = await Promise.all(
    movies.map((movie) => getDirectorForMovie(movie.link)),
  )

  return movies.map((movie, index) => ({
    ...movie,
    director: directors[index],
  }))
}

export async function getLatestLikedRatedLetterboxdMovie() {
  const movies = await getLetterboxdMovies()

  return movies.find((movie) => movie.liked && movie.rating !== undefined)
}
