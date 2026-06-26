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

type RawMusicAlbum = Omit<MusicAlbum, "rank">
type RawMusicSong = Omit<MusicSong, "rank">
type RawMusicRecap = {
  albums: RawMusicAlbum[]
  monthLabel: string
  songs: RawMusicSong[]
}

const ONE_DAY = 24 * 60 * 60

const monthOrder = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]

const monthlyMusicRecaps: RawMusicRecap[] = [
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
        // Prefer the original international cover over the US particle-track variant.
        artworkUrl:
          "https://archive.org/download/mbid-05f9032d-fda8-4ce6-99a5-fdd0fc8af8ee/mbid-05f9032d-fda8-4ce6-99a5-fdd0fc8af8ee-37537721468_thumb500.jpg",
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
        albumTitle: "I Follow Rivers (The Magician Remix)",
        artist: "Lykke Li",
        streams: 10,
      },
      {
        title: "Devil In a New Dress (feat. Rick Ross)",
        albumTitle: "My Beautiful Dark Twisted Fantasy",
        artist: "Kanye West",
        streams: 6,
      },
      {
        title: "Big Brother",
        albumTitle: "Graduation",
        artist: "Kanye West",
        streams: 6,
      },
      {
        title:
          "The Long One: You Never Give Me Your Money / Sun King / Mean Mr. Mustard / Polythene Pam / She Came In Through the Bathroom Window / Golden Slumbers / Carry That Weight / The End",
        albumTitle: "Abbey Road",
        artist: "The Beatles",
        streams: 5,
      },
      {
        title: "White Dress",
        albumTitle: "The Man With the Iron Fists",
        artist: "Kanye West",
        streams: 5,
      },
      {
        title: "Sunny",
        albumTitle: "Sunny",
        artist: "Bobby Hebb",
        streams: 5,
      },
      {
        title: "Maria Maria (feat. The Product G&B) [Radio Mix]",
        albumTitle: "Supernatural",
        artist: "Santana",
        streams: 4,
      },
      {
        title: "Flashing Lights (feat. Dwele)",
        albumTitle: "Graduation",
        artist: "Kanye West",
        streams: 4,
      },
      {
        title: "Your Mother Should Know",
        albumTitle: "Magical Mystery Tour",
        artist: "The Beatles",
        streams: 4,
      },
      {
        title: "Saint Pablo",
        albumTitle: "The Life Of Pablo",
        artist: "Kanye West",
        streams: 3,
      },
      {
        title: "Wah-Wah (2014 Remaster)",
        albumTitle: "All Things Must Pass (2014 Remaster)",
        artist: "George Harrison",
        streams: 3,
      },
      {
        title: "Space Road",
        albumTitle: "CASIOPEA",
        artist: "Casiopea",
        streams: 3,
      },
      {
        title: "Doomsday (feat. Pebbles the Invisible Girl)",
        albumTitle: "Operation: Doomsday",
        artist: "MF DOOM",
        streams: 3,
      },
      {
        title: "Still Dreaming (feat. Kanye West & Chrisette Michele)",
        albumTitle: "Hip Hop Is Dead",
        artist: "Nas",
        streams: 3,
      },
      {
        title: "Wah-Wah (2020 Mix)",
        albumTitle: "All Things Must Pass (50th Anniversary)",
        artist: "George Harrison",
        streams: 3,
      },
    ],
  },
  {
    monthLabel: "April 2026",
    albums: [
      {
        title: "BULLY",
        artist: "Kanye West",
        minutes: 50,
      },
      {
        title: "Abbey Road (Super Deluxe Edition)",
        artist: "The Beatles",
        minutes: 30,
      },
      {
        title: "CASIOPEA",
        artist: "Casiopea",
        minutes: 25,
      },
      {
        title: "Discovery",
        artist: "Daft Punk",
        minutes: 23,
      },
      {
        title: "Kid A",
        artist: "Radiohead",
        minutes: 10,
      },
      {
        title: "Rodeo",
        artist: "Travis Scott",
        minutes: 6,
      },
      {
        title: "Off the Wall",
        artist: "Michael Jackson",
        minutes: 5,
      },
      {
        title: "TONYPITONY",
        artist: "TonyPitony",
        minutes: 5,
      },
      {
        title: "The Bends",
        artist: "Radiohead",
        minutes: 3,
      },
      {
        title: "ASTROWORLD",
        artist: "Travis Scott",
        minutes: 2,
      },
      {
        title: "Globalization",
        artist: "Pitbull",
        minutes: 2,
      },
      {
        title: "On Guitar",
        artist: "高中正義",
        minutes: 2,
      },
    ],
    songs: [
      {
        title: "Space Road",
        albumTitle: "CASIOPEA",
        artist: "Casiopea",
        streams: 7,
      },
      {
        title: "ALL THE LOVE",
        albumTitle: "BULLY",
        artist: "Kanye West & Andre Troutman",
        streams: 6,
      },
      {
        title: "FATHER",
        albumTitle: "BULLY",
        artist: "Kanye West & Travis Scott",
        streams: 5,
      },
      {
        title:
          "The Long One: You Never Give Me Your Money / Sun King / Mean Mr. Mustard / Her Majesty / Polythene Pam / She Came In Through the Bathroom Window / Golden Slumbers / Carry That Weight / The End",
        albumTitle: "Abbey Road",
        artist: "The Beatles",
        streams: 4,
      },
      {
        title: "Veridis Quo",
        albumTitle: "Discovery",
        artist: "Daft Punk",
        streams: 4,
      },
      {
        title: "I Follow Rivers (The Magician Remix)",
        albumTitle: "I Follow Rivers (The Magician Remix)",
        artist: "Lykke Li",
        streams: 4,
      },
      {
        title: "Brasilian Skies",
        albumTitle: "Brasilian Skies",
        artist: "Masayoshi Takanaka",
        streams: 4,
      },
      {
        title: "Everything In Its Right Place",
        albumTitle: "Kid A",
        artist: "Radiohead",
        streams: 4,
      },
      {
        title: "Honey Pie",
        albumTitle: "The Beatles",
        artist: "The Beatles",
        streams: 4,
      },
      {
        title: "Get Back",
        albumTitle: "Let It Be",
        artist: "The Beatles",
        streams: 4,
      },
      {
        title: "I've Got a Feeling",
        albumTitle: "Let It Be",
        artist: "The Beatles",
        streams: 4,
      },
      {
        title: "Your Mother Should Know",
        albumTitle: "Magical Mystery Tour",
        artist: "The Beatles",
        streams: 4,
      },
      {
        title: "I'm So Tired",
        albumTitle: "The Beatles",
        artist: "The Beatles",
        streams: 4,
      },
      {
        title: "Sing About Me, I'm Dying of Thirst",
        albumTitle: "good kid, m.A.A.d city",
        artist: "Kendrick Lamar",
        streams: 3,
      },
      {
        title: "Weird Fishes / Arpeggi",
        albumTitle: "In Rainbows",
        artist: "Radiohead",
        streams: 3,
      },
    ],
  },
  {
    monthLabel: "March 2026",
    albums: [
      {
        title: "Undercurrent",
        artist: "Bill Evans & Jim Hall",
        minutes: 92,
      },
      {
        title: "CASIOPEA",
        artist: "Casiopea",
        minutes: 68,
      },
      {
        title: "You Must Believe In Spring",
        artist: "Bill Evans",
        minutes: 58,
      },
      {
        title: "The Tony Bennett / Bill Evans Album",
        artist: "Tony Bennett & Bill Evans",
        minutes: 51,
      },
      {
        title: "A Day in New York",
        artist: "Tony Scott & Bill Evans",
        minutes: 47,
      },
      {
        title: "BULLY",
        artist: "Kanye West",
        minutes: 45,
      },
      {
        title: "MAKE UP CITY",
        artist: "Casiopea",
        minutes: 37,
      },
      {
        title: "What's Going On",
        artist: "Marvin Gaye",
        minutes: 37,
      },
      {
        title: "CROSS POINT",
        artist: "Casiopea",
        minutes: 15,
      },
      {
        title: "Graduation",
        artist: "Kanye West",
        minutes: 10,
      },
      {
        title: "4x4 FOUR BY FOUR",
        artist: "Casiopea",
        minutes: 10,
      },
      {
        title: "Hybrid Theory (Deluxe Edition)",
        artist: "LINKIN PARK",
        minutes: 6,
      },
      {
        title: "Discovery",
        artist: "Daft Punk",
        minutes: 5,
      },
      {
        title: "Abbiamo tutti un blues da piangere",
        artist: "Perigeo",
        minutes: 4,
      },
      {
        title: "Trapt",
        artist: "Trapt",
        minutes: 3,
      },
    ],
    songs: [
      {
        title: "I Don't Owe You Anything",
        albumTitle: "Strangeways, Here We Come",
        artist: "The Smiths",
        streams: 8,
      },
      {
        title: "Still Dreaming (feat. Kanye West & Chrisette Michele)",
        albumTitle: "Hip Hop Is Dead",
        artist: "Nas",
        streams: 8,
      },
      {
        title: "Fragments of Time",
        albumTitle: "Random Access Memories",
        artist: "Daft Punk & Todd Edwards",
        streams: 7,
      },
      {
        title: "ALL THE LOVE",
        albumTitle: "BULLY",
        artist: "Kanye West & Andre Troutman",
        streams: 6,
      },
      {
        title: "I've Got a Feeling",
        albumTitle: "Let It Be",
        artist: "The Beatles",
        streams: 6,
      },
      {
        title: "Golden Slumbers (2019 Mix)",
        albumTitle: "Abbey Road (Super Deluxe Edition)",
        artist: "The Beatles",
        streams: 6,
      },
      {
        title: "She Came In Through the Bathroom Window (2019 Mix)",
        albumTitle: "Abbey Road (Super Deluxe Edition)",
        artist: "The Beatles",
        streams: 5,
      },
      {
        title: "Carry That Weight (2019 Mix)",
        albumTitle: "Abbey Road (Super Deluxe Edition)",
        artist: "The Beatles",
        streams: 5,
      },
      {
        title: "FATHER",
        albumTitle: "BULLY",
        artist: "Kanye West & Travis Scott",
        streams: 4,
      },
      {
        title: "Your Mother Should Know",
        albumTitle: "Magical Mystery Tour",
        artist: "The Beatles",
        streams: 4,
      },
      {
        title: "And Your Bird Can Sing (2022 Mix)",
        albumTitle: "Revolver (Super Deluxe)",
        artist: "The Beatles",
        streams: 4,
      },
      {
        title: "BULLY",
        albumTitle: "BULLY",
        artist: "Kanye West & CeeLo Green",
        streams: 4,
      },
      {
        title: "Touch",
        albumTitle: "Random Access Memories",
        artist: "Daft Punk & Paul Williams",
        streams: 3,
      },
      {
        title: "Stairway to the Stars",
        albumTitle: "Undercurrent",
        artist: "Bill Evans & Jim Hall",
        streams: 3,
      },
      {
        title: "Space Road",
        albumTitle: "CASIOPEA",
        artist: "Casiopea",
        streams: 3,
      },
    ],
  },
]

