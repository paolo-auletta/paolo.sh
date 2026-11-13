import { ActivityArchivePage } from "@/components/activity-archive-page"
import { getCurrentMonthLabel } from "@/lib/date"
import {
  getRecentLetterboxdMovies,
  LETTERBOXD_PROFILE_URL,
} from "@/lib/letterboxd"
import { pageMetadata } from "@/lib/metadata"

export const metadata = pageMetadata({
  title: "Movies",
  description: "The films I have been watching lately, from my Letterboxd diary.",
  path: "/movies",
})

export const revalidate = 3600

export default async function MoviesPage() {
  const movies = await getRecentLetterboxdMovies(5)

  return (
    <ActivityArchivePage
      title="Movies"
      monthLabel={getCurrentMonthLabel()}
      movies={movies}
      viewAllHref={LETTERBOXD_PROFILE_URL}
    />
  )
}
