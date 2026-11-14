import { AlbumPage } from "@/components/album/album-page"
import { pageMetadata } from "@/lib/metadata"

const cover = {
  url: "/album/cover.jpg",
  width: 1246,
  height: 1246,
  alt: "Cover of Album Silente by Sellas",
  type: "image/jpeg",
}

export const metadata = pageMetadata({
  title: "άλμπουμ σιωπηλός (Album Silente) — Sellas",
  absoluteTitle: true,
  description:
    "A small, mostly silent record by Sellas. Listen, download, and read the credits.",
  path: "/album",
  image: cover,
})

export default function Page() {
  return <AlbumPage />
}
