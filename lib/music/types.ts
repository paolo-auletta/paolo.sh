export type MusicAlbum = {
  artist: string
  artworkUrl?: string
  minutes: number
  rank: string
  title: string
}

export type MusicSong = {
  albumTitle?: string
  artist: string
  artworkUrl?: string
  rank: string
  streams: number
  title: string
}

export type MusicRecap = {
  albums: MusicAlbum[]
  monthLabel: string
  songs: MusicSong[]
}

export type MusicArchiveMonth = {
  label: string
  slug: string
}

export type MusicArchiveYear = {
  months: MusicArchiveMonth[]
  year: string
}

/** A month as entered in recaps.ts: no ranks (they follow the order). */
export type RawMusicAlbum = Omit<MusicAlbum, "rank">
export type RawMusicSong = Omit<MusicSong, "rank">
export type RawMusicRecap = {
  albums: RawMusicAlbum[]
  monthLabel: string
  songs: RawMusicSong[]
}
