/**
 * Cover art for the recaps, looked up on Deezer, then on iTunes. A month's
 * covers don't change, so every lookup is cached for good.
 */

const permanentArtworkFetchOptions = {
  cache: "force-cache",
} as const

type MusicEntity = "album" | "song"

type ArtworkCandidate = {
  artist?: string
  artworkUrl?: string
  title?: string
}

type DeezerAlbum = {
  artist?: { name?: string }
  cover_xl?: string
  title?: string
}

type DeezerTrack = {
  album?: { cover_xl?: string; title?: string }
  artist?: { name?: string }
  title?: string
  title_short?: string
}

type ItunesResult = {
  artistName?: string
  artworkUrl100?: string
  collectionArtistName?: string
  collectionName?: string
  trackName?: string
}

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

function getArtistScore(
  candidateArtist: string | undefined,
  targetArtist: string
) {
  if (!candidateArtist) return 0

  const candidate = normalizeMusicText(candidateArtist)
  const target = normalizeMusicText(targetArtist)

  if (candidate === target) return 5
  if (candidate.includes(target) || target.includes(candidate)) return 4

  const targetLeadArtist = normalizeMusicText(
    targetArtist.split(/[,&]/)[0] ?? ""
  )
  if (targetLeadArtist && candidate.includes(targetLeadArtist)) return 3

  return 0
}

/**
 * The best-matching cover, if any candidate matches well enough: roughly,
 * a matching title and a matching artist (10 of a possible 13 points).
 */
function pickBestArtwork(
  candidates: ArtworkCandidate[],
  { artist, title }: { artist: string; title: string }
) {
  const ranked = candidates
    .map((candidate) => ({
      artworkUrl: candidate.artworkUrl,
      score:
        getTitleScore(candidate.title ?? "", title) +
        getArtistScore(candidate.artist, artist),
    }))
    .filter((candidate) => candidate.artworkUrl && candidate.score >= 10)
    .sort((a, b) => b.score - a.score)

  return ranked[0]?.artworkUrl
}

/** Deezer's search endpoint for each entity, and how to read its results. */
const deezerSearch: Record<
  MusicEntity,
  {
    field: string
    path: string
    toCandidates: (response: Response) => Promise<ArtworkCandidate[]>
  }
> = {
  album: {
    field: "album",
    path: "album",
    toCandidates: async (response) => {
      const data = (await response.json()) as { data?: DeezerAlbum[] }

      return (data.data ?? []).map((candidate) => ({
        artist: candidate.artist?.name,
        artworkUrl: candidate.cover_xl,
        title: candidate.title,
      }))
    },
  },
  song: {
    field: "track",
    path: "track",
    toCandidates: async (response) => {
      const data = (await response.json()) as { data?: DeezerTrack[] }

      return (data.data ?? []).map((candidate) => ({
        artist: candidate.artist?.name,
        artworkUrl: candidate.album?.cover_xl,
        title: candidate.title ?? candidate.title_short,
      }))
    },
  },
}

/**
 * Tries a fielded query, then a loose one. A failed request skips to the
 * next query; a network error ends the Deezer lookup.
 */
async function getDeezerArtwork({
  artist,
  entity,
  title,
}: {
  artist: string
  entity: MusicEntity
  title: string
}) {
  const search = deezerSearch[entity]
  const queries = [
    `artist:"${artist}" ${search.field}:"${title}"`,
    `${artist} ${title}`,
  ]

  try {
    for (const query of queries) {
      const params = new URLSearchParams({
        limit: "10",
        q: query,
      })
      const response = await fetch(
        `https://api.deezer.com/search/${search.path}?${params}`,
        permanentArtworkFetchOptions
      )

      if (!response.ok) {
        continue
      }

      const artworkUrl = pickBestArtwork(await search.toCandidates(response), {
        artist,
        title,
      })

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
  entity: MusicEntity
  title: string
}) {
  const params = new URLSearchParams({
    entity,
    limit: "15",
    media: "music",
    term: `${title} ${artist}`,
  })

  try {
    const response = await fetch(
      `https://itunes.apple.com/search?${params}`,
      permanentArtworkFetchOptions
    )

    if (!response.ok) {
      return undefined
    }

    const data = (await response.json()) as { results?: ItunesResult[] }

    return pickBestArtwork(
      (data.results ?? []).map((candidate) => ({
        artist: candidate.collectionArtistName ?? candidate.artistName,
        artworkUrl: getLargeArtworkUrl(candidate.artworkUrl100),
        title:
          entity === "album" ? candidate.collectionName : candidate.trackName,
      })),
      { artist, title }
    )
  } catch {
    return undefined
  }
}

/** A song's cover is its album's when the recap names the album. */
export async function getMusicArtwork({
  albumTitle,
  artist,
  entity,
  title,
}: {
  albumTitle?: string
  artist: string
  entity: MusicEntity
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
