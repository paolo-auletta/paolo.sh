import { ActivityArchivePage } from "@/components/activity-archive-page"
import { pageMetadata } from "@/lib/metadata"
import { getLatestMusicRecap, getLatestRawMusicRecap } from "@/lib/music"

export const fetchCache = "force-cache"
export const revalidate = false

export function generateMetadata() {
  const { monthLabel } = getLatestRawMusicRecap()
  return pageMetadata({
    title: "Music",
    description: `The albums and songs I played most in ${monthLabel}.`,
    path: "/music",
  })
}

export default async function MusicPage() {
  const musicRecap = await getLatestMusicRecap()

  return (
    <ActivityArchivePage
      title="Music"
      monthLabel={musicRecap.monthLabel}
      musicRecap={musicRecap}
      viewAllHref="/music/all"
    />
  )
}
