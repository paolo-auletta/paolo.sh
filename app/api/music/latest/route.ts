import { NextResponse } from "next/server"

import { getLatestRawMusicRecap } from "@/lib/music"

export const revalidate = 3600

export async function GET() {
  const recap = getLatestRawMusicRecap()

  return NextResponse.json({
    album: recap.albums[0]?.title ?? "Graduation",
  })
}
