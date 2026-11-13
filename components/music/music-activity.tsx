import { ActivityRowDivider } from "@/components/activity-archive-page"
import { Artwork } from "@/components/artwork"
import { AlbumCaption, SongSummary } from "@/components/music/recap-items"
import { type MusicAlbum, type MusicSong } from "@/lib/music/types"

/**
 * The month's top albums, pinned on /music. The first is the album the
 * homepage names: its cover is where the homepage's preview is carried to
 * (components/motion/carried-cover.ts).
 */
export function PinnedAlbumCards({ albums }: { albums: MusicAlbum[] }) {
  return albums.map((album, index) => (
    <div key={album.title} data-paper="card" className="min-w-0">
      <Artwork
        alt={`${album.title} poster`}
        className="relative aspect-square overflow-hidden border border-border/70 shadow-sm"
        imageClassName="object-cover"
        initialsClassName="absolute right-1.5 bottom-1.5 font-serif text-xs font-semibold text-muted-foreground/70"
        paper={index === 0 ? "cover landing" : "cover"}
        sizes="(min-width: 640px) 135px, 50vw"
        src={album.artworkUrl}
        title={album.title}
      />
      <AlbumCaption album={album} paper="caption" />
    </div>
  ))
}

/** The month's top songs, as the rows of /music's activity list. */
export function SongActivityRows({ songs }: { songs: MusicSong[] }) {
  return songs.map((song, index) => (
    <li
      key={song.title}
      data-paper="row"
      className="relative grid grid-cols-[1.6rem_minmax(0,1fr)] gap-2 transition-colors hover:bg-muted/20 sm:grid-cols-[1.9rem_minmax(0,1fr)] sm:gap-2.5"
    >
      {index < songs.length - 1 ? <ActivityRowDivider /> : null}
      <span className="py-2.5 text-sm font-medium text-muted-foreground/55 tabular-nums sm:py-3">
        {song.rank}
      </span>
      <div className="grid min-h-18 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5 sm:min-h-20 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:gap-4 sm:py-3">
        {/* The "poster" alt is the list's own, kept as it has always read. */}
        <Artwork
          alt={`${song.title} poster`}
          className="relative size-12 shrink-0 overflow-hidden border border-border/70 shadow-sm sm:size-13"
          imageClassName="object-cover"
          initialsClassName="absolute right-1 bottom-1 font-serif text-[10px] font-semibold text-muted-foreground/70"
          sizes="44px"
          src={song.artworkUrl}
          title={song.title}
        />
        <SongSummary song={song} />
      </div>
    </li>
  ))
}
