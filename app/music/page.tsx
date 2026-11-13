import { ActivityArchivePage } from "@/components/activity-archive-page"
import {
  PinnedAlbumCards,
  SongActivityRows,
} from "@/components/music/music-activity"
import { pageMetadata } from "@/lib/metadata"
import { getLatestMusicRecap, latestMusicRecap } from "@/lib/music"

export const fetchCache = "force-cache"
export const revalidate = false

export function generateMetadata() {
  const { monthLabel } = latestMusicRecap
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
      pinned={<PinnedAlbumCards albums={musicRecap.albums.slice(0, 4)} />}
      rows={<SongActivityRows songs={musicRecap.songs.slice(0, 5)} />}
      viewAllHref="/music/all"
    />
  )
}
