import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Mute",
  description:
    "A Chrome extension that hides what you describe in a sentence, on every site.",
}

export default function MuteLayout({ children }: { children: ReactNode }) {
  return children
}
