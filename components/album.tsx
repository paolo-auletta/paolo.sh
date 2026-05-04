"use client"

import { AnimatePresence, motion } from "motion/react"
import Image from "next/image"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"

import { cn } from "@/lib/utils"

const COVER_SRC = "/album/cover.jpg"
const ALBUM_TITLE_GREEK = "άλμπουμ σιωπηλός"
const ALBUM_TITLE_LATIN = "Album Silente"
const ALBUM_YEAR = "2025"
const ALBUM_GENRE = "Greek Hip-Hop"

type Track = {
  n: number
  title: string
  file: string | null
  duration: number | null
  locked?: boolean
}

const TRACKS: Track[] = [
  {
    n: 1,
    title: "Super Greco",
    file: "/album/01-super-greco.mp3",
    duration: 84,
  },
  {
    n: 2,
    title: "E ti prego Lord",
    file: "/album/02-e-ti-prego-lord.mp3",
    duration: 170,
  },
  {
    n: 3,
    title: "L'URUGUAY",
    file: null,
    duration: null,
    locked: true,
  },
  {
    n: 4,
    title: "Lettera a Biso",
    file: "/album/04-lettera-a-biso.mp3",
    duration: 123,
  },
  {
    n: 5,
    title: "ASS (A Sugo Spinaci)",
    file: "/album/05-ass-a-sugo-spinaci.m4a",
    duration: 156,
  },
  {
    n: 6,
    title: "Sellas Freestyle — New Intro",
    file: "/album/06-sellas-freestyle-new-intro.m4a",
    duration: 126,
  },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(12px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
}

const transition = (delay: number) => ({
  duration: 1.1,
  delay,
  ease,
})

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—:—"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatTotalRuntime(total: number) {
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  if (s === 0) return `${m} min`
  return `${m} min ${s}s`
}

