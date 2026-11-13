import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/metadata"

/** The pages reachable from the homepage; /album and /miky stay unlisted. */
const PAGES = [
  "/",
  "/research",
  "/projects",
  "/music",
  "/music/all",
  "/movies",
  "/mute",
  "/mute/privacy",
]

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({ url: `${SITE_URL}${path}` }))
}
