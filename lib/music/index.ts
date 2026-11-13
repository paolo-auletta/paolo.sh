import { latestMusicRecap } from "./archive"
import { getMusicArtwork } from "./artwork"
import {
  type MusicRecap,
  type RawMusicAlbum,
  type RawMusicRecap,
  type RawMusicSong,
} from "./types"

export {
  latestMusicRecap,
  musicArchiveNavigation,
  resolveMusicArchive,
} from "./archive"
export { FALLBACK_ALBUM_TITLE } from "./fallback"
export type {
  MusicAlbum,
  MusicArchiveMonth,
  MusicArchiveYear,
  MusicRecap,
  MusicSong,
  RawMusicRecap,
} from "./types"

/** Ranks the items in order and fills in any artwork they don't set. */
function hydrateItems<T extends RawMusicAlbum | RawMusicSong>(
  items: T[],
  findArtwork: (item: T) => Promise<string | undefined>
) {
  return Promise.all(
    items.map(async (item, index) => ({
      ...item,
      artworkUrl: item.artworkUrl ?? (await findArtwork(item)),
      rank: String(index + 1),
    }))
  )
}

export async function hydrateMusicRecap(
  recap: RawMusicRecap
): Promise<MusicRecap> {
  const [albums, songs] = await Promise.all([
    hydrateItems(recap.albums, (album) =>
      getMusicArtwork({
        artist: album.artist,
        entity: "album",
        title: album.title,
      })
    ),
    hydrateItems(recap.songs, (song) =>
      getMusicArtwork({
        albumTitle: song.albumTitle,
        artist: song.artist,
        entity: "song",
        title: song.title,
      })
    ),
  ])

  return {
    albums,
    monthLabel: recap.monthLabel,
    songs,
  }
}

export async function getLatestMusicRecap(): Promise<MusicRecap> {
  return hydrateMusicRecap(latestMusicRecap)
}