export function Album() {
  const playable = useMemo(() => TRACKS.filter((t) => t.file), [])
  const totalDuration = useMemo(
    () => playable.reduce((acc, t) => acc + (t.duration ?? 0), 0),
    [playable]
  )

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [scrubbing, setScrubbing] = useState<number | null>(null)
  const [muted, setMuted] = useState(false)

  const currentTrack =
    currentIndex !== null ? (playable[currentIndex] ?? null) : null

  const playIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= playable.length) return
      const audio = audioRef.current
      if (!audio) return

      if (currentIndex === index) {
        if (audio.paused) {
          audio.play().catch(() => undefined)
        } else {
          audio.pause()
        }
        return
      }

      setCurrentIndex(index)
      const target = playable[index]
      if (target?.file) {
        audio.src = target.file
        audio.currentTime = 0
        audio.play().catch(() => undefined)
      }
    },
    [currentIndex, playable]
  )

  const togglePlayTrack = useCallback(
    (track: Track) => {
      if (!track.file) return
      const idx = playable.findIndex((t) => t.n === track.n)
      if (idx === -1) return
      playIndex(idx)
    },
    [playable, playIndex]
  )

  const playFirst = useCallback(() => {
    if (currentIndex === null) {
      playIndex(0)
    } else {
      playIndex(currentIndex)
    }
  }, [currentIndex, playIndex])

  const next = useCallback(() => {
    if (currentIndex === null) return
    const ni = currentIndex + 1
    if (ni < playable.length) playIndex(ni)
  }, [currentIndex, playIndex, playable.length])

  const prev = useCallback(() => {
    if (currentIndex === null) return
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    const pi = currentIndex - 1
    if (pi >= 0) playIndex(pi)
  }, [currentIndex, playIndex])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      if (scrubbing === null) setProgress(audio.currentTime)
    }
    const onLoaded = () => setDuration(audio.duration || 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      if (currentIndex !== null && currentIndex < playable.length - 1) {
        playIndex(currentIndex + 1)
      }
    }
    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("ended", onEnded)
    return () => {
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("ended", onEnded)
    }
  }, [currentIndex, playIndex, playable.length, scrubbing])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.muted = muted
  }, [muted])

  const seekTo = (value: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setProgress(value)
  }

  return (
    <div className="relative flex min-h-svh flex-col">
      {/* Page-level ambient cover wash */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[60svh] overflow-hidden opacity-40 dark:opacity-25"
      >
        <Image
          src={COVER_SRC}
          alt=""
          fill
          priority
          className="scale-110 object-cover blur-[80px] saturate-150"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      <main className="relative flex-1 px-6 pt-16 pb-40 sm:px-10 md:px-16 md:pt-24 lg:px-20">
        <div className="mx-auto w-full max-w-3xl">
          <AlbumHero
            isPlaying={isPlaying && currentIndex !== null}
            onPlayAll={playFirst}
            totalRuntime={formatTotalRuntime(totalDuration)}
          />

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={transition(0.7)}
            className="mt-12"
          >
            <TrackList
              tracks={TRACKS}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onToggle={togglePlayTrack}
            />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={transition(0.95)}
            className="mt-16"
          >
            <Credits />
          </motion.div>
        </div>
      </main>

      <audio ref={audioRef} preload="metadata" />

      <AnimatePresence>
        {currentTrack && (
          <PlayerBar
            track={currentTrack}
            isPlaying={isPlaying}
            progress={scrubbing ?? progress}
            duration={duration || currentTrack.duration || 0}
            muted={muted}
            onToggle={() => playIndex(currentIndex ?? 0)}
            onPrev={prev}
            onNext={next}
            onSeek={seekTo}
            onScrub={setScrubbing}
            onToggleMute={() => setMuted((m) => !m)}
            hasPrev={(currentIndex ?? 0) > 0}
            hasNext={(currentIndex ?? 0) < playable.length - 1}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ───────────────────────── Hero ───────────────────────── */

function AlbumHero({
  isPlaying,
  onPlayAll,
  totalRuntime,
}: {
  isPlaying: boolean
  onPlayAll: () => void
  totalRuntime: string
}) {
  return (
    <section className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center md:gap-10">
      {/* Cover */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={transition(0)}
        className="relative mx-auto w-[280px] shrink-0 sm:w-[320px] md:mx-0 md:w-[340px] lg:w-[360px]"
      >
        <div className="absolute -inset-6 -z-10 rounded-[28px] bg-amber-500/10 blur-3xl dark:bg-amber-500/20" />
        <div className="relative aspect-square overflow-hidden rounded-2xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/10 dark:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] dark:ring-white/10">
          <Image
            src={COVER_SRC}
            alt={`${ALBUM_TITLE_LATIN} cover`}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 80vw, 360px"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_30%,transparent_60%,rgba(0,0,0,0.18))]"
          />
        </div>
      </motion.div>

      {/* Meta */}
      <div className="flex flex-col justify-center gap-3">
        <div className="flex flex-col gap-0.5">
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={transition(0.12)}
            className="font-serif text-[2rem] leading-[1.05] sm:text-[2.4rem] md:text-[2.6rem]"
          >
            {ALBUM_TITLE_GREEK}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={transition(0.2)}
            className="text-base text-muted-foreground sm:text-lg"
          >
            {ALBUM_TITLE_LATIN}
          </motion.p>
        </div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={transition(0.28)}
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground"
        >
          <span>{ALBUM_GENRE}</span>
          <Dot />
          <span>{ALBUM_YEAR}</span>
          <Dot />
          <span>6 tracks · {totalRuntime}</span>
        </motion.div>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={transition(0.36)}
          className="max-w-prose text-sm leading-relaxed text-muted-foreground"
        >
          A small, mostly silent record made between bedrooms and basements —
          half love letter, half inside joke.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={transition(0.46)}
          className="mt-1 flex flex-wrap items-center gap-3"
        >
          <button
            type="button"
            onClick={onPlayAll}
            className="group inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-all hover:gap-3 hover:opacity-90"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
            <span>{isPlaying ? "Pause" : "Play album"}</span>
          </button>
          <DownloadAllButton />
        </motion.div>
      </div>
    </section>
  )
}

function DownloadAllButton() {
  // Sequentially trigger downloads for each playable track.
  const downloadAll = useCallback(() => {
    const playable = TRACKS.filter((t) => t.file)
    playable.forEach((track, i) => {
      setTimeout(() => {
        if (!track.file) return
        const a = document.createElement("a")
        a.href = track.file
        const ext = track.file.split(".").pop()
        a.download = `${String(track.n).padStart(2, "0")} ${track.title}.${ext}`
        document.body.appendChild(a)
        a.click()
        a.remove()
      }, i * 350)
    })
  }, [])

  return (
    <button
      type="button"
      onClick={downloadAll}
      className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <DownloadIcon />
      Download all
    </button>
  )
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/50">
      ·
    </span>
  )
}

/* ───────────────────────── Track list ───────────────────────── */

function TrackList({
  tracks,
  currentTrack,
  isPlaying,
  onToggle,
}: {
  tracks: Track[]
  currentTrack: Track | null
  isPlaying: boolean
  onToggle: (track: Track) => void
}) {
  return (
    <ol className="flex flex-col">
      {tracks.map((track) => {
        const active = currentTrack?.n === track.n
        return (
          <TrackRow
            key={track.n}
            track={track}
            active={active}
            isPlaying={active && isPlaying}
            onToggle={onToggle}
          />
        )
      })}
    </ol>
  )
}

function TrackRow({
  track,
  active,
  isPlaying,
  onToggle,
}: {
  track: Track
  active: boolean
  isPlaying: boolean
  onToggle: (track: Track) => void
}) {
  const locked = track.locked
  return (
    <li
      className={cn(
        "group relative grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-border/60 py-3.5 pr-2 pl-1 transition-colors first:border-t sm:pr-4",
        locked
          ? "text-muted-foreground/60"
          : "text-foreground hover:bg-muted/40"
      )}
    >
      {/* Number / playing indicator / play button */}
      <div className="flex items-center justify-center">
        {locked ? (
          <span className="font-mono text-xs text-muted-foreground/60">
            {String(track.n).padStart(2, "0")}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onToggle(track)}
            className="relative flex size-5 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label={
              isPlaying ? `Pause ${track.title}` : `Play ${track.title}`
            }
          >
            <span
              className={cn(
                "font-mono text-xs transition-opacity",
                "group-hover:opacity-0",
                active && "opacity-0"
              )}
            >
              {String(track.n).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center opacity-0 transition-opacity",
                "group-hover:opacity-100",
                active && "opacity-100"
              )}
            >
              {isPlaying ? <BarsIcon animated /> : <PlayIcon size={12} />}
            </span>
          </button>
        )}
      </div>

      {/* Title */}
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "truncate text-[15px]",
            active && "font-medium text-amber-700 dark:text-amber-400"
          )}
        >
          {track.title}
        </span>
      </div>

      {/* Right-side actions + duration */}
      <div className="flex items-center gap-4">
        {!locked && track.file && (
          <a
            href={track.file}
            download={`${String(track.n).padStart(2, "0")} ${track.title}.${track.file.split(".").pop()}`}
            className="text-muted-foreground/70 opacity-0 transition-all group-hover:opacity-100 hover:text-foreground focus:opacity-100"
            aria-label={`Download ${track.title}`}
            onClick={(e) => e.stopPropagation()}
          >
            <DownloadIcon />
          </a>
        )}
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {track.duration ? formatTime(track.duration) : "—:—"}
        </span>
      </div>
    </li>
  )
}

