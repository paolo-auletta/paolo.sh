import { random, Scene, setStyle, type Effect } from "./scene"

/**
 * Paper, the motion for the Music and Movies pages: the covers are cards
 * on a table, the list is a sheet creased to fit in a pocket. The page
 * marks its parts with data-paper: title, card (cover + caption), head,
 * rule, row, footer.
 *
 * Until the scene starts, everything but the cards is hidden by CSS under
 * [data-paper-pending] (see globals.css), so a server-rendered page does
 * not flash in before it is dealt.
 */

const parts = (root: HTMLElement, name: string) =>
  Array.from(root.querySelectorAll<HTMLElement>(`[data-paper~="${name}"]`))

const part = (root: HTMLElement, name: string) => parts(root, name)[0]

const fadeIn = (
  scene: Scene,
  element: Element | null | undefined,
  delay: number,
  duration = 420
) => {
  if (!element) return
  scene.animate(element, [{ opacity: 0 }, { opacity: 1 }], {
    duration,
    delay,
    easing: "ease-out",
  })
}

const coverOf = (card: HTMLElement) =>
  card.querySelector<HTMLElement>('[data-paper~="cover"]')
const captionOf = (card: HTMLElement) =>
  card.querySelector<HTMLElement>('[data-paper~="caption"]')

/** The first card dealt is the top of the stack. */
function stackCards(scene: Scene, cards: HTMLElement[]) {
  cards.forEach((card, index) => {
    scene.onCleanup(
      setStyle(card, {
        position: "relative",
        "z-index": String(cards.length - index),
      })
    )
  })
}

/** How far each cover sits from a point on the table, in px. */
function offsetsTo(cards: HTMLElement[], x: number, y: number) {
  return cards.map((card) => {
    const box = (coverOf(card) ?? card).getBoundingClientRect()
    return {
      dx: x - (box.left + box.width / 2),
      dy: y - (box.top + box.height / 2),
    }
  })
}

type Deal = {
  /** When the first card leaves the stack. */
  start?: number
  gap?: number
  length?: number
  /** Move the whole card instead of only its cover. */
  whole?: boolean
}

/**
 * Deals the covers off a single stack, one by one, onto their places.
 * Returns when each card lands.
 */
function deal(
  scene: Scene,
  cards: HTMLElement[],
  { start = 520, gap = 170, length = 720, whole = false }: Deal = {}
) {
  if (!cards.length) return []
  const grid = cards[0].parentElement!.getBoundingClientRect()
  const first = (coverOf(cards[0]) ?? cards[0]).getBoundingClientRect()
  // The stack sits where the first cover lands, nudged toward the middle.
  const offsets = offsetsTo(
    cards,
    first.left + first.width / 2 + grid.width * 0.12,
    first.top + first.height / 2 + 6
  )
  stackCards(scene, cards)
  return cards.map((card, index) => {
    const { dx, dy } = offsets[index]
    const turn = (random(index + 11) - 0.5) * 9
    const stacked = `translate(${dx}px, ${dy}px) rotate(${turn}deg)`
    const dealAt = start + index * gap
    const total = dealAt + length
    const mover = whole ? card : coverOf(card)
    if (mover) {
      scene.animate(
        mover,
        [
          { opacity: 0, transform: stacked, offset: 0 },
          { opacity: 1, transform: stacked, offset: 300 / total },
          {
            opacity: 1,
            transform: stacked,
            offset: dealAt / total,
            easing: "cubic-bezier(0.25, 0.85, 0.3, 1)",
          },
          { opacity: 1, transform: "none", offset: 1 },
        ],
        { duration: total }
      )
    }
    return total
  })
}

type Fold = { origin: string; angle: number; shade: number }

/** The list unfolds a row at a time, each on its own crease. */
function unfold(
  scene: Scene,
  root: HTMLElement,
  start: number,
  {
    gap = 110,
    duration = 760,
    fold = () => ({ origin: "50% 0", angle: -92, shade: 0.8 }),
  }: { gap?: number; duration?: number; fold?: (index: number) => Fold } = {}
) {
  const rows = parts(root, "row")
  const list = rows[0]?.parentElement
  if (list) scene.onCleanup(setStyle(list, { perspective: "900px" }))
  rows.forEach((row, index) => {
    const { origin, angle, shade } = fold(index)
    scene.animate(
      row,
      [
        {
          opacity: 0,
          transform: `rotateX(${angle}deg)`,
          transformOrigin: origin,
          filter: `brightness(${shade})`,
        },
        { opacity: 1, offset: 0.25 },
        {
          opacity: 1,
          transform: "rotateX(0deg)",
          transformOrigin: origin,
          filter: "brightness(1)",
        },
      ],
      {
        duration,
        delay: start + index * gap,
        easing: "cubic-bezier(0.3, 0.9, 0.3, 1)",
      }
    )
  })
  return start + rows.length * gap
}

/** Title, list heading, rules and footer: the quiet parts around it all. */
function frame(
  scene: Scene,
  root: HTMLElement,
  { list, listEnd }: { list: number; listEnd: number }
) {
  fadeIn(scene, part(root, "title"), 0, 500)
  fadeIn(scene, part(root, "head"), list - 100)
  const [top, bottom] = parts(root, "rule")
  fadeIn(scene, top, list - 50)
  fadeIn(scene, bottom, listEnd)
  fadeIn(scene, part(root, "footer"), listEnd + 100)
}

/* -------------------------------------------------------------------------- */

/**
 * Paper. The covers come off a single stack, dealt out one by one onto the
 * table, and the list unfolds beneath them a fold at a time, like a long
 * sheet that was creased to fit in a pocket.
 */
export const paper: Effect = (root) => {
  const scene = new Scene()
  const cards = parts(root, "card")
  deal(scene, cards).forEach((landed, index) =>
    fadeIn(scene, captionOf(cards[index]), landed - 240)
  )
  const listEnd = unfold(scene, root, 1000)
  frame(scene, root, { list: 1000, listEnd })
  return scene.go()
}
