"use client"

/*
 * /miky
 * The album's artist, on the album's own stone: the same two columns pinned
 * to the window's edges, the same cells, type and blue. Where the album has
 * its medallion, he has his coin: his head printed in blue on plaster, ringed
 * by a Greek key, that turns to struck silver under the cursor (coin.tsx).
 * Then every name he goes by, cut as one inscription, four
 * portraits from the archive, and the album's temple to close.
 *
 * The portraits are printed in the album's blue on plaster; under the cursor
 * (or a finger) they come back to their own colors, the way the album's
 * reliefs turn to metal.
 */

import Image from "next/image"
import Link from "next/link"
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react"

import { MeanderRule, Sep } from "@/components/album/parts"
import { ReliefCanvas } from "@/components/album/relief-canvas"
import { cn } from "@/lib/utils"

import { Coin as SilverCoin } from "./coin"

const PORTRAITS = [
  "/miky/024c5a8d-5bb7-4ac8-8198-099c98f8d6fb.jpg",
  "/miky/0796a4de-0dfd-4add-b906-b0fba3bd1828.jpg",
  "/miky/0d17b620-b7b0-458a-a8c0-04ea7592ac5b.jpg",
  "/miky/0ee9f5b0-ac12-46e3-baef-08b1014dc452.jpg",
  "/miky/1d9630bc-58b8-4c09-ad62-71d18da745a0.jpg",
  "/miky/1dcb89dd-d00b-4d07-a358-7fec8cfcac9d.jpg",
  "/miky/4ab9cd40-f817-4dcf-af22-ffb2aab7d890.jpg",
  "/miky/4d62006c-8ec7-437b-80ee-653d2926d7c0.jpg",
  "/miky/4f63f8af-7266-40cc-9c5d-8f5073d098d1.jpg",
  "/miky/660bc9bb-266c-47d1-9eb5-71d07050631e.jpg",
  "/miky/66291a3b-89ac-4515-8d0d-f57b03f6488c.jpg",
  "/miky/727beea1-341f-4ca8-9ace-eda34cf79c61.jpg",
  "/miky/88824c6a-d7bd-4952-8cdf-c650c72612a8.jpg",
  "/miky/8E208173-3E19-4B11-B5CF-BDD1B9B3F4DB.JPG",
  "/miky/d184556c-d6b2-41ed-888d-cf37f8cf8e29.jpg",
  "/miky/ebb2b0dd-6481-4cdf-99ce-31fc018da7a6.jpg",
  "/miky/f04c732b-a4c7-406d-85d1-b6f5826119bd.jpg",
  "/miky/f0b57f7e-a643-40da-8b37-0b4bffb72e7a.jpg",
  "/miky/IMG_1157.jpeg",
  "/miky/IMG_1353.JPG",
  "/miky/IMG_1839.jpeg",
  "/miky/IMG_20220112_104555_Original.JPG",
  "/miky/IMG_20220112_104606_Original.JPG",
  "/miky/IMG_2454.jpeg",
  "/miky/IMG_2456.jpeg",
  "/miky/IMG_2791.JPG",
  "/miky/IMG_3614.jpeg",
  "/miky/IMG_4306.JPG",
  "/miky/IMG_4752.jpeg",
  "/miky/IMG_4907.jpeg",
  "/miky/IMG_4979.JPG",
  "/miky/IMG_5934E2FE-8EEE-4F4B-A602-07AA449CAFF1.jpeg",
]

/** The head on the coin: straight on, as coins have it. */
const COIN = "/miky/66291a3b-89ac-4515-8d0d-f57b03f6488c.jpg"

const NAMES = [
  "Michael",
  "Micheol",
  "Miky",
  "Michele",
  "Michelle",
  "Miza",
  "Miguel",
  "Mikel (Mi)",
  "Miky Mouse",
  "Yoannide",
  "Poseidone",
  "The Greek",
  "Antico UGO",
  "Albus Silente",
  "Fifone",
  "Smitch",
  "ABIGAL",
  "Patrick",
  "Sellas",
  "Sellaceo",
  "Casellas",
]