function getMonthFromLabel(monthLabel: string): MusicArchiveMonth & {
  monthIndex: number
  year: string
} {
  const [label, year] = monthLabel.split(" ")
  const slug = label?.toLowerCase() ?? ""
  const monthIndex = monthOrder.indexOf(slug)

  return {
    label: label ?? monthLabel,
    monthIndex,
    slug,
    year: year ?? "",
  }
}

function sortRecapsByDate(recaps: RawMusicRecap[]) {
  return [...recaps].sort((a, b) => {
    const aDate = getMonthFromLabel(a.monthLabel)
    const bDate = getMonthFromLabel(b.monthLabel)
    const yearDifference = Number(bDate.year) - Number(aDate.year)

    if (yearDifference !== 0) {
      return yearDifference
    }

    return bDate.monthIndex - aDate.monthIndex
  })
}

function getMusicArchiveNavigation(recaps: RawMusicRecap[]) {
  const years = new Map<string, MusicArchiveMonth[]>()

  for (const recap of sortRecapsByDate(recaps)) {
    const { label, slug, year } = getMonthFromLabel(recap.monthLabel)
    if (!year || !slug) continue

    years.set(year, [...(years.get(year) ?? []), { label, slug }])
  }

  return Array.from(years.entries()).map(([year, months]) => ({
    months,
    year,
  }))
}

