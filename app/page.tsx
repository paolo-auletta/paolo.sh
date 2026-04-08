"use client"

import { TextShimmer } from "@/components/motion-primitives/text-shimmer"
import { motion } from "motion/react"
import Image from "next/image"
import Link from "next/link"

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(12px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
}

const transition = (delay: number) => ({
  duration: 1.3,
  delay,
  ease,
})

export default function Page() {
  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col items-center justify-center">
        <section className="px-6 sm:px-10 md:px-16 lg:px-20">
          <div className="flex max-w-lg flex-col gap-8 text-base">
            <div className="flex flex-col gap-4">
              <motion.h1
                className="flex items-center gap-1.5 leading-relaxed"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={transition(0)}
              >
                <span className="font-medium">
                  <span className="text-muted-foreground">Ciao, I'm </span>
                  <span>Paolo</span>
                </span>
              </motion.h1>
              <div className="flex flex-col gap-2 leading-relaxed">
                <motion.p
                  className="text-muted-foreground"
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  transition={transition(0.15)}
                >
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
                </motion.p>
                <motion.p
                  className="items-center text-muted-foreground"
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  transition={transition(0.3)}
                >
                  <span>I'm currently interning at </span>
                  <a
                    href="https://datapizza.tech/en/dualintelligence"
                    className="inline cursor-pointer font-medium whitespace-nowrap text-primary underline decoration-muted-foreground/25 decoration-1 underline-offset-3 transition-all hover:decoration-muted-foreground"
                  >
                    <svg
                      viewBox="0 0 210 210"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="DataPizza"
                      className="inline h-[1.1em] w-auto -translate-y-px fill-foreground align-middle"
                    >
                      <path d="M127.24 107.052L117.61 79.7398C117.243 78.6967 117.737 77.5226 118.747 77.0665C120.457 76.2894 122.197 75.5588 123.962 74.8788C124.195 74.7902 124.418 74.6972 124.651 74.6128C126.18 74.0384 127.721 73.5063 129.267 73.0164C130.331 72.6785 131.459 73.2487 131.83 74.3003L160.042 154.319L166.296 172.061C166.922 173.83 165.11 175.516 163.425 174.73L15.8926 105.937C14.8748 105.464 14.4229 104.256 14.8664 103.2C15.597 101.452 16.3657 99.7075 17.1681 97.9718C17.2737 97.7395 17.375 97.5072 17.4848 97.2707C18.4731 95.1464 19.512 93.0601 20.5805 91.0033C23.0004 86.3535 25.6231 81.8684 28.4316 77.5564C29.8675 75.3561 31.3541 73.2022 32.8829 71.0906C34.4329 68.9536 36.0293 66.8715 37.6721 64.8274C53.6826 44.94 73.9882 29.6686 96.4814 19.8114C98.8126 18.7936 101.161 17.8265 103.534 16.9269C105.266 16.2681 107.01 15.6388 108.763 15.0391C109.84 14.6717 111.001 15.2334 111.381 16.3061L115.82 28.8873L120.938 43.4027L125.314 55.8234C125.715 56.9552 125.09 58.2095 123.95 58.5812C122.476 59.0627 121.006 59.5737 119.541 60.1227C119.308 60.2114 119.089 60.3043 118.856 60.3888C116.47 61.301 114.126 62.2935 111.833 63.3577C97.2711 70.1277 84.5337 79.9426 74.326 92.1436C73.0928 93.6176 71.8934 95.1295 70.7362 96.671C70.0352 97.6044 68.7386 97.8071 67.8179 97.1229L58.9617 90.5219C58.0326 89.8293 57.8468 88.4863 58.5563 87.5403C59.705 86.0072 60.8875 84.5079 62.0996 83.034C73.7221 68.9029 88.2797 57.5211 104.957 49.6447C105.95 49.1759 106.427 48.0188 106.064 46.9883L102.348 36.4469C101.938 35.2898 100.637 34.745 99.5221 35.2602C80.1288 44.2558 63.2399 57.4536 49.8732 73.9159C48.2219 75.9473 46.617 78.0336 45.0755 80.1664C43.5467 82.2865 42.077 84.453 40.6538 86.6618C38.8251 89.5125 37.0851 92.4308 35.4465 95.4251C34.8552 96.5063 35.2817 97.8535 36.3756 98.3645L136.89 145.235C138.575 146.02 140.387 144.335 139.762 142.565L138.968 140.314L127.235 107.043L127.24 107.052Z" />
                    </svg>
                    DataPizza
                  </a>{" "}
                  <span>
                    as a SWE, focusing on building{" "}
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
                </motion.p>
                <motion.p
                  className="items-center text-muted-foreground"
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  transition={transition(0.45)}
                >
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
                        <path
                          d="M2.34086 6.38914C2.1622 6.8145 2.08371 7.26454 2.0442 7.74818C1.99998 8.28936 1.99999 8.95371 2 9.75867V14.2413C1.99999 15.0463 1.99998 15.7106 2.0442 16.2518C2.09012 16.8139 2.18868 17.3306 2.43598 17.816C2.81947 18.5686 3.43139 19.1805 4.18404 19.564C4.66938 19.8113 5.18608 19.9099 5.74818 19.9558C6.28936 20 6.95371 20 7.75866 20H16.2413C17.0462 20 17.7106 20 18.2518 19.9558C18.8139 19.9099 19.3306 19.8113 19.816 19.564C20.5686 19.1805 21.1805 18.5686 21.564 17.816C21.8113 17.3306 21.9099 16.8139 21.9558 16.2518C22 15.7106 22 15.0463 22 14.2413V9.75868C22 8.95372 22 8.28937 21.9558 7.74818C21.9163 7.26453 21.8378 6.81449 21.6591 6.38912L14.5329 12.2196C13.0595 13.4252 10.9405 13.4252 9.46703 12.2196L2.34086 6.38914Z"
                          fill="currentColor"
                        />
                        <path
                          d="M20.4224 4.8169C20.233 4.67277 20.0302 4.54512 19.816 4.43598C19.3306 4.18868 18.8139 4.09012 18.2518 4.0442C17.7106 3.99998 17.0463 3.99999 16.2413 4H7.7587C6.95375 3.99999 6.28936 3.99998 5.74818 4.0442C5.18608 4.09012 4.66938 4.18868 4.18404 4.43598C3.96982 4.54512 3.76701 4.67278 3.57762 4.81691L10.7335 10.6717C11.4702 11.2745 12.5297 11.2745 13.2665 10.6717L20.4224 4.8169Z"
                          fill="currentColor"
                        />
                      </svg>
                      email
                    </a>
                    .
                  </span>
                </motion.p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
