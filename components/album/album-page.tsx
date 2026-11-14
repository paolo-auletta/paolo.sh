"use client"

/*
 * /album
 * A procession between two columns, pinned to the window's edges while the
 * page scrolls between them (the columns are app/(athens)/layout.tsx's, so
 * they stay put on the way to /miky and back). The medallion player is the
 * hero, big enough to play by its sectors (I–VI). Then the record as a list,
 * the cover and the facts side by side, and a temple front to close.
 *
 * Motion, kept to four movements:
 * - a procession on arrival: the columns rise, the medallion is struck, the
 *   Greek title is chiselled letter by letter, the small print comes last;
 * - Greek key rules that draw themselves under the section titles;
 * - lists that rise line by line, like an inscription being read;
 * - reliefs that are unveiled.
 * The last three wait until their section scrolls into view.
 */

import Link from "next/link"
import type { CSSProperties } from "react"

import { ALBUM, TOTAL_SECONDS, TRACKS, downloadAll } from "./data"
import {
  DiscPlayer,
  DownloadGlyph,
  Fact,
  MeanderRule,
  Sep,
  TitleSwap,
  TrackRow,
} from "./parts"
import { ReliefCanvas } from "./relief-canvas"
import { useAlbumPlayer } from "./use-album-player"
import { useReveal } from "./use-reveal"

const GREEK_TITLE = {
  lines: ALBUM.titleGreek.split(" "),
  lang: "el",
  label: `${ALBUM.titleGreek}. Translate the title`,
}
const LATIN_TITLE = {
  lines: ALBUM.titleLatin.split(" "),
  lang: "it",
  label: `${ALBUM.titleLatin}. Show the Greek title`,
}

export function AlbumPage() {
  const player = useAlbumPlayer()
  const page = useReveal()

  return (
    <main ref={page} className="l2-main">
      <section className="cell l2-hero">
        <div className="l2-bar ui">
          <Link href="/miky">{ALBUM.artist}</Link>
          <span>{ALBUM.yearRoman}</span>
        </div>
        <DiscPlayer player={player} />
        <div className="l2-heading">
          <TitleSwap greek={GREEK_TITLE} latin={LATIN_TITLE} />
          <p>{ALBUM.artists}</p>
        </div>
      </section>

      <section className="cell l2-record" data-reveal>
        <header className="rise">
          <h2 className="section-title">The record</h2>
          <span className="ui">
            {ALBUM.genre}
            <Sep />
            {Math.round(TOTAL_SECONDS / 60)} min
          </span>
        </header>
        <MeanderRule />
        <ol className="track-list">
          {TRACKS.map((t, i) => (
            <TrackRow
              key={t.n}
              track={t}
              player={player}
              index={i + 1}
              className="rise"
            />
          ))}
        </ol>
        <footer
          className="ui rise"
          style={{ "--i": TRACKS.length + 2 } as CSSProperties}
        >
          <button type="button" onClick={downloadAll}>
            <DownloadGlyph /> Download all
          </button>
        </footer>
      </section>

      <div className="l2-pair">
        <section className="cell unveil" data-reveal>
          <ReliefCanvas
            name="cover"
            brush={0.16}
            alt={`${ALBUM.titleLatin} cover, cast in plaster`}
          />
        </section>
        <section
          className="cell"
          style={{ display: "grid", placeItems: "center" }}
          data-reveal
        >
          <div className="facts-shell">
            <h2 className="rise">The facts</h2>
            <MeanderRule unit={1.2} />
            <dl>
              <Fact
                i={1}
                label="W."
                value={ALBUM.people.replace(" and ", "\nand ")}
              />
              <Fact
                i={2}
                label="Y."
                value={`${ALBUM.year}\n${ALBUM.yearRoman}`}
              />
              <Fact i={3} label="G." value={ALBUM.genre} />
              <Fact
                i={4}
                label="R."
                value={ALBUM.recorded.replace(" · ", "\n")}
              />
            </dl>
          </div>
        </section>
      </div>

      <footer className="cell l2-temple unveil" data-reveal>
        <ReliefCanvas
          name="temple"
          brush={0.2}
          alt="A temple front with six columns, one per track"
        />
      </footer>
    </main>
  )
}
