"use client"

import { motion } from "motion/react"
import Image from "next/image"
import { useEffect, useState } from "react"

const images = [
  "/miky/024c5a8d-5bb7-4ac8-8198-099c98f8d6fb.jpg",
  "/miky/0796a4de-0dfd-4add-b906-b0fba3bd1828.jpg",
  "/miky/0d17b620-b7b0-458a-a8c0-04ea7592ac5b.jpg",
  "/miky/0ee9f5b0-ac12-46e3-baef-08b1014dc452.jpg",
  "/miky/1d9630bc-58b8-4c09-ad62-71d18da745a0.jpg",
  "/miky/1dcb89dd-d00b-4d07-a358-7fec8cfcac9d.jpg",
  "/miky/4ab9cd40-f817-4dcf-af22-ffb2aab7d890.jpg",
  "/miky/4d62006c-8ec7-437b-80ee-653d2926d7c0.jpg",
  "/miky/4f63f8af-7266-40cc-9c5d-8f5073d098d1.jpg",
  "/miky/660bc9bb-266c-47d1-9eb5-71d07050631e.jpg",
  "/miky/66291a3b-89ac-4515-8d0d-f57b03f6488c.jpg",
  "/miky/727beea1-341f-4ca8-9ace-eda34cf79c61.jpg",
  "/miky/88824c6a-d7bd-4952-8cdf-c650c72612a8.jpg",
  "/miky/8E208173-3E19-4B11-B5CF-BDD1B9B3F4DB.JPG",
  "/miky/d184556c-d6b2-41ed-888d-cf37f8cf8e29.jpg",
  "/miky/ebb2b0dd-6481-4cdf-99ce-31fc018da7a6.jpg",
  "/miky/f04c732b-a4c7-406d-85d1-b6f5826119bd.jpg",
  "/miky/f0b57f7e-a643-40da-8b37-0b4bffb72e7a.jpg",
  "/miky/IMG_1157.jpeg",
  "/miky/IMG_1353.JPG",
  "/miky/IMG_1839.jpeg",
  "/miky/IMG_20220112_104555_Original.JPG",
  "/miky/IMG_20220112_104606_Original.JPG",
  "/miky/IMG_2454.jpeg",
  "/miky/IMG_2456.jpeg",
  "/miky/IMG_2791.JPG",
  "/miky/IMG_3614.jpeg",
  "/miky/IMG_4306.JPG",
  "/miky/IMG_4752.jpeg",
  "/miky/IMG_4907.jpeg",
  "/miky/IMG_4979.JPG",
  "/miky/IMG_5934E2FE-8EEE-4F4B-A602-07AA449CAFF1.jpeg",
]

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

export default function MikyPage() {
  const [randomImages, setRandomImages] = useState<string[]>([])

  useEffect(() => {
    const shuffled = [...images].sort(() => Math.random() - 0.5)
    setRandomImages(shuffled.slice(0, 4))
  }, [])

  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col items-center justify-center">
        <section className="w-full max-w-5xl px-6 sm:px-10 md:px-16 lg:px-20">
          <div className="flex flex-col gap-8 text-base">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={transition(0)}
            >
              <h1 className="font-serif text-4xl">Michail</h1>
              <h2 className="font-serif text-sm">
                Michael, Micheol, Miky, Michele, Michelle, Miza, Miguel, Mikel
                (Mi), Miky Mouse, Yoannide, Poseidone, The Greek, Antico UGO,
                Albus Silente, Fifone, Smitch, ABIGAL, Patrick, Sellas,
                Sellaceo, Casellas
              </h2>
            </motion.div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              {randomImages.map((src, index) => (
                <motion.div
                  key={src}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  transition={transition(0.15 + index * 0.1)}
                  className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  <Image
                    src={src}
                    alt="Miky"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    priority={index < 2}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