/* ───────────────────────── Credits ───────────────────────── */

function Credits() {
  const PEOPLE = "Lupo Lucio Battisti and Little Tonio Cartionio"
  return (
    <section className="border-t border-border/60 pt-8">
      <h2 className="text-lg font-medium">Credits</h2>
      <dl className="mt-6 grid grid-cols-1 gap-x-10 gap-y-4 text-sm sm:grid-cols-2">
        <Credit label="Written and Performed by" value={PEOPLE} />
        <Credit label="Produced by" value={PEOPLE} />
        <Credit label="Cover art" value={PEOPLE} />
        <Credit label="Recorded" value="Roma and Athens · 2024–2025" />
      </dl>
    </section>
  )
}

function Credit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt
        className="text-[10px] tracking-[0.22em] text-muted-foreground/80 uppercase"
        dangerouslySetInnerHTML={{ __html: label }}
      />
      <dd className="text-foreground">{value}</dd>
    </div>
  )
}

/* ───────────────────────── Sticky player ───────────────────────── */

function PlayerBar({
  track,
  isPlaying,
  progress,
  duration,
  muted,
  onToggle,
  onPrev,
  onNext,
  onSeek,
  onScrub,
  onToggleMute,
  hasPrev,
  hasNext,
}: {
  track: Track
  isPlaying: boolean
  progress: number
  duration: number
  muted: boolean
  onToggle: () => void
  onPrev: () => void
  onNext: () => void
  onSeek: (value: number) => void
  onScrub: (value: number | null) => void
  onToggleMute: () => void
  hasPrev: boolean
  hasNext: boolean
}) {
  const pct = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ duration: 0.4, ease }}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-2 pr-3 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] backdrop-blur-xl dark:bg-background/60 dark:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
        {/* thumb */}
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/10 dark:ring-white/10">
          <Image
            src={COVER_SRC}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        </div>

        {/* title + scrub */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] leading-tight font-medium">
                {track.title}
              </p>
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                {ALBUM_TITLE_LATIN}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <PlayerIconButton
                onClick={onPrev}
                disabled={!hasPrev}
                ariaLabel="Previous"
              >
                <PrevIcon />
              </PlayerIconButton>
              <button
                type="button"
                onClick={onToggle}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex size-9 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95"
              >
                {isPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
              </button>
              <PlayerIconButton
                onClick={onNext}
                disabled={!hasNext}
                ariaLabel="Next"
              >
                <NextIcon />
              </PlayerIconButton>
              <PlayerIconButton onClick={onToggleMute} ariaLabel="Mute">
                {muted ? <MuteIcon /> : <VolumeIcon />}
              </PlayerIconButton>
            </div>
          </div>
          <Scrubber
            pct={pct}
            duration={duration}
            progress={progress}
            onSeek={onSeek}
            onScrub={onScrub}
          />
        </div>
      </div>
    </motion.div>
  )
}

