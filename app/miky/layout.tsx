import type { Metadata } from "next"
import { Albert_Sans, Commissioner, Marcellus } from "next/font/google"

import "@/components/album/athens.css"
import "./miky.css"
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

export const metadata: Metadata = {
  title: "Μιχαήλ (Michail) — Sellas",
  description: "Michail, also Miky, Poseidone, The Greek, and Sellas.",
}

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
