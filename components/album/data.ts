/*
 * The album: its facts and its tracks.
 */

export type Track = {
  n: number
  numeral: string
  title: string
  file: string | null
  duration: number | null
  locked?: boolean
}

export const ALBUM = {
  titleGreek: "άλμπουμ σιωπηλός",
  titleLatin: "Album Silente",
  artist: "Sellas",
  artists: "Lupo Lucio Battisti, Little Tonio Cartonio",
  people: "Lupo Lucio Battisti and Little Tonio Cartonio",
  year: "2025",
  yearRoman: "MMXXV",
  genre: "Greek Hip-Hop",
  recorded: "Roma and Athens · 2024–2025",
  recordedPlaces: "Roma & Athens",
  recordedYears: "2024–2025",
}

export const TRACKS: Track[] = [
  { n: 1, numeral: "I", title: "Super Greco", file: "/album/01-super-greco.mp3", duration: 84 },
  { n: 2, numeral: "II", title: "E ti prego Lord", file: "/album/02-e-ti-prego-lord.mp3", duration: 170 },
  { n: 3, numeral: "III", title: "L'URUGUAY", file: null, duration: null, locked: true },
  { n: 4, numeral: "IV", title: "Lettera a Biso", file: "/album/04-lettera-a-biso.mp3", duration: 123 },
  { n: 5, numeral: "V", title: "ASS (A Sugo Spinaci)", file: "/album/05-ass-a-sugo-spinaci.m4a", duration: 156 },
  { n: 6, numeral: "VI", title: "Sellas Freestyle", file: "/album/06-sellas-freestyle-new-intro.m4a", duration: 126 },
]

export const TOTAL_SECONDS = TRACKS.reduce((sum, t) => sum + (t.duration ?? 0), 0)

export function formatTime(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—:—"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function downloadName(track: Track) {
  const ext = track.file?.split(".").pop() ?? "mp3"
  return `${String(track.n).padStart(2, "0")} ${track.title}.${ext}`
}

const hasFile = (t: Track): t is Track & { file: string } => Boolean(t.file)

export function downloadAll() {
  TRACKS.filter(hasFile).forEach((track, i) => {
    window.setTimeout(() => {
      const a = document.createElement("a")
      a.href = track.file
      a.download = downloadName(track)
      document.body.appendChild(a)
      a.click()
      a.remove()
    }, i * 350)
  })
}
