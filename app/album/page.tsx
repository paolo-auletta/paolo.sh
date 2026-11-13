import type { Metadata } from "next"

import { AlbumPage } from "@/components/album/album-page"

export const metadata: Metadata = {
  title: "άλμπουμ σιωπηλός (Album Silente) — Sellas",
  description:
    "A small, mostly silent record by Sellas. Listen, download, and read the credits.",
}

export default function Page() {
  return <AlbumPage />
}
