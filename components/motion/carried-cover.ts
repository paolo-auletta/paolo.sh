import { clamp01, mix, smoothstep } from "@/components/home/math"

import { type Scene } from "./scene"

/**
 * A cover carried from the homepage to the page it previews. Clicking the
 * album or the film in the homepage copy while its preview card is open
 * picks the card up: a copy of it rises off the page, above everything,
 * and in one unbroken motion is carried to the very spot its picture has on
 * the next page (the album's card on /music, the film's diary row on
 * /movies) while the homepage's paper spreads out under it. The next page's
 * Paper entrance then deals itself in around it, and the copy gives way to
 * the real thing.
 *
 * The spot is known before the page exists: the homepage lays both pages
 * out invisibly (components/archive-ghost.tsx). The preview links marked
 * [data-carry] are the cards that can be carried (app/page.tsx). The copy
 * is a plain element on <body>, outside React, so it lives through the
 * change of page.
 *
 * It moves by transform alone, so the compositor runs it: it stays smooth
 * while the main thread is busy with the click and with the next page.
 */

type Rect = { left: number; top: number; width: number; height: number }

/** The cover at one instant: where it is, and how it is held. */
type Pose = Rect & { lift: number; turn: number }

const SIDES = ["left", "top", "width", "height"] as const

/** The resting shadow: Tailwind's shadow-sm, as the covers wear it. */
const RESTING = [
  [0, 1, 3, 0, 0.1],
  [0, 1, 2, -1, 0.1],
]
/** Held up off the page. */
const LIFTED = [
  [0, 16, 32, -10, 0.3],
  [0, 5, 12, -4, 0.16],
]

/** ms: from the homepage to its place on the next page. */
const CARRY_MS = 700
/** ms: steering onto the real frame, should it lie off the ghost's. */
const STEER_MS = 260
/** Keyframes per path: dense enough to read as a curve. */
const STEPS = 48

/** The pose, as a transform of the copy's own box, `box`. */
function placed(pose: Pose, box: Rect): Keyframe {
  const x = pose.left + pose.width / 2 - (box.left + box.width / 2)
  const y = pose.top + pose.height / 2 - (box.top + box.height / 2)
  const held = 1 + 0.03 * pose.lift
  const scaleX = (pose.width / box.width) * held
  const scaleY = (pose.height / box.height) * held
  return {
    transform: `translate(${x}px, ${y - 4 * pose.lift}px) rotate(${pose.turn}deg) scale(${scaleX}, ${scaleY})`,
  }
}

/** The pose's shadow: the one part that is not a transform. */
function shadowed({ lift }: Pose): Keyframe {
  const boxShadow = RESTING.map((rest, layer) => {
    const [x, y, blur, spread, alpha] = rest.map((value, i) =>
      mix(value, LIFTED[layer][i], lift)
    )
    return `${x}px ${y}px ${blur}px ${spread}px rgb(0 0 0 / ${alpha})`
  }).join(", ")
  return { boxShadow }
}

/** A cubic-bezier easing, for sampling a path by hand. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  return (x: number) => {
    let lo = 0
    let hi = 1
    for (let i = 0; i < 24; i += 1) {
      const t = (lo + hi) / 2
      if (at(x1, x2, t) < x) lo = t
      else hi = t
    }
    return at(y1, y2, (lo + hi) / 2)
  }
}

/*
 * Every channel starts from rest and comes to rest: no jolt on pick-up, no
 * nudge on landing. Across leads and down follows a beat behind, so the
 * cover swings along a curve rather than a line; the size holds at first
 * and gives way on the descent.
 */
const across = bezier(0.45, 0, 0.2, 1)
const down = bezier(0.6, 0, 0.25, 1)
const resize = bezier(0.6, 0, 0.3, 1)

type Carry = { from: Rect; to: Rect; start: number }

/** The cover `t` of the way (0–1) along its carry. */
function carriedAt({ from, to }: Carry, t: number): Pose {
  const size = resize(t)
  const width = mix(from.width, to.width, size)
  const height = mix(from.height, to.height, size)
  // Centre to centre, so a cover that shrinks does so around its middle.
  const x = mix(from.left + from.width / 2, to.left + to.width / 2, across(t))
  const y = mix(from.top + from.height / 2, to.top + to.height / 2, down(t))
  // Up off the page, held, and set down again; leaning into the way it goes.
  const lift = smoothstep(0, 0.35, t) * (1 - smoothstep(0.6, 1, t))
  const lean = Math.sign(to.left - from.left || -1) * -2.2
  return {
    left: x - width / 2,
    top: y - height / 2,
    width,
    height,
    lift,
    turn: lean * Math.sin(Math.PI * t),
  }
}

/**
 * The carry, from `elapsed` ms in, over `duration` ms, as two animations of
 * the copy: its motion and its shadow. With `onto`, its end is steered
 * smoothly from the ghost's frame onto that one.
 */
function fly(
  element: HTMLElement,
  carry: Carry,
  { elapsed = 0, duration = CARRY_MS, onto = carry.to } = {},
  animate: (keyframes: Keyframe[]) => Animation = (keyframes) =>
    element.animate(keyframes, { duration, fill: "both" })
) {
  const poses = Array.from({ length: STEPS + 1 }, (_, step) => {
    const time = (step / STEPS) * duration
    const pose = carriedAt(carry, clamp01((elapsed + time) / CARRY_MS))
    const steer = smoothstep(0, duration, time)
    for (const side of SIDES) {
      pose[side] += (onto[side] - carry.to[side]) * steer
    }
    return pose
  })
  return [
    animate(poses.map((pose) => placed(pose, carry.from))),
    animate(poses.map(shadowed)),
  ]
}

