import type { Metadata } from "next"

import { Album } from "@/components/album"

export const metadata: Metadata = {
  title: "άλμπουμ σιωπηλός (Album Silente) — Sellas",
  description:
    "A small, mostly silent record by Sellas. Listen, download, and read the credits.",
}

export default function AlbumPage() {
  return <Album />
}
