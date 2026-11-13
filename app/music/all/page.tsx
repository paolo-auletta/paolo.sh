import { MusicAllArchivePage } from "@/components/music-all-archive-page"
import { pageMetadata } from "@/lib/metadata"
import {
  hydrateMusicRecap,
  musicArchiveNavigation,
  resolveMusicArchive,
} from "@/lib/music"

export const fetchCache = "force-cache"
export const revalidate = false

type MusicAllPageProps = {
  searchParams: Promise<{
    month?: string
    year?: string
  }>
}

export async function generateMetadata({ searchParams }: MusicAllPageProps) {
  const { selectedMonth, selectedYear } = resolveMusicArchive(
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
  const { recap, selectedMonth, selectedYear } = resolveMusicArchive(
    await searchParams
  )
  const musicRecap = await hydrateMusicRecap(recap)

  return (
    <MusicAllArchivePage
      musicRecap={musicRecap}
      navigation={musicArchiveNavigation}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
    />
  )
}