const rectOf = (element: Element): Rect => {
  const { left, top, width, height } = element.getBoundingClientRect()
  return { left, top, width, height }
}

type Cover = {
  element: HTMLElement
  carry: Carry
  flight: Animation[]
  /** Fades the copy out if no page claims it in time. */
  expiry: number
}

let inHand: Cover | null = null

const expireIn = (ms: number) => window.setTimeout(() => dropCover(), ms)

/** Carries the cover along its way, from wherever it has got to by now. */
function carryOn(element: HTMLElement, carry: Carry) {
  const flight = fly(element, carry)
  for (const animation of flight) {
    animation.currentTime = Math.min(CARRY_MS, performance.now() - carry.start)
  }
  return flight
}

/**
 * Leaving the homepage for `pathname`: if the preview card for it is open,
 * pick it up and carry it to its place there. Returns whether it did.
 */
export function pickUpCover(pathname: string) {
  dropCover()
  const card = document.querySelector<HTMLElement>(
    `a[data-carry][href="${pathname}"]`
  )
  const image = card?.querySelector("img")
  const landing = document.querySelector(
    `[data-ghost="${pathname}"] [data-paper~="landing"]`
  )
  if (!card || !image?.src || !landing) return false
  const to = rectOf(landing)
  // A place out of sight (below the fold, on a phone): nowhere to carry it
  // to, so the card goes with the copy, as any other link would.
  if (to.top < 0 || to.top + to.height > window.innerHeight) return false

  const carry = { from: rectOf(card), to, start: performance.now() }
  const element = document.createElement("div")
  element.setAttribute("aria-hidden", "true")
  element.className = "border border-border/70 bg-muted"
  Object.assign(element.style, {
    position: "fixed",
    left: `${carry.from.left}px`,
    top: `${carry.from.top}px`,
    width: `${carry.from.width}px`,
    height: `${carry.from.height}px`,
    willChange: "transform",
    zIndex: "60",
    overflow: "hidden",
    pointerEvents: "none",
  })
  const copy = document.createElement("img")
  copy.src = image.src
  copy.alt = ""
  Object.assign(copy.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    objectFit: "cover",
  })
  element.append(copy)
  document.body.append(element)
  // The copy lies exactly over the card; the card itself goes at once.
  card.style.visibility = "hidden"

  inHand = {
    element,
    carry,
    flight: carryOn(element, carry),
    expiry: expireIn(5000),
  }
  return true
}

/** Lets go of the cover in hand, if any: it fades where it is. */
export function dropCover() {
  const cover = inHand
  if (!cover) return
  inHand = null
  window.clearTimeout(cover.expiry)
  cover.element
    .animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 180,
      easing: "ease-out",
      fill: "forwards",
    })
    .finished.then(() => cover.element.remove())
}

/** Where the cover in hand lands on the arriving page, if anywhere. */
export function landingFor(root: HTMLElement) {
  if (!inHand) return null
  return root.querySelector<HTMLElement>('[data-paper~="landing"]')
}

/**
 * The arriving page takes the cover in hand and lets it come down on
 * `landing`, its real frame, which stays hidden until the cover lies on it
 * exactly; then the copy fades off it. The cover carries on along its way as it
 * was, and is only steered if the page lies off its ghost. It lies there
 * for at least `wait` ms from now before the swap.
 *
 * Measures `landing` at once, so call it before anything around it moves.
 * Returns when the real frame shows, or null with no cover in hand.
 */
export function layDownCover(
  scene: Scene,
  landing: HTMLElement,
  { wait = 0 }: { wait?: number } = {}
) {
  const cover = inHand
  if (!cover) return null
  inHand = null
  window.clearTimeout(cover.expiry)

  const { element, carry } = cover
  const onto = rectOf(landing)
  const elapsed = Math.min(CARRY_MS, performance.now() - carry.start)
  const off = Math.max(
    ...SIDES.map((side) => Math.abs(onto[side] - carry.to[side]))
  )
  const steered = off > 0.5
  const landsIn = steered
    ? Math.max(CARRY_MS - elapsed, STEER_MS)
    : CARRY_MS - elapsed
  if (steered) {
    for (const animation of cover.flight) animation.cancel()
    fly(element, carry, { elapsed, duration: landsIn, onto }, (keyframes) =>
      scene.animate(element, keyframes, { duration: landsIn })
    )
  }

  const shows = Math.max(landsIn, wait, 1)
  let landed = false
  scene
    .animate(
      landing,
      [{ opacity: 0 }, { opacity: 0, offset: 0.99 }, { opacity: 1 }],
      { duration: shows }
    )
    .finished.then(
      () => {
        landed = true
        // The real frame is showing beneath: the copy gives way to it.
        element
          .animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 140,
            fill: "forwards",
          })
          .finished.then(() => element.remove())
      },
      () => {}
    )
  // Torn down before it landed (React runs effects twice in development):
  // the cover goes back into the hand, still on its way, for the page to
  // take again at once.
  scene.onCleanup(() => {
    if (landed) return
    inHand = {
      ...cover,
      flight: steered ? carryOn(element, carry) : cover.flight,
      expiry: expireIn(120),
    }
  })
  return shows
}
