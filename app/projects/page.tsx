import Link from "next/link"

const linkClassName =
  "w-fit font-medium text-primary underline decoration-muted-foreground/25 decoration-1 underline-offset-3 transition-all hover:decoration-muted-foreground"

export default function ProjectsPage() {
  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col items-center [justify-content:safe_center] py-10 sm:py-14 md:py-16">
        <section className="w-full px-6 sm:px-10 md:px-16 lg:px-20">
          <div className="mx-auto flex max-w-xl flex-col gap-8 text-base">
            <div className="flex flex-col gap-3 leading-relaxed">
              <h1 className="text-xl font-medium text-foreground">Projects</h1>
              <p className="text-muted-foreground">
                What I am building right now.
              </p>
            </div>
            <div className="flex flex-col gap-3 leading-relaxed">
              <a
                href="https://better-skills.dev"
                target="_blank"
                rel="noreferrer"
                className={linkClassName}
              >
                Better Skills
              </a>
              <Link href="/mute" className={linkClassName}>
                Mute
              </Link>
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
