import { NextResponse } from "next/server"

import {
  FALLBACK_MOVIE_TITLE,
  getLatestLikedRatedLetterboxdMovie,
} from "@/lib/letterboxd"

export const revalidate = 3600

export async function GET() {
  const movie = await getLatestLikedRatedLetterboxdMovie()

  return NextResponse.json({
    posterUrl: movie?.posterUrl,
    title: movie?.title ?? FALLBACK_MOVIE_TITLE,
  })
}
