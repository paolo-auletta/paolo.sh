import { TextShimmer } from "@/components/motion-primitives/text-shimmer"
import Image from "next/image"
import Link from "next/link"

export default function Page() {
  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col items-center justify-center">
        <section className="px-6 sm:px-10 md:px-16 lg:px-20">
          <div className="flex max-w-lg flex-col gap-8 text-base">
            <div className="flex flex-col gap-4">
              <h1 className="flex items-center gap-1.5 leading-relaxed">
                <span className="font-medium">
                  <span className="text-muted-foreground">Ciao, I'm </span>
                  <span>Paolo</span>
                </span>
              </h1>
              <div className="flex flex-col gap-2 leading-relaxed">
                <p className="text-muted-foreground">
                  I'm a 19 y/o{" "}
                  <span className="text-foreground"> software developer </span>{" "}
                  and{" "}
                  <a
                    href="https://www.unibocconi.it/en/programs/bachelor-science/economics-management-and-computer-science"
                    className="text-foreground"
                  >
                    {" "}
                    bachelor student{" "}
                  </a>
                  . I care deeply about craft, detail, and the{" "}
                  <span className="bg-[linear-gradient(180deg,oklch(0.7012_0.0685_231.14),oklch(0.4303_0.1342_260.26))] bg-clip-text pr-1 font-caveat text-xl leading-0 font-bold whitespace-nowrap text-transparent">
                    {" "}
                    little things
                  </span>{" "}
                  that make a{" "}
                  <span className="font-serif leading-0 text-foreground">
                    {" "}
                    difference
                  </span>{" "}
                  – I like to make people feel something through my work.
                </p>
                <p className="items-center text-muted-foreground">
                  <span>I'm currently interning at </span>
                  <a
                    href="https://datapizza.tech/en/dualintelligence"
                    className="inline cursor-pointer font-medium whitespace-nowrap text-primary underline decoration-muted-foreground/25 decoration-1 underline-offset-3 transition-all hover:decoration-muted-foreground"
                  >
                    <Image
                      src="/datapizza.png"
                      width={1200}
                      height={1200}
                      alt="DataPizza"
                      className="mr-1 mb-1 inline h-[0.9em] w-auto align-middle brightness-0"
                    />
                    DataPizza
                  </a>{" "}
                  <span>
                    as a SWE, focusing on building
                    <TextShimmer
                      duration={2}
                      className="[--base-color:var(--muted-foreground)]"
                    >
                      frontier AI-solutions
                    </TextShimmer>{" "}
                    for companies. I'm also member of{" "}
                  </span>
                  <a
                    href="https://www.bainsa.xyz/"
                    className="inline cursor-pointer font-medium whitespace-nowrap text-primary underline decoration-muted-foreground/25 decoration-1 underline-offset-3 transition-all hover:decoration-muted-foreground"
                  >
                    <svg
                      viewBox="0 0 51 51"
                      className="mr-1 mb-1 inline h-[0.9em] w-auto align-middle"
                      aria-hidden="true"
                      fill="currentColor"
                    >
                      {/* <path d="M 7.011 0.42 L 16.221 0.42 C 16.481 0.42 16.701 0.62 16.701 0.87 L 16.701 4.43 C 16.701 4.68 16.491 4.88 16.221 4.88 L 6.521 4.88 C 5.991 4.88 5.571 5.29 5.571 5.78 L 5.571 14.85 C 5.571 15.1 5.361 15.3 5.091 15.3 L 1.261 15.3 C 1.001 15.3 0.781 15.1 0.781 14.85 L 0.781 6.23 C 0.781 5.49 1.421 4.89 2.211 4.89 L 4.611 4.89 C 5.141 4.89 5.561 4.49 5.561 4 L 5.561 1.76 C 5.561 1.02 6.211 0.43 7.001 0.43 Z" />
                      <path d="M 44.569 50.419 L 35.359 50.419 C 35.099 50.419 34.879 50.219 34.879 49.969 L 34.879 46.409 C 34.879 46.159 35.089 45.959 35.359 45.959 L 45.059 45.959 C 45.589 45.959 46.009 45.549 46.009 45.059 L 46.009 35.989 C 46.009 35.739 46.219 35.539 46.489 35.539 L 50.319 35.539 C 50.579 35.539 50.799 35.739 50.799 35.989 L 50.799 44.609 C 50.799 45.349 50.159 45.949 49.369 45.949 L 46.969 45.949 C 46.439 45.949 46.019 46.349 46.019 46.839 L 46.019 49.079 C 46.019 49.819 45.369 50.409 44.579 50.409 Z" />
                      <path d="M 16.491 37.159 C 16.491 37.489 16.75 37.749 17.081 37.749 L 26.53 37.749 C 29.37 37.749 31.381 37.349 32.681 36.609 C 33.98 35.869 34.541 34.679 34.541 32.969 C 34.541 29.279 32.3 27.659 27.221 27.659 L 17.851 27.659 C 17.101 27.659 16.48 28.269 16.48 29.029 L 16.48 37.169 Z M 16.491 26.279 L 16.491 24.909 C 16.491 24.149 15.87 23.529 15.111 23.529 L 12.71 23.529 C 12.171 23.529 11.73 23.089 11.73 22.549 L 11.73 11.339 C 11.73 10.799 12.171 10.359 12.71 10.359 L 28.11 10.359 C 34.681 10.359 38.321 13.209 38.321 18.349 C 38.321 20.869 37.261 23.189 34.3 24.779 C 33.91 24.989 33.961 25.539 34.38 25.679 C 38.141 26.909 39.581 29.679 39.581 32.839 C 39.581 39.119 35.8 41.819 27.651 41.819 L 12.72 41.819 C 12.181 41.819 11.741 41.379 11.741 40.839 L 11.741 28.639 C 11.741 28.099 12.181 27.659 12.72 27.659 L 15.12 27.659 C 15.88 27.659 16.5 27.039 16.5 26.279 Z M 16.491 22.159 C 16.491 22.909 17.101 23.529 17.861 23.529 L 26.111 23.529 C 28.861 23.529 30.771 23.179 31.891 22.479 C 33.011 21.779 33.571 20.589 33.571 18.919 C 33.571 15.709 31.661 14.349 27.141 14.349 L 17.081 14.349 C 16.751 14.349 16.491 14.609 16.491 14.939 Z" /> */}
                      <path d="M 30.271 22.42 L 42.161 22.42 C 42.511 22.42 42.781 22.7 42.781 23.04 L 42.781 27.9 C 42.781 28.24 42.501 28.52 42.161 28.52 L 29.761 28.52 C 29.071 28.53 28.511 29.09 28.511 29.78 L 28.511 42.18 C 28.511 42.53 28.231 42.8 27.891 42.8 L 23.011 42.8 C 22.661 42.8 22.391 42.52 22.391 42.18 L 22.391 30.28 C 22.391 29.31 23.171 28.53 24.141 28.53 L 27.281 28.53 C 27.971 28.53 28.531 27.97 28.531 27.28 L 28.531 24.15 C 28.541 23.19 29.321 22.41 30.291 22.41 Z"></path>
                      <path d="M 20.611 28.55 L 8.722 28.55 C 8.372 28.55 8.102 28.27 8.102 27.93 L 8.102 23.07 C 8.102 22.73 8.382 22.45 8.722 22.45 L 21.122 22.45 C 21.812 22.44 22.372 21.88 22.372 21.19 L 22.372 8.79 C 22.372 8.44 22.651 8.17 22.991 8.17 L 27.872 8.17 C 28.222 8.17 28.491 8.45 28.491 8.79 L 28.491 20.69 C 28.491 21.66 27.712 22.44 26.741 22.44 L 23.602 22.44 C 22.912 22.44 22.352 23 22.352 23.69 L 22.352 26.82 C 22.342 27.78 21.562 28.56 20.592 28.56 Z"></path>
                      <path d="M 0.43 42.59 L 0.43 30.71 C 0.43 30.36 0.71 30.09 1.05 30.09 L 5.91 30.09 C 6.25 30.09 6.53 30.37 6.53 30.71 L 6.53 43.1 C 6.54 43.79 7.1 44.35 7.79 44.35 L 20.2 44.35 C 20.55 44.35 20.82 44.63 20.82 44.97 L 20.82 49.85 C 20.82 50.2 20.54 50.47 20.2 50.47 L 8.29 50.47 C 7.32 50.47 6.54 49.69 6.54 48.72 L 6.54 45.58 C 6.54 44.89 5.98 44.33 5.29 44.33 L 2.15 44.33 C 1.19 44.32 0.41 43.54 0.41 42.57 Z"></path>
                      <path d="M 42.541 50.46 L 30.651 50.46 C 30.301 50.46 30.031 50.18 30.031 49.84 L 30.031 44.98 C 30.031 44.64 30.311 44.36 30.651 44.36 L 43.051 44.36 C 43.741 44.35 44.301 43.79 44.301 43.1 L 44.301 30.7 C 44.301 30.35 44.581 30.08 44.921 30.08 L 49.801 30.08 C 50.151 30.08 50.421 30.36 50.421 30.7 L 50.421 42.6 C 50.421 43.57 49.641 44.35 48.671 44.35 L 45.531 44.35 C 44.841 44.35 44.281 44.91 44.281 45.6 L 44.281 48.73 C 44.271 49.69 43.491 50.47 42.521 50.47 Z"></path>
                      <path d="M 0.43 8.38 L 0.43 20.26 C 0.43 20.61 0.71 20.88 1.05 20.88 L 5.91 20.88 C 6.25 20.88 6.53 20.6 6.53 20.26 L 6.53 7.87 C 6.54 7.18 7.1 6.62 7.79 6.62 L 20.2 6.62 C 20.55 6.62 20.82 6.34 20.82 6 L 20.82 1.12 C 20.82 0.77 20.54 0.5 20.2 0.5 L 8.29 0.5 C 7.32 0.5 6.54 1.28 6.54 2.25 L 6.54 5.39 C 6.54 6.08 5.98 6.64 5.29 6.64 L 2.15 6.64 C 1.19 6.65 0.41 7.43 0.41 8.4 Z"></path>
                      <path d="M 42.541 0.49 L 30.651 0.49 C 30.301 0.49 30.031 0.77 30.031 1.11 L 30.031 5.97 C 30.031 6.31 30.311 6.591 30.651 6.591 L 43.051 6.591 C 43.741 6.601 44.301 7.16 44.301 7.85 L 44.301 20.25 C 44.301 20.601 44.581 20.87 44.921 20.87 L 49.801 20.87 C 50.151 20.87 50.421 20.59 50.421 20.25 L 50.421 8.35 C 50.421 7.38 49.641 6.6 48.671 6.6 L 45.531 6.6 C 44.841 6.6 44.281 6.04 44.281 5.35 L 44.281 2.22 C 44.271 1.26 43.491 0.48 42.521 0.48 Z"></path>
                    </svg>
                    BAINSA
                  </a>{" "}
                  , a Bocconi student association focused on AI and
                  Neuroscience, where I co-manage the Analysis Division.
                </p>
                <p className="items-center text-muted-foreground">
                  <span>Here you can checkout my </span>
                  <Link href="/projects">
                    <span className="inline cursor-pointer font-medium whitespace-nowrap text-primary underline decoration-muted-foreground/25 decoration-1 underline-offset-3 transition-all hover:decoration-muted-foreground">
                      projects
                    </span>
                  </Link>
                  <span>
                    . You can reach me on{" "}
                    <a
                      href="https://www.linkedin.com/in/paoloauletta/"
                      className="inline cursor-pointer font-medium whitespace-nowrap text-primary underline decoration-muted-foreground/25 decoration-1 underline-offset-3 transition-all hover:decoration-muted-foreground"
                    >
                      <Image
                        src="/linkedin.png"
                        width={1000}
                        height={1000}
                        alt="DataPizza"
                        className="mr-1 mb-1 inline h-[1em] w-auto align-middle"
                      />
                      LinkedIn
                    </a>{" "}
                    or via{" "}
                    <a
                      href="mailto:ciao@paolo.sh"
                      className="inline cursor-pointer font-medium whitespace-nowrap text-primary underline decoration-muted-foreground/25 decoration-1 underline-offset-3 transition-all hover:decoration-muted-foreground"
                    >
                      <svg
                        className="mr-1 mb-0.5 inline-block size-4 align-middle"
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M2.34086 6.38914C2.1622 6.8145 2.08371 7.26454 2.0442 7.74818C1.99998 8.28936 1.99999 8.95371 2 9.75867V14.2413C1.99999 15.0463 1.99998 15.7106 2.0442 16.2518C2.09012 16.8139 2.18868 17.3306 2.43598 17.816C2.81947 18.5686 3.43139 19.1805 4.18404 19.564C4.66938 19.8113 5.18608 19.9099 5.74818 19.9558C6.28936 20 6.95371 20 7.75866 20H16.2413C17.0462 20 17.7106 20 18.2518 19.9558C18.8139 19.9099 19.3306 19.8113 19.816 19.564C20.5686 19.1805 21.1805 18.5686 21.564 17.816C21.8113 17.3306 21.9099 16.8139 21.9558 16.2518C22 15.7106 22 15.0463 22 14.2413V9.75868C22 8.95372 22 8.28937 21.9558 7.74818C21.9163 7.26453 21.8378 6.81449 21.6591 6.38912L14.5329 12.2196C13.0595 13.4252 10.9405 13.4252 9.46703 12.2196L2.34086 6.38914Z" fill="currentColor" />
                        <path d="M20.4224 4.8169C20.233 4.67277 20.0302 4.54512 19.816 4.43598C19.3306 4.18868 18.8139 4.09012 18.2518 4.0442C17.7106 3.99998 17.0463 3.99999 16.2413 4H7.7587C6.95375 3.99999 6.28936 3.99998 5.74818 4.0442C5.18608 4.09012 4.66938 4.18868 4.18404 4.43598C3.96982 4.54512 3.76701 4.67278 3.57762 4.81691L10.7335 10.6717C11.4702 11.2745 12.5297 11.2745 13.2665 10.6717L20.4224 4.8169Z" fill="currentColor" />
                      </svg>
                      email
                    </a>
                    .
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
