import { MusicAllArchivePage } from "@/components/music-all-archive-page"
import { pageMetadata } from "@/lib/metadata"
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

export async function generateMetadata({ searchParams }: MusicAllPageProps) {
  const { selectedMonth, selectedYear } = getArchiveSelection(
    await searchParams
  )
  const month = `${selectedMonth.label} ${selectedYear.year}`
  return pageMetadata({
    title: `Music, ${month}`,
    description: `The albums and songs I played most in ${month}, and every month before it.`,
    path: `/music/all?year=${selectedYear.year}&month=${selectedMonth.slug}`,
  })
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
