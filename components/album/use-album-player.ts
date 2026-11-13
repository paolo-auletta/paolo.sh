"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { TRACKS, type Track } from "./data"

const PLAYABLE = TRACKS.filter((t) => t.file)

/**
 * One audio element for the whole album. Plays tracks in order, skips the
 * locked one, and exposes just enough state for the different layouts.
 */
export function useAlbumPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [current, setCurrent] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const currentRef = useRef<Track | null>(null)

  const load = useCallback((track: Track) => {
    currentRef.current = track
    const audio = audioRef.current
    if (!audio || !track.file) return
    audio.src = track.file
    audio.currentTime = 0
    setProgress(0)
    setDuration(track.duration ?? 0)
    setCurrent(track)
    audio.play().catch(() => undefined)
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = "metadata"
    audioRef.current = audio
    const onTime = () => setProgress(audio.currentTime)
    const onMeta = () => setDuration(audio.duration || 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      const at = PLAYABLE.findIndex((t) => t.n === currentRef.current?.n)
      const next = PLAYABLE[at + 1]
      if (next) load(next)
      else setIsPlaying(false)
    }
    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("loadedmetadata", onMeta)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("ended", onEnded)
    return () => {
      audio.pause()
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("loadedmetadata", onMeta)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("ended", onEnded)
      audioRef.current = null
    }
  }, [load])

  /** Play a track, or pause/resume it if it's already the current one. */
  const toggleTrack = useCallback(
    (track: Track) => {
      const audio = audioRef.current
      if (!audio || !track.file) return
      if (currentRef.current?.n === track.n) {
        if (audio.paused) audio.play().catch(() => undefined)
        else audio.pause()
        return
      }
      load(track)
    },
    [load]
  )

  /** The big play button: resume, or start from the top. */
  const toggle = useCallback(() => {
    toggleTrack(currentRef.current ?? PLAYABLE[0])
  }, [toggleTrack])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (audioRef.current) audioRef.current.muted = !m
      return !m
    })
  }, [])

  // Space toggles playback, as on the current page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t instanceof Element && t.closest("input, textarea, select, button, a, [contenteditable='true']")) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [toggle])

  return {
    current,
    isPlaying,
    progress,
    duration: duration || current?.duration || 0,
    muted,
    toggle,
    toggleTrack,
    toggleMute,
  }
}

export type AlbumPlayer = ReturnType<typeof useAlbumPlayer>
