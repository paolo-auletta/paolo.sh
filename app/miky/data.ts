/*
 * /miky's archive: his portraits, the one on his coin, every name he goes
 * by, and how four portraits are dealt from the rest.
 */

import { shuffle } from "./utils"

export const PORTRAITS = [
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

/** The head on the coin: straight on, as coins have it. */
const COIN = "/miky/66291a3b-89ac-4515-8d0d-f57b03f6488c.jpg"

export const NAMES = [
  "Michael",
  "Micheol",
  "Miky",
  "Michele",
  "Michelle",
  "Miza",
  "Miguel",
  "Mikel (Mi)",
  "Miky Mouse",
  "Yoannide",
  "Poseidone",
  "The Greek",
  "Antico UGO",
  "Albus Silente",
  "Fifone",
  "Smitch",
  "ABIGAL",
  "Patrick",
  "Sellas",
  "Sellaceo",
  "Casellas",
]

/** How many portraits are on show at once. */
export const SHOWN = 4

/** Four from the archive, never the coin's, and never the four on show. */
export function deal(current: string[]) {
  const pool = PORTRAITS.filter((src) => src !== COIN && !current.includes(src))
  return shuffle(pool).slice(0, SHOWN)
}

/*
 * The first four, as a store for useSyncExternalStore: dealt once on the
 * client, the first time they're asked for; the server has none.
 */
let firstDeal: string[] | null = null
export const firstFour = () => (firstDeal ??= deal([]))
const NONE: string[] = []
export const noPortraits = () => NONE
export const noSubscription = () => () => {}
