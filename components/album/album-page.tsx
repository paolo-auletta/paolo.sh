"use client"

/*
 * /album
 * A procession between two columns, pinned to the window's edges while the
 * page scrolls between them. The medallion player is the hero, big enough to
 * play by its sectors (I–VI). Then the record as a list, the cover and the
 * facts side by side, and a temple front to close.
 */

import { ALBUM, TOTAL_SECONDS, TRACKS, downloadAll } from "./data"
import { DiscPlayer, DownloadGlyph, Sep, TitleSwap, TrackRow } from "./parts"
import { ReliefCanvas } from "./relief-canvas"
import { useAlbumPlayer } from "./use-album-player"

export function AlbumPage() {
  const player = useAlbumPlayer()

  return (
    <main className="l2">
      <aside className="cell l2-pillar">
        <ReliefCanvas name="column-l" place="pillar-left" alt="Plaster Ionic column under the sun" />
      </aside>

      <div className="l2-main">
        <section className="cell l2-hero">
          <div className="l2-bar ui">
            <span>{ALBUM.artist}</span>
            <span>{ALBUM.yearRoman}</span>
          </div>
          <DiscPlayer player={player} />
          <div className="l2-heading" data-reveal>
            <TitleSwap />
            <p>{ALBUM.artists}</p>
          </div>
        </section>

        <section className="cell l2-record">
          <header>
            <h2 className="section-title">The record</h2>
            <span className="ui">
              {ALBUM.genre}
              <Sep />
              {Math.round(TOTAL_SECONDS / 60)} min
            </span>
          </header>
          <ol className="track-list" data-reveal>
            {TRACKS.map((t) => (
              <TrackRow key={t.n} track={t} player={player} />
            ))}
          </ol>
          <footer className="ui">
            <button type="button" onClick={downloadAll}>
              <DownloadGlyph /> Download all
            </button>
          </footer>
        </section>

        <div className="l2-pair">
          <section className="cell">
            <ReliefCanvas name="cover" brush={0.16} alt={`${ALBUM.titleLatin} cover, cast in plaster`} />
          </section>
          <section className="cell" style={{ display: "grid", placeItems: "center" }}>
            <div className="facts-shell">
              <h2>The facts</h2>
              <dl>
                <Fact label="W." value={ALBUM.people.replace(" and ", "\nand ")} />
                <Fact label="Y." value={`${ALBUM.year}\n${ALBUM.yearRoman}`} />
                <Fact label="G." value={ALBUM.genre} />
                <Fact label="R." value={ALBUM.recorded.replace(" · ", "\n")} />
              </dl>
            </div>
          </section>
        </div>

        <footer className="cell l2-temple">
          <ReliefCanvas name="temple" brush={0.2} alt="A temple front with six columns, one per track" />
        </footer>
      </div>

      <aside className="cell l2-pillar">
        <ReliefCanvas name="column-r" place="pillar-right" alt="Plaster Ionic column under the moon" />
      </aside>
    </main>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
