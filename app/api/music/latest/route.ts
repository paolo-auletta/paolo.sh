import { NextResponse } from "next/server"

import { getLatestRawMusicRecap } from "@/lib/music"

export const fetchCache = "force-cache"
export const revalidate = false

export async function GET() {
  const recap = getLatestRawMusicRecap()

  return NextResponse.json({
    album: recap.albums[0]?.title ?? "Graduation",
  })
}
