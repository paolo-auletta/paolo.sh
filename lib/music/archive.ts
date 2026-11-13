import { monthlyMusicRecaps } from "./recaps"
import {
  type MusicArchiveMonth,
  type MusicArchiveYear,
  type RawMusicRecap,
} from "./types"

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

type MusicRecapEntry = {
  month: MusicArchiveMonth
  monthIndex: number
  recap: RawMusicRecap
  year: string
}

/** Reads "October 2026"; a label that doesn't read like that fails the build. */
function toEntry(recap: RawMusicRecap): MusicRecapEntry {
  const [label, year, ...rest] = recap.monthLabel.split(" ")
  const slug = label.toLowerCase()
  const monthIndex = monthOrder.indexOf(slug)

  if (monthIndex === -1 || !/^\d{4}$/.test(year ?? "") || rest.length > 0) {
    throw new Error(
      `Music recap "${recap.monthLabel}" should be labelled "<Month> <Year>".`
    )
  }

  return { month: { label, slug }, monthIndex, recap, year }
}

/** Every recap, newest month first. */
const musicRecapEntries = monthlyMusicRecaps.map(toEntry).sort((a, b) => {
  const yearDifference = Number(b.year) - Number(a.year)

  if (yearDifference !== 0) {
    return yearDifference
  }

  return b.monthIndex - a.monthIndex
})

function getMusicArchiveNavigation(entries: MusicRecapEntry[]) {
  const years = new Map<string, MusicArchiveMonth[]>()

  for (const { month, year } of entries) {
    years.set(year, [...(years.get(year) ?? []), month])
  }

  return Array.from(years.entries()).map(([year, months]) => ({
    months,
    year,
  }))
}

/** Years newest first, each with its months newest first. */
export const musicArchiveNavigation: MusicArchiveYear[] =
  getMusicArchiveNavigation(musicRecapEntries)

export const latestMusicRecap: RawMusicRecap = musicRecapEntries[0].recap

/**
 * The month /music/all shows for its ?year and ?month: an unknown year
 * falls back to the latest year, an unknown month to that year's latest
 * month. The selected month and year are the entries of
 * musicArchiveNavigation themselves.
 */
export function resolveMusicArchive({
  month,
  year,
}: {
  month?: string
  year?: string
}) {
  const selectedYear =
    musicArchiveNavigation.find((entry) => entry.year === year) ??
    musicArchiveNavigation[0]
  const selectedMonth =
    selectedYear.months.find((entry) => entry.slug === month) ??
    selectedYear.months[0]
  const entry = musicRecapEntries.find(
    (candidate) => candidate.month === selectedMonth
  )

  if (!entry) {
    throw new Error(`No music recap for ${selectedMonth.label}.`)
  }

  return { recap: entry.recap, selectedMonth, selectedYear }
}
