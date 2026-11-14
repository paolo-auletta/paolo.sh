import { Albert_Sans, Commissioner, Marcellus } from "next/font/google"

import "@/components/album/athens.css"
import { ReliefCanvas } from "@/components/album/relief-canvas"
import { cn } from "@/lib/utils"

/*
 * The stone /album and /miky stand on: the album's type, and the two columns
 * pinned to the window's edges. It is shared, so going from one page to the
 * other only swaps what is between the columns; they stay up, polished
 * where they were polished.
 */

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

export default function AthensLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={cn("athens", greek.variable, display.variable, ui.variable)}
    >
      <div className="l2">
        <aside className="cell l2-pillar">
          <ReliefCanvas
            name="column-l"
            place="pillar-left"
            alt="Plaster Ionic column under the sun"
          />
        </aside>
        {children}
        <aside className="cell l2-pillar">
          <ReliefCanvas
            name="column-r"
            place="pillar-right"
            alt="Plaster Ionic column under the moon"
          />
        </aside>
      </div>
    </div>
  )
}
