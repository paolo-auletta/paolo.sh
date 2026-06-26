import { ActivityArchivePage } from "@/components/activity-archive-page"
import { getLatestMusicRecap } from "@/lib/music"

export const revalidate = 3600

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