function getRawMusicRecap({
  month,
  year,
}: {
  month?: string
  year?: string
}) {
  const sortedRecaps = sortRecapsByDate(monthlyMusicRecaps)

  return (
    sortedRecaps.find((recap) => {
      const recapDate = getMonthFromLabel(recap.monthLabel)
      return recapDate.slug === month && recapDate.year === year
    }) ?? sortedRecaps[0]
  )
}

export const musicArchiveNavigation: MusicArchiveYear[] =
  getMusicArchiveNavigation(monthlyMusicRecaps)

function getLargeArtworkUrl(artworkUrl?: string) {
  return artworkUrl?.replace(/100x100bb\.(jpg|png)$/, "600x600bb.$1")
}

function normalizeMusicText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function withoutQualifiers(value: string) {
  return value
    .replace(/\s*[\[(].*?[\])]\s*/g, " ")
    .replace(/\s+-\s*(single|ep|remaster(ed)?|bonus track version).*$/i, "")
    .trim()
}

function getTitleScore(candidateTitle: string, targetTitle: string) {
  const candidate = normalizeMusicText(candidateTitle)
  const target = normalizeMusicText(targetTitle)
  const candidateBase = normalizeMusicText(withoutQualifiers(candidateTitle))
  const targetBase = normalizeMusicText(withoutQualifiers(targetTitle))

  if (candidate === target) return 8
  if (candidateBase === targetBase) return 7
  if (candidate.includes(target) || target.includes(candidate)) return 5
  if (
    candidateBase.length > 4 &&
    targetBase.length > 4 &&
    (candidateBase.includes(targetBase) || targetBase.includes(candidateBase))
  ) {
    return 4
  }

  return 0
}

