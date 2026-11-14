import "./miky.css"
import { pageMetadata } from "@/lib/metadata"

// The type and the columns are the album's (app/(athens)/layout.tsx).
export const metadata = pageMetadata({
  title: "Μιχαήλ (Michail) — Sellas",
  absoluteTitle: true,
  description: "Michail, also Miky, Poseidone, The Greek, and Sellas.",
  path: "/miky",
  image: {
    url: "/og/miky.jpg",
    width: 900,
    height: 900,
    alt: "Portrait of Michail",
    type: "image/jpeg",
  },
})

export default function MikyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
