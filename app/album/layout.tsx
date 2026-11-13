import { Albert_Sans, Commissioner, Marcellus } from "next/font/google"

import "@/components/album/athens.css"
import { cn } from "@/lib/utils"

// Marcellus stands in for Albertus Nova (commercial).
const display = Marcellus({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  // No generated Arial fallback, or it would catch the Greek letters
  // before they ever reach Commissioner.
  adjustFontFallback: false,
  variable: "--font-athens-display",
})

// Marcellus has no Greek, so Greek letters fall through to Commissioner with
// its flared terminals turned all the way up, which sits close to Albertus.
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

export default function AlbumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("athens", greek.variable, display.variable, ui.variable)}>
      {children}
    </div>
  )
}
