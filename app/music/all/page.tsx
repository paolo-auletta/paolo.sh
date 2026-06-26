import { MusicAllArchivePage } from "@/components/music-all-archive-page"
import {
  getMusicRecap,
  musicArchiveNavigation,
  type MusicArchiveMonth,
  type MusicArchiveYear,
} from "@/lib/music"

export const fetchCache = "force-cache"
export const revalidate = false

type MusicAllPageProps = {
  searchParams: Promise<{
    month?: string
    year?: string
  }>
}

function getArchiveSelection({
  month,
  year,
}: {
  month?: string
  year?: string
}): {
  selectedMonth: MusicArchiveMonth
  selectedYear: MusicArchiveYear
} {
  const fallbackYear = musicArchiveNavigation[0]
  const selectedYear =
    musicArchiveNavigation.find((entry) => entry.year === year) ?? fallbackYear
  const selectedMonth =
    selectedYear.months.find((entry) => entry.slug === month) ??
    selectedYear.months[0]

  return {
    selectedMonth,
    selectedYear,
  }
}

export default async function MusicAllPage({
  searchParams,
}: MusicAllPageProps) {
  const params = await searchParams
  const { selectedMonth, selectedYear } = getArchiveSelection(params)
  const musicRecap = await getMusicRecap({
    month: selectedMonth.slug,
    year: selectedYear.year,
  })

  return (
    <MusicAllArchivePage
      musicRecap={musicRecap}
      navigation={musicArchiveNavigation}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
    />
  )
}