function getArtistScore(candidateArtist: string | undefined, targetArtist: string) {
  if (!candidateArtist) return 0

  const candidate = normalizeMusicText(candidateArtist)
  const target = normalizeMusicText(targetArtist)

  if (candidate === target) return 5
  if (candidate.includes(target) || target.includes(candidate)) return 4

  const targetLeadArtist = normalizeMusicText(targetArtist.split(/[,&]/)[0] ?? "")
  if (targetLeadArtist && candidate.includes(targetLeadArtist)) return 3

  return 0
}

function pickBestArtwork<T>(
  candidates: T[],
  getCandidate: (
    candidate: T,
  ) => { artist?: string; artworkUrl?: string; title?: string },
  {
    artist,
    minimumScore = 10,
    title,
  }: {
    artist: string
    minimumScore?: number
    title: string
  },
) {
  const ranked = candidates
    .map((candidate) => {
      const metadata = getCandidate(candidate)
      return {
        artworkUrl: metadata.artworkUrl,
        score:
          getTitleScore(metadata.title ?? "", title) +
          getArtistScore(metadata.artist, artist),
      }
    })
    .filter((candidate) => candidate.artworkUrl && candidate.score >= minimumScore)
    .sort((a, b) => b.score - a.score)

  return ranked[0]?.artworkUrl
}

