"use client"

/*
 * /miky
 * The album's artist, on the album's own stone: the same two columns pinned
 * to the window's edges (shared with /album in app/(athens)/layout.tsx, so
 * they stay put going between the two), the same cells, type and blue.
 * Where the album has its medallion, he has his coin: his head printed in
 * blue on plaster, ringed by a Greek key, that turns to struck silver under
 * the cursor (coin.tsx). Then every name he goes by, cut as one inscription,
 * four portraits from the archive, his record (its cover and facts, the way
 * in to /album), and the album's temple to close.
 *
 * The portraits are printed in the album's blue on plaster; under the cursor
 * (or a finger) they come back to their own colors, the way the album's
 * reliefs turn to metal.
 */

import Link from "next/link"
import { useState, useSyncExternalStore, type CSSProperties } from "react"

import { ALBUM, TOTAL_SECONDS, TRACKS } from "@/components/album/data"
import { Fact, MeanderRule, Sep, TitleSwap } from "@/components/album/parts"
import { ReliefCanvas } from "@/components/album/relief-canvas"
import { useReveal } from "@/components/album/use-reveal"
import { cn } from "@/lib/utils"

import { Coin } from "./coin"
import {
  NAMES,
  PORTRAITS,
  SHOWN,
  deal,
  firstFour,
  noPortraits,
  noSubscription,
} from "./data"
import { Duo } from "./duo"
import { roman } from "./utils"

/*
 * His name in Greek; clicking it gives it in Latin letters and back, the
 * album title's swap: both are always on the page in one grid cell, so only
 * the letters change.
 */
const GREEK_NAME = {
  lines: ["Μιχαήλ"],
  lang: "el",
  label: "Μιχαήλ, Michail. Show it in Latin letters",
}
const LATIN_NAME = {
  lines: ["Michail"],
  lang: "en",
  label: "Michail. Show his name in Greek",
}

export default function MikyPage() {
  const page = useReveal()
  // The first four are dealt once on the client (the server has none, so
  // nothing mismatches); after that, the button deals new ones.
  const first = useSyncExternalStore(noSubscription, firstFour, noPortraits)
  const [dealt, setDealt] = useState<string[] | null>(null)
  const portraits = dealt ?? first

  return (
    <main ref={page} className="l2-main">
      <section className="cell l2-hero">
        <div className="l2-bar ui">
          <span>Sellas</span>
          <Link href="/album">Album Silente</Link>
        </div>
        <div className="mk-coin-cell">
          <Coin />
        </div>
        <div className="l2-heading">
          <TitleSwap
            greek={GREEK_NAME}
            latin={LATIN_NAME}
            className="mk-title"
          />
          <p>The Greek</p>
        </div>
      </section>

      <section className="cell l2-record mk-names-cell" data-reveal>
        <header className="rise">
          <h2 className="section-title">The names</h2>
          <span className="ui">{roman(NAMES.length)}</span>
        </header>
        <MeanderRule />
        <ul className="mk-names" aria-label="Also known as">
          {NAMES.map((name, i) => (
            <li
              key={name}
              className="rise"
              style={{ "--i": i + 1 } as CSSProperties}
            >
              {name}
            </li>
          ))}
        </ul>
      </section>

      <section className="cell mk-strip ui" data-reveal>
        <span className="rise">
          Portraits
          <Sep />
          {roman(SHOWN)} of {roman(PORTRAITS.length)}
        </span>
        <button
          type="button"
          className="rise"
          onClick={() => {
            setDealt(deal(portraits))
          }}
        >
          <ShuffleGlyph /> Another four
        </button>
      </section>

      <div className={cn("mk-portraits", dealt && "is-shuffled")}>
        {Array.from({ length: SHOWN }, (_, i) => (
          <section key={i} className="cell unveil mk-portrait" data-reveal>
            {portraits[i] && (
              <Duo
                key={portraits[i]}
                src={portraits[i]}
                alt={`Michail, portrait ${i + 1} of ${SHOWN}`}
                sizes="(max-width: 1099px) 50vw, 32vw"
              />
            )}
          </section>
        ))}
      </div>

      <div className="l2-pair">
        <Link
          href="/album"
          className="cell unveil mk-record-cover"
          aria-label={`${ALBUM.titleLatin}, the record`}
          data-reveal
        >
          <ReliefCanvas
            name="cover"
            brush={0.16}
            alt={`${ALBUM.titleLatin} cover, cast in plaster`}
          />
        </Link>
        <section className="cell mk-record" data-reveal>
          <div className="facts-shell">
            <h2 className="rise">The record</h2>
            <MeanderRule unit={1.2} />
            <dl>
              <Fact
                i={1}
                label="T."
                value={`${ALBUM.titleGreek}\n${ALBUM.titleLatin}`}
              />
              <Fact
                i={2}
                label="Y."
                value={`${ALBUM.year}\n${ALBUM.yearRoman}`}
              />
              <Fact
                i={3}
                label="N."
                value={`${roman(TRACKS.length)} tracks\n${Math.round(TOTAL_SECONDS / 60)} min`}
              />
            </dl>
            <Link
              href="/album"
              className="ui rise mk-record-link"
              style={{ "--i": 4 } as CSSProperties}
            >
              Listen <ArrowGlyph />
            </Link>
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

/* ───────────────────────── bits ───────────────────────── */

const ArrowGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />
  </svg>
)

const ShuffleGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M4 7h3.5c4.5 0 4.5 10 9 10H20M17.5 14.5 20 17l-2.5 2.5M4 17h3.5c1.6 0 2.6-1.3 3.4-3M13.1 10c.8-1.7 1.8-3 3.4-3H20M17.5 4.5 20 7l-2.5 2.5" />
  </svg>
)
