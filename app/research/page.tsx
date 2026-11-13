import { ResearchCopy } from "@/components/research-copy"
import { pageMetadata } from "@/lib/metadata"

export const metadata = pageMetadata({
  title: "Research",
  description:
    "Notes, experiments, and research work on AI, mostly mechanistic interpretability and automated research. Coming soon.",
  path: "/research",
})

export default function ResearchPage() {
  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col items-center [justify-content:safe_center] py-10 sm:py-14 md:py-16">
        <section className="w-full px-6 sm:px-10 md:px-16 lg:px-20">
          <ResearchCopy />
        </section>
      </div>
    </div>
  )
}