async function getDeezerArtwork({
  artist,
  entity,
  title,
}: {
  artist: string
  entity: "album" | "song"
  title: string
}) {
  const queries =
    entity === "album"
      ? [`artist:"${artist}" album:"${title}"`, `${artist} ${title}`]
      : [`artist:"${artist}" track:"${title}"`, `${artist} ${title}`]

  try {
    for (const query of queries) {
      const params = new URLSearchParams({
        limit: "10",
        q: query,
      })
      const response = await fetch(
        `https://api.deezer.com/search/${
          entity === "album" ? "album" : "track"
        }?${params}`,
        {
          next: { revalidate: ONE_DAY },
        },
      )

      if (!response.ok) {
        continue
      }

      if (entity === "album") {
        const data = (await response.json()) as {
          data?: Array<{
            artist?: { name?: string }
            cover_xl?: string
            title?: string
          }>
        }

        const artworkUrl = pickBestArtwork(
          data.data ?? [],
          (candidate) => ({
            artist: candidate.artist?.name,
            artworkUrl: candidate.cover_xl,
            title: candidate.title,
          }),
          { artist, title },
        )

        if (artworkUrl) return artworkUrl
        continue
      }

      const data = (await response.json()) as {
        data?: Array<{
          album?: { cover_xl?: string; title?: string }
          artist?: { name?: string }
          title?: string
          title_short?: string
        }>
      }

      const artworkUrl = pickBestArtwork(
        data.data ?? [],
        (candidate) => ({
          artist: candidate.artist?.name,
          artworkUrl: candidate.album?.cover_xl,
          title: candidate.title ?? candidate.title_short,
        }),
        { artist, title },
      )

      if (artworkUrl) return artworkUrl
    }
  } catch {
    return undefined
  }

  return undefined
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
    limit: "15",
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
      results?: Array<{
        artistName?: string
        artworkUrl100?: string
        collectionArtistName?: string
        collectionName?: string
        trackName?: string
      }>
    }

    return pickBestArtwork(
      data.results ?? [],
      (candidate) => ({
        artist: candidate.collectionArtistName ?? candidate.artistName,
        artworkUrl: getLargeArtworkUrl(candidate.artworkUrl100),
        title: entity === "album" ? candidate.collectionName : candidate.trackName,
      }),
      { artist, title },
    )
  } catch {
    return undefined
  }
}

async function getMusicArtwork({
  albumTitle,
  artist,
  entity,
  title,
}: {
  albumTitle?: string
  artist: string
  entity: "album" | "song"
  title: string
}) {
  if (entity === "song" && albumTitle) {
    const albumArtwork =
      (await getDeezerArtwork({
        artist,
        entity: "album",
        title: albumTitle,
      })) ??
      (await getItunesArtwork({
        artist,
        entity: "album",
        title: albumTitle,
      }))

    if (albumArtwork) return albumArtwork
  }

  return (
    (await getDeezerArtwork({ artist, entity, title })) ??
    (await getItunesArtwork({ artist, entity, title }))
  )
}

export function getLatestRawMusicRecap() {
  return getRawMusicRecap({})
}

async function hydrateMusicRecap(recap: RawMusicRecap): Promise<MusicRecap> {
  const [albums, songs] = await Promise.all([
    Promise.all(
      recap.albums.map(async (album, index) => ({
        ...album,
        artworkUrl:
          album.artworkUrl ??
          (await getMusicArtwork({
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
          (await getMusicArtwork({
            albumTitle: song.albumTitle,
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

export async function getLatestMusicRecap(): Promise<MusicRecap> {
  return hydrateMusicRecap(getLatestRawMusicRecap())
}

export async function getMusicRecap({
  month,
  year,
}: {
  month?: string
  year?: string
}): Promise<MusicRecap> {
  return hydrateMusicRecap(getRawMusicRecap({ month, year }))
}
