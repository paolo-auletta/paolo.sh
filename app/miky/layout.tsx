import { Albert_Sans, Commissioner, Marcellus } from "next/font/google"

import "@/components/album/athens.css"
import "./miky.css"
import { pageMetadata } from "@/lib/metadata"
import { cn } from "@/lib/utils"

// The album's type, so this page reads as part of it (see app/album/layout).
const display = Marcellus({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  adjustFontFallback: false,
  variable: "--font-athens-display",
})

const greek = Commissioner({
  subsets: ["greek"],
  axes: ["FLAR"],
  variable: "--font-athens-greek",
})

const ui = Albert_Sans({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-athens-ui",
})

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
  return (
    <div
      className={cn("athens", greek.variable, display.variable, ui.variable)}
    >
      {children}
    </div>
  )
}
