/**
 * An invisible copy of the homepage copy, laid out with the homepage's own
 * spacing, so the Music and Movies pages start exactly where the homepage
 * text does. Keep it in sync with app/page.tsx.
 */
export function HomePagePositionAnchor() {
  return (
    <div className="relative flex flex-col gap-4">
      <div className="relative h-24 w-24 overflow-hidden sm:h-26 sm:w-26 lg:absolute lg:top-1 lg:right-[calc(100%+1.5rem)]" />
      <div className="flex flex-col gap-2 leading-relaxed">
        <h1 className="flex items-center gap-1.5">
          <span className="font-medium">
            <span className="text-muted-foreground">Ciao, I&apos;m </span>
            <span>Paolo</span>
          </span>
        </h1>
        <p className="text-muted-foreground">
          I&apos;m a 19 y/o{" "}
          <span className="text-foreground">software engineer</span> who cares
          about craft and detail. Now I&apos;m bringing that to{" "}
          <span className="font-medium">AI research</span>, especially{" "}
          <span className="whitespace-nowrap text-foreground">
            mechanistic interpretability
          </span>{" "}
          and{" "}
          <span className="whitespace-nowrap text-foreground">
            automated research
          </span>
          .
        </p>
        <p className="items-center text-muted-foreground">
          Currently, I&apos;m doing research at{" "}
          <span className="inline font-medium whitespace-nowrap text-primary">
            <span className="mr-1 mb-0.5 inline-block h-[1.05em] w-[0.88em] align-middle" />
            Sapienza
          </span>{" "}
          and managing{" "}
          <span className="inline font-medium whitespace-nowrap text-primary">
            <span className="mx-1 mb-1 inline-block h-[0.9em] w-[0.9em] align-middle" />
            BAINSA
          </span>
          . <br /> Recently, I&apos;ve also been listening to{" "}
          <span className="font-medium text-primary">Graduation</span>, and
          watching <span className="font-medium text-primary">Obsession</span>.
        </p>
      </div>
      <p className="items-center text-muted-foreground">
        You can check out my{" "}
        <span className="font-medium whitespace-nowrap">personal projects</span>{" "}
        and <span className="font-medium whitespace-nowrap">research</span>. You
        can reach me on{" "}
        <span className="inline font-medium whitespace-nowrap text-primary">
          <span className="mr-1 mb-1 inline-block h-[1em] w-[1em] align-middle" />
          LinkedIn
        </span>{" "}
        or via{" "}
        <span className="inline font-medium whitespace-nowrap text-primary">
          <span className="mr-1 mb-0.5 inline-block size-4 align-middle" />
          email
        </span>
        .
      </p>
    </div>
  )
}
