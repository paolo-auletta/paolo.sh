export type MusicAlbum = {
  artist: string
  artworkUrl?: string
  minutes: number
  rank: string
  title: string
}

export type MusicSong = {
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

type RawMusicAlbum = Omit<MusicAlbum, "rank">
type RawMusicSong = Omit<MusicSong, "rank">

const ONE_DAY = 24 * 60 * 60

const monthlyMusicRecaps: Array<{
  albums: RawMusicAlbum[]
  monthLabel: string
  songs: RawMusicSong[]
}> = [
  {
    monthLabel: "June 2026",
    albums: [
      {
        title: "Graduation",
        artist: "Kanye West",
        minutes: 43,
      },
      {
        title: "ICEMAN",
        artist: "Drake",
        minutes: 41,
      },
      {
        title: "People of the Moon",
        artist: "Nu Genea",
        minutes: 23,
      },
      {
        title: "Too Low For Zero (Bonus Track Version)",
        artist: "Elton John",
        minutes: 18,
      },
      {
        title: "Wounded Rhymes",
        artist: "Lykke Li",
        minutes: 14,
      },
      {
        title: "Honestly, Nevermind",
        artist: "Drake",
        minutes: 12,
      },
      {
        title: "Epic Motivational - EP",
        artist: "PraskMusic",
        minutes: 12,
      },
      {
        title: "I Follow Rivers (The Magician Remix)",
        artist: "Lykke Li",
        minutes: 10,
      },
      {
        title: "Superunknown (Super Deluxe Edition)",
        artist: "Soundgarden",
        minutes: 8,
      },
      {
        title: "Is This It",
        artist: "The Strokes",
        minutes: 6,
      },
      {
        title: "Coloring Book",
        artist: "Chance the Rapper",
        minutes: 6,
      },
      {
        title: "Ascension, Vol. 2",
        artist: "PraskMusic",
        minutes: 5,
      },
      {
        title: "CASIOPEA",
        artist: "Casiopea",
        minutes: 5,
      },
      {
        title: "Operation: Doomsday",
        artist: "MF DOOM",
        minutes: 4,
      },
      {
        title: "Blues Beatles",
        artist: "Blues Beatles",
        minutes: 3,
      },
    ],
    songs: [
      {
        title: "I Follow Rivers (The Magician Remix)",
        artist: "Lykke Li",
        streams: 10,
      },
      {
        title: "Devil In a New Dress (feat. Rick Ross)",
        artist: "Kanye West",
        streams: 6,
      },
      {
        title: "Big Brother",
        artist: "Kanye West",
        streams: 6,
      },
      {
        title:
          "The Long One: You Never Give Me Your Money / Sun King / Mean Mr. Mustard / Polythene Pam / She Came In Through the Bathroom Window / Golden Slumbers / Carry That Weight / The End",
        artist: "The Beatles",
        streams: 5,
      },
      {
        title: "White Dress",
        artist: "Kanye West",
        streams: 5,
      },
      {
        title: "Sunny",
        artist: "Bobby Hebb",
        streams: 5,
      },
      {
        title: "Maria Maria (feat. The Product G&B) [Radio Mix]",
        artist: "Santana",
        streams: 4,
      },
      {
        title: "Flashing Lights (feat. Dwele)",
        artist: "Kanye West",
        streams: 4,
      },
      {
        title: "Your Mother Should Know",
        artist: "The Beatles",
        streams: 4,
      },
      {
        title: "Saint Pablo",
        artist: "Kanye West",
        streams: 3,
      },
      {
        title: "Wah-Wah (2014 Remaster)",
        artist: "George Harrison",
        streams: 3,
      },
      {
        title: "Space Road",
        artist: "Casiopea",
        streams: 3,
      },
      {
        title: "Doomsday (feat. Pebbles the Invisible Girl)",
        artist: "MF DOOM",
        streams: 3,
      },
      {
        title: "Still Dreaming (feat. Kanye West & Chrisette Michele)",
        artist: "Nas",
        streams: 3,
      },
      {
        title: "Wah-Wah (2020 Mix)",
        artist: "George Harrison",
        streams: 3,
      },
    ],
  },
]

function getLargeArtworkUrl(artworkUrl?: string) {
  return artworkUrl?.replace(/100x100bb\.(jpg|png)$/, "600x600bb.$1")
}

async function getItunesArtwork({
  artist,
  entity,
  title,
}: {
  artist: string
  entity: "album" | "song"
  title: string
}) {
  const params = new URLSearchParams({
    entity,
    limit: "1",
    media: "music",
    term: `${title} ${artist}`,
  })

  try {
    const response = await fetch(`https://itunes.apple.com/search?${params}`, {
      next: { revalidate: ONE_DAY },
    })

    if (!response.ok) {
      return undefined
    }

    const data = (await response.json()) as {
      results?: Array<{ artworkUrl100?: string }>
    }

    return getLargeArtworkUrl(data.results?.[0]?.artworkUrl100)
  } catch {
    return undefined
  }
}

export function getLatestRawMusicRecap() {
  return monthlyMusicRecaps[0]
}

export async function getLatestMusicRecap(): Promise<MusicRecap> {
  const recap = getLatestRawMusicRecap()
  const [albums, songs] = await Promise.all([
    Promise.all(
      recap.albums.map(async (album, index) => ({
        ...album,
        artworkUrl:
          album.artworkUrl ??
          (await getItunesArtwork({
            artist: album.artist,
            entity: "album",
            title: album.title,
          })),
        rank: String(index + 1),
      })),
    ),
    Promise.all(
      recap.songs.map(async (song, index) => ({
        ...song,
        artworkUrl:
          song.artworkUrl ??
          (await getItunesArtwork({
            artist: song.artist,
            entity: "song",
            title: song.title,
          })),
        rank: String(index + 1),
      })),
    ),
  ])

  return {
    albums,
    monthLabel: recap.monthLabel,
    songs,
  }
}