function PlayerIconButton({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

function Scrubber({
  pct,
  duration,
  progress,
  onSeek,
  onScrub,
}: {
  pct: number
  duration: number
  progress: number
  onSeek: (value: number) => void
  onScrub: (value: number | null) => void
}) {
  const trackRef = useRef<HTMLDivElement | null>(null)

  const valueFromEvent = (clientX: number) => {
    const el = trackRef.current
    if (!el || duration <= 0) return 0
    const rect = el.getBoundingClientRect()
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
    return (x / rect.width) * duration
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-muted-foreground/80 tabular-nums">
        {formatTime(progress || 0)}
      </span>
      <div
        ref={trackRef}
        className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-muted"
        onPointerDown={(e) => {
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          const v = valueFromEvent(e.clientX)
          onScrub(v)
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0) return
          const v = valueFromEvent(e.clientX)
          onScrub(v)
        }}
        onPointerUp={(e) => {
          const v = valueFromEvent(e.clientX)
          onSeek(v)
          onScrub(null)
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-foreground"
          style={
            { width: `${Math.min(100, Math.max(0, pct))}%` } as CSSProperties
          }
        />
        <div
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground opacity-0 shadow ring-2 ring-background transition-opacity group-hover:opacity-100"
          style={
            { left: `${Math.min(100, Math.max(0, pct))}%` } as CSSProperties
          }
        />
      </div>
      <span className="font-mono text-[10px] text-muted-foreground/80 tabular-nums">
        {formatTime(duration || 0)}
      </span>
    </div>
  )
}

/* ───────────────────────── Icons ───────────────────────── */

function PlayIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M7 4.5a1 1 0 0 1 1.5-.866l11 6.5a1 1 0 0 1 0 1.732l-11 6.5A1 1 0 0 1 7 17.5v-13Z" />
    </svg>
  )
}

function PauseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </svg>
  )
}

function PrevIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5a1 1 0 0 1 2 0v6.382l9.553-5.276A1 1 0 0 1 19 7v10a1 1 0 0 1-1.447.894L8 12.618V19a1 1 0 0 1-2 0V5Z" />
    </svg>
  )
}

function NextIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 5a1 1 0 0 0-2 0v6.382L6.447 6.106A1 1 0 0 0 5 7v10a1 1 0 0 0 1.447.894L16 12.618V19a1 1 0 0 0 2 0V5Z" />
    </svg>
  )
}

function VolumeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  )
}

function MuteIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="m17 9 5 6M22 9l-5 6" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4v12" />
      <path d="m6 10 6 6 6-6" />
      <path d="M5 20h14" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function BarsIcon({ animated = false }: { animated?: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "block w-[2px] rounded-sm bg-amber-700 dark:bg-amber-400",
            animated ? "animate-eq" : ""
          )}
          style={
            {
              animationDelay: `${i * 120}ms`,
              height: animated ? undefined : "60%",
            } as CSSProperties
          }
        />
      ))}
      <style>{`
        @keyframes eq {
          0%, 100% { height: 25%; }
          50% { height: 100%; }
        }
        .animate-eq {
          animation: eq 900ms ease-in-out infinite;
          height: 60%;
        }
      `}</style>
    </span>
  )
}