const SHOWN = 4

/** Four from the archive, never the coin's, and never the four on show. */
function deal(current: string[]) {
  const pool = PORTRAITS.filter((src) => src !== COIN && !current.includes(src))
  return shuffle(pool).slice(0, SHOWN)
}

let firstDeal: string[] | null = null
const firstFour = () => (firstDeal ??= deal([]))
const NONE: string[] = []
const noPortraits = () => NONE
const noSubscription = () => () => {}

export default function MikyPage() {
  const page = useReveal()
  // The first four are dealt once on the client (the server has none, so
  // nothing mismatches); after that, the button deals new ones.
  const first = useSyncExternalStore(noSubscription, firstFour, noPortraits)
  const [dealt, setDealt] = useState<string[] | null>(null)
  const portraits = dealt ?? first

  return (
    <main ref={page} className="l2 mk">
      <aside className="cell l2-pillar">
        <ReliefCanvas
          name="column-l"
          place="pillar-left"
          alt="Plaster Ionic column under the sun"
        />
      </aside>

      <div className="l2-main">
        <section className="cell l2-hero">
          <div className="l2-bar ui">
            <span>Sellas</span>
            <Link href="/album">Album Silente</Link>
          </div>
          <div className="mk-coin-cell">
            <Coin />
          </div>
          <div className="l2-heading">
            <NameSwap />
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
                {name === "Sellas" ? <Link href="/album">{name}</Link> : name}
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

        <footer className="cell l2-temple unveil" data-reveal>
          <ReliefCanvas
            name="temple"
            brush={0.2}
            alt="A temple front with six columns, one per track"
          />
        </footer>
      </div>

      <aside className="cell l2-pillar">
        <ReliefCanvas
          name="column-r"
          place="pillar-right"
          alt="Plaster Ionic column under the moon"
        />
      </aside>
    </main>
  )
}

/* ───────────────────────── the coin ───────────────────────── */

/**
 * His head in the album's blue, on a plaster flan, inside a running Greek
 * key that draws itself around the rim as the coin lands. The key's
 * geometry is baked into the silver too (scripts/miky-coin/bake.py).
 */
function Coin() {
  return (
    <SilverCoin
      rim={
        <svg className="mk-coin-rim" viewBox="0 0 100 100" aria-hidden>
          <circle className="mk-coin-edge" cx="50" cy="50" r="49.5" />
          <path className="mk-coin-key" d={COIN_KEY} pathLength={1} />
          <circle className="mk-coin-edge" cx="50" cy="50" r={COIN_INNER} />
        </svg>
      }
    />
  )
}

/*
 * A running Greek key bent into the coin's rim, as on the album's play
 * button: one key on a 10×8 grid (x along the rim, y inwards), wrapped
 * around the circle, its straight runs bent into short arcs.
 */
const COIN_KEYS = 30
const COIN_OUTER = 48.4
const COIN_STEP = 0.8
const COIN_INNER = COIN_OUTER - 10 * COIN_STEP

const COIN_KEY = (() => {
  const key: [number, number][] = [
    [0, 8],
    [0, 0],
    [8, 0],
    [8, 6],
    [4, 6],
    [4, 4],
    [6, 4],
    [6, 2],
    [2, 2],
    [2, 8],
    [10, 8],
  ]
  const at = (x: number, y: number) => {
    const a = (x / (COIN_KEYS * 10)) * Math.PI * 2 - Math.PI / 2
    const r = COIN_OUTER - (y + 0.6) * COIN_STEP
    return `${(50 + Math.cos(a) * r).toFixed(2)} ${(50 + Math.sin(a) * r).toFixed(2)}`
  }
  const points: string[] = []
  for (let k = 0; k < COIN_KEYS; k++) {
    key.forEach(([x, y], i) => {
      if (k > 0 && i === 0) return
      const prev = i > 0 ? key[i - 1]! : null
      if (prev && prev[1] === y && Math.abs(x - prev[0]) > 1) {
        const n = Math.abs(x - prev[0]) * 2
        for (let j = 1; j < n; j++)
          points.push(at(k * 10 + prev[0] + ((x - prev[0]) * j) / n, y))
      }
      points.push(at(k * 10 + x, y))
    })
  }
  return `M${points.join("L")}Z`
})()

