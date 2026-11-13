import { Dot } from "lucide-react"

import { formatMinutes, formatStreams } from "@/lib/format"
import { type MusicAlbum, type MusicSong } from "@/lib/music/types"

/** An album's title, artist and minutes, under its cover. */
export function AlbumCaption({
  album,
  paper,
}: {
  album: MusicAlbum
  /** The caption's data-paper part, for the Paper entrance. */
  paper?: string
}) {
  return (
    <div data-paper={paper} className="mt-2 min-w-0">
      <h3 className="truncate text-sm font-medium text-foreground">
        {album.title}
      </h3>
      <p className="flex min-w-0 items-center text-xs text-muted-foreground">
        <span className="truncate">{album.artist}</span>
        <Dot className="size-3 shrink-0" aria-hidden="true" />
        <span className="shrink-0 tabular-nums">
          {formatMinutes(album.minutes)}
        </span>
      </p>
    </div>
  )
}

/** A song row's title and artist, then its streams on the right. */
export function SongSummary({ song }: { song: MusicSong }) {
  return (
    <>
      <div className="min-w-0">
        <h3 className="truncate font-medium text-foreground">{song.title}</h3>
        <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
      </div>
      <p className="ml-auto shrink-0 text-right text-sm text-muted-foreground tabular-nums">
        {formatStreams(song.streams)}
      </p>
    </>
  )
}
