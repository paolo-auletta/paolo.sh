"use client"

import { useEffect, useRef, useState, type CSSProperties, type SVGProps } from "react"

import { cn } from "@/lib/utils"

import { ALBUM, TRACKS, formatTime, type Track } from "./data"
import { KEY, meanderRing } from "./meander"
import { ReliefCanvas } from "./relief-canvas"
import type { AlbumPlayer } from "./use-album-player"

/* ───────────────────────── icons ───────────────────────── */

type IconProps = SVGProps<SVGSVGElement>

export const PlayGlyph = (p: IconProps) => (
  <svg viewBox="0 0 16 16" aria-hidden {...p}>
    <path fill="currentColor" d="M5.2 2.8C7.83 6.1 10.47 7.1 13.1 8 10.47 8.9 7.83 9.9 5.2 13.2Z" />
  </svg>
)

export const PauseGlyph = (p: IconProps) => (
  <svg viewBox="0 0 16 16" aria-hidden {...p}>
    <path fill="currentColor" d="M4.6 3.6h2.4v8.8H4.6zM9 3.6h2.4v8.8H9z" />
  </svg>
)

export const MutedGlyph = (p: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}>
    <path
      fill="currentColor"
      d="M4 9.3h3.2L12 5v14l-4.8-4.3H4V9.3Zm11.1 1.1 1.5-1.5 1.9 1.9 1.9-1.9 1.5 1.5-1.9 1.9 1.9 1.9-1.5 1.5-1.9-1.9-1.9 1.9-1.5-1.5 1.9-1.9-1.9-1.9Z"
    />
  </svg>
)

export const SoundGlyph = (p: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}>
    <path fill="currentColor" d="M4 9.3h3.2L12 5v14l-4.8-4.3H4V9.3Z" />
    <path
      d="M15 9a4.2 4.2 0 0 1 0 6M17.6 6.6a7.6 7.6 0 0 1 0 10.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
)

export const DownloadGlyph = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden {...p}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
  </svg>
)

/** A short hairline between two facts, in place of a middle dot. */
export const Sep = () => <span className="sep" aria-hidden />

/* ───────────────────────── meander rule ───────────────────────── */

/**
 * A running Greek key as a rule between a heading and what it heads. It fits
 * as many whole keys as the width allows, centred, and draws itself in when
 * its section is revealed (see .meander-rule in athens.css).
 */