/* ───────────────────────── portraits ───────────────────────── */

/**
 * A photo printed in blue on plaster. Wherever the cursor is, a soft patch
 * of it comes back to its own colors, and closes up again once the cursor
 * leaves. A finger does the same where it touches.
 */
function Duo({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src: string
  alt: string
  sizes: string
  priority?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const touch = useRef(false)

  const aim = (e: { clientX: number; clientY: number }) => {
    const el = ref.current
    if (!el) return
    const box = el.getBoundingClientRect()
    el.style.setProperty(
      "--x",
      `${(((e.clientX - box.left) / box.width) * 100).toFixed(1)}%`
    )
    el.style.setProperty(
      "--y",
      `${(((e.clientY - box.top) / box.height) * 100).toFixed(1)}%`
    )
  }

  return (
    <div
      ref={ref}
      className="mk-duo"
      onPointerEnter={(e) => {
        aim(e)
        if (e.pointerType === "mouse") ref.current?.classList.add("is-lit")
      }}
      onPointerMove={(e) => {
        if (e.pointerType === "mouse") aim(e)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") ref.current?.classList.remove("is-lit")
      }}
      onPointerDown={(e) => {
        touch.current = e.pointerType !== "mouse"
      }}
      onClick={(e) => {
        // A tap (not a scroll) opens it where it lands, or closes it.
        if (!touch.current) return
        aim(e)
        ref.current?.classList.toggle("is-lit")
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="mk-mono"
      />
      <span className="mk-wall" aria-hidden />
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        className="mk-true"
        aria-hidden
      />
    </div>
  )
}

/* ───────────────────────── title ───────────────────────── */

/**
 * His name in Greek; clicking it gives it in Latin letters and back, the
 * album title's swap: both are always on the page in one grid cell, so only
 * the letters change.
 */
function NameSwap() {
  const [latin, setLatin] = useState(false)
  return (
    <h1 className="title-swap mk-title">
      <button
        type="button"
        onClick={() => setLatin((l) => !l)}
        aria-label={
          latin
            ? "Michail. Show his name in Greek"
            : "Μιχαήλ, Michail. Show it in Latin letters"
        }
      >
        <Letters text="Μιχαήλ" lang="el" hidden={latin} />
        <Letters text="Michail" lang="en" hidden={!latin} />
      </button>
    </h1>
  )
}

function Letters({
  text,
  lang,
  hidden,
}: {
  text: string
  lang: string
  hidden: boolean
}) {
  return (
    <span lang={lang} aria-hidden={hidden}>
      <span className="line">
        {Array.from(text).map((ch, i) => (
          <span key={i} className="ch" style={{ "--i": i } as CSSProperties}>
            {ch}
          </span>
        ))}
      </span>
    </span>
  )
}

/* ───────────────────────── bits ───────────────────────── */

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

function shuffle<T>(items: T[]) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

function roman(n: number) {
  const marks: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ]
  let out = ""
  for (const [value, mark] of marks) {
    while (n >= value) {
      out += mark
      n -= value
    }
  }
  return out
}

/**
 * Marks each [data-reveal] section with .is-revealed as it scrolls into
 * view, as on the album: sections only start hidden once this runs, so
 * without JS, or with reduced motion, everything simply shows.
 */
function useReveal() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const page = ref.current
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return
    page.classList.add("motion-ready")
    const els = Array.from(page.querySelectorAll<HTMLElement>("[data-reveal]"))
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add("is-revealed")
          io.unobserve(e.target)
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return ref
}
