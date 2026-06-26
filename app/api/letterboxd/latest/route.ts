import { NextResponse } from "next/server"

import { getLatestLikedRatedLetterboxdMovie } from "@/lib/letterboxd"

export const revalidate = 3600

export async function GET() {
  const movie = await getLatestLikedRatedLetterboxdMovie()

  return NextResponse.json({
    title: movie?.title ?? "Obsession",
  })
}
