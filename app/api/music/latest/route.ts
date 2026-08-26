import { NextResponse } from "next/server"

import { getLatestMusicRecap } from "@/lib/music"

export const fetchCache = "force-cache"
export const revalidate = false

export async function GET() {
  const recap = await getLatestMusicRecap()
  const album = recap.albums[0]

  return NextResponse.json({
    album: album?.title ?? "Graduation",
    artist: album?.artist,
    artworkUrl: album?.artworkUrl,
  })
}
