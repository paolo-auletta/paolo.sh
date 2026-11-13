import type { ReactNode } from "react"

import { pageMetadata } from "@/lib/metadata"

export const metadata = pageMetadata({
  title: "mute",
  description:
    "A Chrome extension that hides what you describe in a sentence, on every site.",
  path: "/mute",
})

export default function MuteLayout({ children }: { children: ReactNode }) {
  return children
}
