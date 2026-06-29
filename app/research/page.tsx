import Link from "next/link"

export default function ResearchPage() {
  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col items-center [justify-content:safe_center] py-10 sm:py-14 md:py-16">
        <section className="w-full px-6 sm:px-10 md:px-16 lg:px-20">
          <div className="mx-auto flex max-w-xl flex-col gap-8 text-base">
            <div className="flex flex-col gap-3 leading-relaxed">
              <h1 className="text-xl font-medium text-foreground">
                Research
              </h1>
              <p className="text-muted-foreground">
                Notes, experiments, and research work will live here soon.
              </p>
            </div>
            <Link
              href="/"
              className="w-fit text-sm font-medium text-muted-foreground underline decoration-muted-foreground/35 decoration-1 underline-offset-3 transition-colors hover:text-foreground hover:decoration-foreground/50"
            >
              Back
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