export function MeanderRule({ unit = 1.5 }: { unit?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const h = unit * 8 + 2
  const keys = Math.max(0, Math.floor((width - 2) / (unit * 10)))
  const x0 = (width - keys * unit * 10) / 2
  const d = keys
    ? "M" +
      Array.from({ length: keys }, (_, k) =>
        KEY.slice(k ? 1 : 0).map(([x, y]) => `${(x0 + (k * 10 + x) * unit).toFixed(2)} ${(1 + y * unit).toFixed(2)}`)
      )
        .flat()
        .join("L")
    : ""
  return (
    <div ref={ref} className="meander-rule" style={{ height: h }} aria-hidden>
      {keys > 0 && (
        <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
          <path d={d} pathLength={1} />
        </svg>
      )}
    </div>
  )
}

/* ───────────────────────── disc player ───────────────────────── */

/**
 * The medallion player: a plaster disc that spins while the record plays,
 * with the blue play button in its well. Each of its six sectors (I–VI) is a
 * track; clicking one plays it.
 */
export function DiscPlayer({ player }: { player: AlbumPlayer }) {
  const { current, isPlaying, muted, progress, duration } = player
  const pct = duration > 0 ? Math.min(1, progress / duration) : 0

  const onSector = (u: number, v: number) => {
    const dx = u - 0.5
    const dy = v - 0.5
    const r = Math.hypot(dx, dy) / 0.5
    if (r < 0.31 || r > 0.78) return
    const a = (Math.atan2(dy, dx) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)
    const track = TRACKS[Math.floor(a / (Math.PI / 3))]
    if (track && !track.locked) player.toggleTrack(track)
  }

  return (
    <div className="disc-cell">
      <ReliefCanvas
        name="disc"
        className="disc-stage"
        spin={isPlaying}
        brush={0.16}
        onLocalClick={onSector}
        alt="Plaster medallion with six sectors, one per track"
        layer={current && <SectorGlow index={current.n - 1} playing={isPlaying} />}
      >
        <svg className="disc-progress" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="49.2" pathLength={1} strokeDasharray={`${pct} 1`} />
        </svg>
        <button
          type="button"
          className={cn("disc-play", isPlaying && "is-playing")}
          onClick={(e) => {
            e.stopPropagation()
            player.toggle()
          }}
          aria-label={isPlaying ? "Pause" : "Play the album"}
          aria-pressed={isPlaying}
        >
          <span className="disc-play-key" aria-hidden>
            <svg viewBox="0 0 100 100">
              <path d={MEANDER_RING} />
              <circle cx="50" cy="50" r={MEANDER_INNER} />
            </svg>
          </span>
          {isPlaying ? <PauseGlyph /> : <PlayGlyph />}
        </button>
      </ReliefCanvas>
      <p className="disc-caption">
        {current ? (
          <>
            {current.numeral}. {current.title}
            <Sep />
            <span className="disc-time">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </>
        ) : (
          <>
            {ALBUM.recordedPlaces}
            <Sep />
            {ALBUM.recordedYears}
          </>
        )}
      </p>
      <button
        type="button"
        className={cn("disc-mute", muted && "is-muted")}
        onClick={player.toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={muted}
      >
        {muted ? <MutedGlyph /> : <SoundGlyph />}
      </button>
    </div>
  )
}

/*
 * A running Greek key bent into a ring, for the play button's hover. One key
 * is drawn on a 10×8 grid (x along the ring, y from the rim inwards) and
 * wrapped around the circle; the straight runs become arcs.
 */
const MEANDER_KEYS = 14
const MEANDER_OUTER = 45.5
const MEANDER_STEP = 1.32 // ring radius per grid unit
const MEANDER_INNER = MEANDER_OUTER - 10.6 * MEANDER_STEP
const MEANDER_RING = meanderRing({
  keys: MEANDER_KEYS,
  outer: MEANDER_OUTER,
  step: MEANDER_STEP,
  inset: 0.4,
})

/** A blue wash over the playing track's sector; it turns with the disc. */
function SectorGlow({ index, playing }: { index: number; playing: boolean }) {
  const point = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180
    return `${(50 + Math.cos(a) * r).toFixed(2)} ${(50 + Math.sin(a) * r).toFixed(2)}`
  }
  const a0 = -90 + index * 60
  const a1 = a0 + 60
  const [r0, r1] = [15.6, 38]
  const d = `M${point(a0, r0)}L${point(a0, r1)}A${r1} ${r1} 0 0 1 ${point(a1, r1)}L${point(a1, r0)}A${r0} ${r0} 0 0 0 ${point(a0, r0)}Z`
  return (
    <svg className={cn("disc-sector", playing && "is-playing")} viewBox="0 0 100 100" aria-hidden>
      <path d={d} />
    </svg>
  )
}

/* ───────────────────────── title ───────────────────────── */

/** One of the two titles TitleSwap stacks. */
type Title = {
  /** Its lines, each set as one row of letters. */
  lines: string[]
  lang: string
  /** The button's label while this title shows. */
  label: string
}

/**
 * A Greek title; clicking it translates it to Latin letters and back. Both
 * titles are always in the page, stacked in one grid cell, so the swap is
 * only letters fading through blur: nothing around it moves.
 */
export function TitleSwap({
  greek,
  latin,
  className,
}: {
  greek: Title
  latin: Title
  className?: string
}) {
  const [showLatin, setShowLatin] = useState(false)
  return (
    <h1 className={cn("title-swap", className)}>
      <button
        type="button"
        onClick={() => setShowLatin((l) => !l)}
        aria-label={showLatin ? latin.label : greek.label}
      >
        <TitleLines lines={greek.lines} lang={greek.lang} hidden={showLatin} />
        <TitleLines lines={latin.lines} lang={latin.lang} hidden={!showLatin} />
      </button>
    </h1>
  )
}

function TitleLines({ lines, lang, hidden }: { lines: string[]; lang: string; hidden: boolean }) {
  let i = 0
  return (
    <span lang={lang} aria-hidden={hidden}>
      {lines.map((line) => (
        <span key={line} className="line">
          {Array.from(line).map((ch, k) => (
            <span key={k} className="ch" style={{ "--i": i++ } as CSSProperties}>
              {ch}
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}

/* ───────────────────────── track row ───────────────────────── */

/** A packing-list style row: numeral, title, duration. */
export function TrackRow({
  track,
  player,
  index = 0,
  className,
}: {
  track: Track
  player: AlbumPlayer
  /** Its place in the list, for the staggered reveal. */
  index?: number
  className?: string
}) {
  const isCurrent = player.current?.n === track.n
  const playing = isCurrent && player.isPlaying
  const pct = isCurrent && player.duration > 0 ? Math.min(1, player.progress / player.duration) : 0
  return (
    <li
      style={{ "--p": pct, "--i": index } as CSSProperties}
      className={cn(
        "track-row",
        isCurrent && "is-current",
        playing && "is-playing",
        track.locked && "is-locked",
        className
      )}
    >
      <button
        type="button"
        disabled={track.locked}
        onClick={() => player.toggleTrack(track)}
        aria-label={track.locked ? `${track.title} (locked)` : playing ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        <span className="track-num">
          <span className="track-numeral">{track.numeral}</span>
          <span className="track-icon">{playing ? <PauseGlyph /> : <PlayGlyph />}</span>
        </span>
        <span className="track-title">{track.title}</span>
        <span className="track-time">
          {track.locked ? "Locked" : isCurrent ? `${formatTime(player.progress)} / ${formatTime(track.duration)}` : formatTime(track.duration)}
        </span>
      </button>
    </li>
  )
}
