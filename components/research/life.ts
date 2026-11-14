/**
 * The research page's background: Conway's Game of Life, played on boxes
 * that each break into four, growing down from the top of the page.
 *
 * - The rule is Life's, on the boxes: a box with three neighbours is born,
 *   one with two or three lives on, the rest die. But not every box looks
 *   at the rule every generation: each wakes to it only now and then, at
 *   random, and the rest hold as they are. So only a few change at a time,
 *   and the game, rather than dying out, slowly spreads.
 * - It comes from the top, gathered about a point near its middle. Each
 *   visit draws that point and how gathered the game is about it: the
 *   front's reach down the page falls off along the top as a bell curve.
 *   It runs down fast at first and then barely creeps, the game seeded
 *   behind it, and nothing is born past it.
 *   Generations are quick as it opens, with more boxes awake, and settle to
 *   a slow, even pace with few; a click stirs it again.
 * - A generation is not a jump. Every box remembers how it was last drawn
 *   (how large, whether whole or in its four quarters, how far apart they
 *   sit) and only ever moves from there to how it is drawn next, so no box
 *   can snap. A box being born grows from its middle, or a quarter at a time
 *   from the side its neighbours are on; a dying one shrinks back into what
 *   outlives it. Every square starts quickly and takes its time arriving.
 * - A box with nothing happening round it breaks into its quarters, which
 *   draw back from each other; when things stir again they close up.
 * - Ink is animated too. A box is born dark and fades to a pale resting
 *   tone over the generations it lives. The box under the pointer and the
 *   living boxes round it (the neighbours the rule counts) take the sky's
 *   blue, and so does whatever a click plants; that blue is handed down to
 *   what is born of it, a little weaker each time.
 * - A click on bare paper plants a seed there; on something small, crumbles
 *   it; on the body of the game, crumbles a hole in it.
 * - What drifts away from the body and comes to rest (still lifes, blinkers)
 *   holds a while, and goes.
 * - The copy keeps a clearing: no box lives inside the element marked
 *   `data-life-clear`, plus a margin.
 *
 * With reduced motion a game is grown offline and drawn once, still.
 */

/** CSS px per box by the page's width, and of paper between two squares. */
const boxFor = (width: number) => (width < 640 ? 16 : 20)
const GAP = 1

/**
 * ms a generation takes: at rest, and at full stir. The game starts fully
 * stirred and calms by `CALM_MS` (the time to lose about two thirds of it);
 * a click stirs it back up to `CLICK_STIR`.
 */
const SLOW_MS = 2400
const FAST_MS = 140
const CALM_MS = 1600
const CLICK_STIR = 0.45
/**
 * The chance a box wakes to the rule in a generation: at rest, and at full
 * stir (as the game opens, or after a click).
 */
const AWAKE = 0.2
const AWAKE_STIRRED = 0.7
/** ms after mounting before the game starts: the copy arrives first. */
const START_MS = 900

/**
 * How far the front has run down from the top at its deepest, as a share of
 * the page's height: quickly to `RUSH` (two thirds of the way by `RUSH_MS`),
 * then creeping on towards `RUSH + CREEP` over minutes.
 */
const RUSH = 0.38
const RUSH_MS = 2600
const CREEP = 0.14
const CREEP_MS = 90_000
/** The least height, in boxes, the front's shares are taken of. */
const MIN_DEPTH = 36
/**
 * The bell the front falls off by along the top, drawn each visit: its
 * middle, about the page's middle give or take `MIDDLE_SPREAD` (and kept
 * within `MIDDLE_WITHIN` of it), and its spread, between the two given, all
 * as shares of the page's width. Its spread is never under `NARROWEST` boxes.
 */
const MIDDLE_SPREAD = 0.08
const MIDDLE_WITHIN = 0.18
const SPREAD: readonly [number, number] = [0.07, 0.2]
const NARROWEST = 3.5
/** How ragged the front is: its least reach, as a share of the bell's. */
const RAGGED = 0.7
/** Boxes above the top (off the page) that the game is fed from too. */
const BEHIND = 3
/**
 * How full the game is kept: at the top, falling to nothing at the front.
 * Each generation of the rush it is looked at in a spot per `FEED_AREA`
 * boxes behind the front, and fed where it is under `FEED_UNDER` of that.
 * After the rush it is left to settle, and only now and then (`TRICKLE`, a
 * chance a generation) fed once near the front, so the front keeps creeping.
 */
const DENSE = 0.3
const FALLOFF = 1.3
const FEED_AREA = 26
const FEED_UNDER = 0.65
const RUSH_FED_MS = 6500
const TRICKLE = 0.12

/**
 * Of a generation: how long a square takes to grow or shrink, alone and as
 * one of a box's quarters; how long the far quarters wait for the near; and
 * how long quarters take to part, or to close up into one square.
 */
const WHOLE_TAKES = 0.9
const QUARTER_TAKES = 0.62
const QUARTERS_APART = 0.3
const PART_TAKES = 0.25
const CLOSE_TAKES = 0.35
/** How large a box's quarters draw once it has broken into them. */
const BROKEN = 0.7
/**
 * Generations of nothing happening round a box before it may break, and the
 * chance a generation that it then does: boxes break one by one, not all
 * together. A broken box stays broken until something stirs round it.
 */
const BREAK_AFTER = 4
const BREAK_CHANCE = 0.05
/**
 * Of a generation: how late a box may start moving. Each box starts at its
 * own moment, so the page never moves all on one beat.
 */
const STAGGER = 0.4

/** Boxes of the game kept running past each edge of the page. */
const OUT = 6
/** Boxes of margin the clearing keeps around the copy. */
const CLEAR_MARGIN = 2

/** Generations something drifting at rest holds before it goes. */
const HOLD: readonly [number, number] = [6, 14]
/** A clump larger than this is the body: a click crumbles a hole in it. */
const SMALL = 30
/** Boxes round a click that crumble in the body. */
const HOLE = 2

/**
 * How much ink a box takes by the generations it has lived, faded from one
 * to the next; how much the grid's dots take; and the sky's blue, with the
 * ink the pointer's box is given while bare.
 */
const INK = {
  light: {
    boxes: [0.44, 0.31, 0.22, 0.16, 0.125, 0.105],
    grid: 0.1,
    sky: "oklch(0.52 0.125 252)",
    bare: 0.06,
  },
  dark: {
    boxes: [0.4, 0.28, 0.2, 0.145, 0.11, 0.09],
    grid: 0.11,
    sky: "oklch(0.74 0.095 238)",
    bare: 0.07,
  },
} as const
/** Of its blue: what a box keeps each generation, and hands to its young. */
const BLUE_KEPT = 0.86
const BLUE_HANDED = 0.93
/** ms the pointer's blue takes to come and to go. */
const LIT_IN_MS = 110
const LIT_OUT_MS = 520

/** What a click plants: small seeds that grow for a long while. */
const CLICKED = [
  [".OO", "OO.", ".O."],
  ["OOO", "O.O", "O.O"],
  ["O.OO", "OOO.", ".O.."],
  ["OOO", "...", ".O.", ".O.", ".O."],
  ["..OO", "OOO.", ".O.."],
] as const

/** What a box is up to, besides living: broken into quarters, or going. */
const BREAKS = 1
const GOING = 2

/**
 * How a box is drawn, as numbers that can be eased from any one to any
 * other: its scale about its middle, how far its quarters stand apart (0
 * closed into one square, 1 parted), and each quarter's size.
 */
const SCALE = 0
const PARTED = 1
const QUARTER = 2
const LOOKS = 6
/** A box drawn whole, and nothing at all. */
const WHOLE = [1, 0, 1, 1, 1, 1] as const
const NOTHING = [1, 1, 0, 0, 0, 0] as const

const flip = () => Math.random() < 0.5
/** A draw from the standard bell curve. */
const normal = () =>
  Math.sqrt(-2 * Math.log(1 - Math.random())) *
  Math.cos(2 * Math.PI * Math.random())
const pick = <T>(from: readonly T[]) =>
  from[Math.floor(Math.random() * from.length)]
const scramble = (n: number) => (Math.imul(n + 1, 2654435761) >>> 0) / 2 ** 32
const clamp = (n: number) => Math.min(1, Math.max(0, n))
/** Quick away, slow to arrive. */
const arrive = (t: number) => 1 - (1 - clamp(t)) ** 2

/** A pattern's live boxes, mirrored and turned at random. */
function shape(rows: readonly string[]) {
  const [mirrorX, mirrorY, turn] = [flip(), flip(), flip()]
  const height = rows.length
  const width = rows[0].length
  const cells: [number, number][] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rows[y][x] !== "O") continue
      const fx = mirrorX ? width - 1 - x : x
      const fy = mirrorY ? height - 1 - y : y
      cells.push(turn ? [fy, fx] : [fx, fy])
    }
  }
  return {
    cells,
    width: turn ? height : width,
    height: turn ? width : height,
  }
}

export class Life {
  private readonly context: CanvasRenderingContext2D
  /** The game's boxes, across and down, with the page's first at (OUT, OUT). */
  private across = 0
  private down = 0
  /** Per box: alive a generation ago, now, and in the generation coming. */
  private before = new Uint8Array(0)
  private now = new Uint8Array(0)
  private coming = new Uint8Array(0)
  /** Per box: generations lived, and the generation it last did anything new. */
  private age = new Uint16Array(0)
  private stirred = new Int32Array(0)
  /** Per box: what it is up to, and the clump it belongs to (-1 if none). */
  private doing = new Uint8Array(0)
  private broken = new Uint8Array(0)
  private clumpOf = new Int32Array(0)
  /** Per box: how blue it is now and will be, and how lit by the pointer. */
  private blue = new Float32Array(0)
  private blueComing = new Float32Array(0)
  private lit = new Float32Array(0)
  /**
   * Per box, `LOOKS` numbers each: how it was drawn as the generation began,
   * how it is to be drawn as it ends, and when in it each number moves
   * (from, and for how long, as shares of the generation).
   */
  private from = new Float32Array(0)
  private to = new Float32Array(0)
  private waits = new Float32Array(0)
  private takes = new Float32Array(0)
  /** Per box: 1 inside the copy's clearing. */
  private wall = new Uint8Array(0)
  /** Boxes to be born with the coming generation (blue ones from a click). */
  private planted: number[] = []
  private clicked: number[] = []
  /** Living boxes clicked on, to crumble with the coming generation. */
  private doomed: number[] = []
  /** How far each quarter of a box is from what it grows out of: 1 or 2. */
  private readonly far = new Uint8Array(4)
  /** The clearing, in page boxes: left, top, right, bottom (exclusive). */
  private clearing: [number, number, number, number] | null = null
  /**
   * Where along the top the game gathers, how widely, and the waves that
   * make its front ragged.
   */
  private readonly middle =
    0.5 +
    Math.max(-MIDDLE_WITHIN, Math.min(MIDDLE_WITHIN, normal() * MIDDLE_SPREAD))
  private readonly spread = SPREAD[0] + Math.random() * (SPREAD[1] - SPREAD[0])
  private readonly waves = Array.from({ length: 3 }, (_, n) => ({
    often: (n + 1) * (1.2 + Math.random() * 1.6),
    phase: Math.random() * Math.PI * 2,
    weight: 1 / (n + 1),
  }))
  private box = 0
  private cols = 0
  private rows = 0
  /** Where the page's first box is drawn: the grid is centred on the page. */
  private left = 0
  private top = 0
  private dpr = 1
  private dark = false
  private ink = "#000"
  /** The grid's dots, cut out at the clearing. */
  private grid: HTMLCanvasElement | null = null
  private readonly still: boolean
  private frame = 0
  private last = 0
  /** ms since mounting, and since the game started. */
  private waited = 0
  private played = 0
  private generation = 0
  /** How far through the generation the page is, 0 to 1; and how stirred. */
  private through = 1
  private stir = 1
  /** The box under the pointer, or -1. */
  private pointed = -1
  private destroyed = false
  private readonly resizeObserver: ResizeObserver
  private readonly themeObserver: MutationObserver

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly clear: HTMLElement | null
  ) {
    this.context = canvas.getContext("2d")!
    this.still = matchMedia("(prefers-reduced-motion: reduce)").matches
    this.theme()
    this.resize()
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    if (clear) this.resizeObserver.observe(clear)
    this.themeObserver = new MutationObserver(() => {
      this.theme()
      this.drawGrid()
      this.draw()
    })
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    if (this.still) {
      this.growStill()
      return
    }
    window.addEventListener("pointerdown", this.onPointerDown)
    window.addEventListener("pointermove", this.onPointerMove)
    document.documentElement.addEventListener("pointerleave", this.onLeave)
    this.frame = requestAnimationFrame(this.run)
  }

  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.themeObserver.disconnect()
    window.removeEventListener("pointerdown", this.onPointerDown)
    window.removeEventListener("pointermove", this.onPointerMove)
    document.documentElement.removeEventListener("pointerleave", this.onLeave)
  }

  // The game.

  /**
   * One generation: the coming one becomes now, the one after is worked out,
   * and every box is given how it is to be drawn by the end of it.
   */
  private generate() {
    const { across, down } = this
    this.generation++
    const spare = this.before
    this.before = this.now
    this.now = this.coming
    this.coming = spare
    const kept = this.blue
    this.blue = this.blueComing
    this.blueComing = kept
    const { before, now, coming, age, wall, blue, blueComing } = this
    for (let i = 0; i < now.length; i++) {
      age[i] = now[i] && before[i] ? Math.min(age[i] + 1, 1000) : 0
    }

    // The outermost boxes are never alive: what flies off the game is lost.
    coming.fill(0)
    blueComing.fill(0)
    const awake = this.still ? 0.5 : AWAKE + (AWAKE_STIRRED - AWAKE) * this.stir
    const reach = this.reach()
    for (let y = 1; y < down - 1; y++) {
      for (let x = 1; x < across - 1; x++) {
        const i = y * across + x
        if (wall[i]) continue
        if (Math.random() >= awake) {
          // Asleep: as it was.
          coming[i] = now[i]
          blueComing[i] = blue[i] * BLUE_KEPT
          continue
        }
        let around = 0
        let handed = 0
        for (let dy = -across; dy <= across; dy += across) {
          for (let dx = -1; dx <= 1; dx++) {
            const n = i + dy + dx
            if (n === i || !now[n]) continue
            around++
            handed += blue[n]
          }
        }
        if (now[i] && (around === 2 || around === 3)) {
          coming[i] = 1
          blueComing[i] = blue[i] * BLUE_KEPT
        } else if (!now[i] && around === 3 && this.behind(x, y, reach)) {
          coming[i] = 1
          blueComing[i] = (handed / 3) * BLUE_HANDED
        }
      }
    }

    if (!this.still) this.feed()
    this.settle()
    const { doing } = this
    for (const i of this.planted) {
      if (!wall[i] && doing[i] !== GOING) coming[i] = 1
    }
    for (const i of this.clicked) {
      if (wall[i] || doing[i] === GOING) continue
      coming[i] = 1
      blueComing[i] = 1
    }
    this.planted.length = 0
    this.clicked.length = 0

    // New is anything a box was not doing two generations ago: still lifes
    // and blinkers are not, so they come to rest.
    for (let i = 0; i < coming.length; i++) {
      if (coming[i] !== before[i]) this.stirred[i] = this.generation
    }
    this.plan()
  }

  /** How far the front has run down from the top, in boxes, at its deepest. */
  private reach() {
    // A short page still gives the game room to come down.
    const depth = Math.max(MIN_DEPTH, this.rows)
    const t = this.still ? RUSH_MS * 3 : this.played
    const rush = RUSH * (1 - Math.exp(-t / RUSH_MS))
    const creep = CREEP * (1 - Math.exp(-t / CREEP_MS))
    return Math.max(2, depth * (rush + creep))
  }

  /** The bell's spread, as a share of the page's width. */
  private width() {
    return Math.max(this.spread, NARROWEST / this.cols)
  }

  /**
   * How far down the front reaches at a point along the top (0 to 1), as a
   * share of its deepest: the bell, a little ragged.
   */
  private front(along: number) {
    let sum = 0
    let weights = 0
    for (const { often, phase, weight } of this.waves) {
      sum +=
        weight * (0.5 + 0.5 * Math.sin(along * often * Math.PI * 2 + phase))
      weights += weight
    }
    const off = (along - this.middle) / this.width()
    const bell = Math.exp(-0.5 * off * off)
    return bell * (RAGGED + (1 - RAGGED) * (sum / weights))
  }

  /** Whether a box of the game is behind the front. */
  private behind(x: number, y: number, reach: number) {
    const down = Math.max(0, y - OUT)
    return down + 0.5 < reach * this.front((x - OUT) / this.cols)
  }

  /**
   * A box of the game, given by how far it is along the top (0 to 1) and
   * how many boxes down from it.
   */
  private atTop(along: number, down: number) {
    const x = Math.floor(along * this.cols)
    const y = Math.floor(down)
    if (x < 1 - OUT || y < 1 - OUT || x >= this.cols + OUT - 1) return -1
    if (y >= this.rows + OUT - 1) return -1
    return (y + OUT) * this.across + x + OUT
  }

  /**
   * Feeds the game from the top: in spots behind the front, drawn from the
   * bell along the top, wherever it has thinned below what it should be
   * there, a small soup is planted.
   * Through the rush it is fed all over, quickly; after, it is left alone
   * but for a spot near the front now and then.
   */
  private feed() {
    const { across, coming, wall } = this
    const reach = this.reach()
    const length = this.width() * Math.sqrt(2 * Math.PI) * this.cols
    const rushing = this.still || this.played < RUSH_FED_MS
    const spots = rushing
      ? Math.ceil((length * (reach + BEHIND) * 0.75) / FEED_AREA)
      : Math.random() < TRICKLE
        ? 1
        : 0
    for (let n = 0; n < spots; n++) {
      const along = this.middle + normal() * this.width()
      const front = reach * this.front(along)
      if (along < 0 || along >= 1 || front < 1) continue
      const inward = rushing
        ? Math.random() * (front + BEHIND) - BEHIND
        : front * (0.55 + Math.random() * 0.45)
      const i = this.atTop(along, inward)
      if (i < 0 || wall[i]) continue
      const should = DENSE * (1 - Math.max(0, inward) / front) ** FALLOFF
      let alive = 0
      for (let dy = -across; dy <= across; dy += across) {
        for (let dx = -1; dx <= 1; dx++) alive += coming[i + dy + dx]
      }
      if (alive / 9 >= should * FEED_UNDER) continue
      const thick = Math.min(0.5, 0.22 + should)
      for (let dy = -across; dy <= across; dy += across) {
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.random() < thick) this.planted.push(i + dy + dx)
        }
      }
    }
  }

  /**
   * Everything living, a clump at a time (boxes within two of each other
   * are one clump). A box with nothing new round it for a while may break
   * into quarters, and stays broken until something stirs. A clump with nothing new in it for a while goes: all of it
   * dies with the coming generation, and nothing is born of it. So does a
   * small clump that is clicked; in a large one, only the boxes round the
   * click.
   */
  private settle() {
    const { across, down, now, coming, doing, broken, clumpOf, stirred } = this
    doing.fill(0)
    clumpOf.fill(-1)
    const sizes: number[] = []
    const going: boolean[] = []
    const clump: number[] = []
    for (let first = 0; first < now.length; first++) {
      if (!now[first] || clumpOf[first] >= 0) continue
      const id = sizes.length
      clump.length = 0
      clump.push(first)
      clumpOf[first] = id
      let stir = 0
      for (let n = 0; n < clump.length; n++) {
        const x = clump[n] % across
        const y = (clump[n] - x) / across
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= across || ny >= down) continue
            const i = ny * across + nx
            if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
              stir = Math.max(stir, stirred[i])
            }
            if (now[i] && clumpOf[i] < 0) {
              clumpOf[i] = id
              clump.push(i)
            }
          }
        }
      }
      const hold = HOLD[0] + scramble(first) * (HOLD[1] - HOLD[0])
      sizes.push(clump.length)
      going.push(!this.still && this.generation - stir >= hold)
    }

    const hole: number[] = []
    for (const at of this.doomed) {
      const id = clumpOf[at]
      if (id < 0) continue
      if (sizes[id] <= SMALL) going[id] = true
      else hole.push(at)
    }
    this.doomed.length = 0

    const goes = (i: number) => {
      doing[i] = GOING
      for (let dy = -across; dy <= across; dy += across) {
        for (let dx = -1; dx <= 1; dx++) coming[i + dy + dx] = 0
      }
    }
    for (let i = 0; i < now.length; i++) {
      if (!now[i]) continue
      if (going[clumpOf[i]]) {
        goes(i)
        continue
      }
      let quiet = this.generation
      for (let dy = -across; dy <= across; dy += across) {
        for (let dx = -1; dx <= 1; dx++) {
          quiet = Math.min(quiet, this.generation - stirred[i + dy + dx])
        }
      }
      if (quiet < BREAK_AFTER || this.still) broken[i] = 0
      else if (!broken[i] && Math.random() < BREAK_CHANCE) broken[i] = 1
      if (broken[i]) doing[i] = BREAKS
    }
    for (let i = 0; i < now.length; i++) if (!now[i]) broken[i] = 0
    for (const at of hole) {
      for (let dy = -HOLE; dy <= HOLE; dy++) {
        for (let dx = -HOLE; dx <= HOLE; dx++) {
          const i = at + dy * across + dx
          if (now[i]) goes(i)
        }
      }
    }
  }

  /**
   * How each box is to be drawn by the end of the generation, and when each
   * part of that moves. It always moves from how the box was drawn as the
   * last generation ended, so nothing snaps.
   */
  private plan() {
    const { now, coming, doing, from, to, waits, takes, far } = this
    for (let i = 0; i < now.length; i++) {
      const at = i * LOOKS
      for (let k = 0; k < LOOKS; k++) from[at + k] = to[at + k]
      // This box's own moment to start in, and the rest of the generation.
      const late = scramble(i * 31 + this.generation * 7919) * STAGGER
      const left = 1 - late
      waits.fill(late, at, at + LOOKS)
      takes.fill(left, at, at + LOOKS)
      const shown =
        from[at + SCALE] > 0.001 &&
        from[at + QUARTER] +
          from[at + QUARTER + 1] +
          from[at + QUARTER + 2] +
          from[at + QUARTER + 3] >
          0.001
      const showing = coming[i] === 1 && doing[i] !== GOING
      if (!shown && !showing) continue

      const set = (look: readonly number[]) => {
        for (let k = 0; k < LOOKS; k++) to[at + k] = look[k]
      }
      const move = (k: number, wait: number, take: number) => {
        waits[at + k] = late + wait * left
        takes[at + k] = take * left
      }

      if (!shown) {
        // Born: from nothing, so it may start from whatever suits.
        if (this.measure(i, now)) {
          from.set(NOTHING, at)
          set(WHOLE)
          for (let q = 0; q < 4; q++) {
            move(QUARTER + q, (far[q] - 1) * QUARTERS_APART, QUARTER_TAKES)
          }
          move(PARTED, 1 - CLOSE_TAKES, CLOSE_TAKES)
        } else {
          from.set(WHOLE, at)
          from[at + SCALE] = 0
          set(WHOLE)
          move(SCALE, 0, WHOLE_TAKES)
        }
      } else if (doing[i] === GOING) {
        to[at + PARTED] = 1
        move(PARTED, 0, PART_TAKES)
        for (let q = 0; q < 4; q++) {
          to[at + QUARTER + q] = 0
          const wait = scramble(i * 4 + q) * (1 - QUARTER_TAKES)
          move(QUARTER + q, wait, QUARTER_TAKES)
        }
      } else if (!showing) {
        // Dying: back into whatever outlives it.
        if (this.measure(i, coming)) {
          to[at + PARTED] = 1
          move(PARTED, 0, PART_TAKES)
          for (let q = 0; q < 4; q++) {
            to[at + QUARTER + q] = 0
            move(QUARTER + q, (2 - far[q]) * QUARTERS_APART, QUARTER_TAKES)
          }
        } else {
          to[at + SCALE] = 0
          move(SCALE, 0, WHOLE_TAKES)
        }
      } else if (doing[i] === BREAKS) {
        set(WHOLE)
        to[at + PARTED] = 1
        move(PARTED, 0, PART_TAKES)
        for (let q = 0; q < 4; q++) {
          to[at + QUARTER + q] = BROKEN
          move(QUARTER + q, scramble(i * 4 + q) * 0.2, 0.8)
        }
      } else {
        // Living: whole, closing up if it had broken.
        set(WHOLE)
        for (let q = 0; q < 4; q++) move(QUARTER + q, 0, 0.7)
        move(PARTED, 0.45, CLOSE_TAKES)
      }
    }
  }

  /** A shape's boxes, with its corner at a box of the game. */
  private place(
    { cells }: ReturnType<typeof shape>,
    x: number,
    y: number,
    into: number[]
  ) {
    const { across, down } = this
    for (const [cx, cy] of cells) {
      const bx = x + cx
      const by = y + cy
      if (bx < 1 || by < 1 || bx >= across - 1 || by >= down - 1) continue
      into.push(by * across + bx)
    }
  }

  /** Reduced motion: the game grown a while offline and left as it stands. */
  private growStill() {
    for (let n = 0; n < 60; n++) {
      if (n < 12) this.feed()
      this.generate()
    }
    this.through = 1
    this.draw()
  }

  private run = (time: number) => {
    if (this.destroyed) return
    const passed = Math.min(100, this.last ? time - this.last : 0)
    this.last = time
    this.waited += passed
    if (this.waited >= START_MS) {
      this.played += passed
      // The more stirred, the shorter the generation; and it calms.
      const takes = SLOW_MS / (1 + (SLOW_MS / FAST_MS - 1) * this.stir)
      this.stir *= Math.exp(-passed / CALM_MS)
      this.through += passed / takes
      if (this.through >= 1) {
        this.generate()
        this.through = Math.min(this.through - 1, 0.1)
      }
    }
    this.light(passed)
    this.draw()
    this.frame = requestAnimationFrame(this.run)
  }

  /** The pointer's box and the living boxes round it come up; the rest go. */
  private light(passed: number) {
    const { across, lit, now, coming, pointed } = this
    const px = pointed % across
    const py = (pointed - px) / across
    const up = 1 - Math.exp(-passed / LIT_IN_MS)
    const off = 1 - Math.exp(-passed / LIT_OUT_MS)
    for (let y = OUT; y < OUT + this.rows; y++) {
      for (let x = OUT; x < OUT + this.cols; x++) {
        const i = y * across + x
        const near =
          pointed >= 0 && Math.abs(x - px) < 2 && Math.abs(y - py) < 2
        const to = near && (i === pointed || now[i] || coming[i]) ? 1 : 0
        if (lit[i] === to) continue
        lit[i] += (to - lit[i]) * (to > lit[i] ? up : off)
        if (Math.abs(to - lit[i]) < 0.004) lit[i] = to
      }
    }
  }

  // The page.

  private theme() {
    this.dark = document.documentElement.classList.contains("dark")
    this.ink = getComputedStyle(this.canvas).color
  }

  private resize() {
    if (this.destroyed) return
    const rect = this.canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    const box = boxFor(width)
    this.dpr = dpr
    this.cols = Math.ceil(width / box)
    this.rows = Math.ceil(height / box)
    this.left = Math.floor((width - this.cols * box) / 2)
    this.top = Math.floor((height - this.rows * box) / 2)
    this.canvas.width = Math.round(width * dpr)
    this.canvas.height = Math.round(height * dpr)
    this.lay(this.cols + OUT * 2, this.rows + OUT * 2, box !== this.box)
    this.box = box
    this.measureClearing(rect)
    this.drawGrid()
    this.draw()
  }

  /**
   * The game laid out anew, keeping what was on it unless it starts over.
   * Every box is then drawn as it stands, without easing from before.
   */
  private lay(across: number, down: number, over: boolean) {
    if (across === this.across && down === this.down && !over) return
    const size = across * down
    const carry = <
      T extends Uint8Array | Uint16Array | Int32Array | Float32Array,
    >(
      old: T
    ) => {
      const laid = new (old.constructor as new (n: number) => T)(size)
      if (over) return laid
      for (let y = 0; y < Math.min(down, this.down); y++) {
        for (let x = 0; x < Math.min(across, this.across); x++) {
          laid[y * across + x] = old[y * this.across + x]
        }
      }
      return laid
    }
    this.before = carry(this.before)
    this.now = carry(this.now)
    this.coming = carry(this.coming)
    this.age = carry(this.age)
    this.stirred = carry(this.stirred)
    this.blue = carry(this.blue)
    this.blueComing = carry(this.blueComing)
    this.doing = new Uint8Array(size)
    this.broken = new Uint8Array(size)
    this.clumpOf = new Int32Array(size)
    this.lit = new Float32Array(size)
    this.wall = new Uint8Array(size)
    this.from = new Float32Array(size * LOOKS)
    this.to = new Float32Array(size * LOOKS)
    this.waits = new Float32Array(size * LOOKS)
    this.takes = new Float32Array(size * LOOKS).fill(1)
    this.planted.length = 0
    this.clicked.length = 0
    this.doomed.length = 0
    this.pointed = -1
    this.across = across
    this.down = down
    for (let i = 0; i < size; i++) {
      const look = this.coming[i] ? WHOLE : NOTHING
      this.from.set(look, i * LOOKS)
      this.to.set(look, i * LOOKS)
    }
  }

  /** The copy's box, out to whole boxes and a margin: nothing lives there. */
  private measureClearing(canvasRect: DOMRect) {
    const { box, across, down } = this
    this.wall.fill(0)
    this.clearing = null
    const copy = this.clear?.getBoundingClientRect()
    if (!copy || !copy.width) return
    const x = (at: number) => (at - canvasRect.left - this.left) / box
    const y = (at: number) => (at - canvasRect.top - this.top) / box
    const left = Math.floor(x(copy.left)) - CLEAR_MARGIN
    const top = Math.floor(y(copy.top)) - CLEAR_MARGIN
    const right = Math.ceil(x(copy.right)) + CLEAR_MARGIN
    const bottom = Math.ceil(y(copy.bottom)) + CLEAR_MARGIN
    this.clearing = [left, top, right, bottom]
    for (
      let by = Math.max(0, top + OUT);
      by < Math.min(down, bottom + OUT);
      by++
    ) {
      for (
        let bx = Math.max(0, left + OUT);
        bx < Math.min(across, right + OUT);
        bx++
      ) {
        const i = by * across + bx
        this.wall[i] = 1
        this.now[i] = this.coming[i] = 0
        this.from.set(NOTHING, i * LOOKS)
        this.to.set(NOTHING, i * LOOKS)
      }
    }
  }

  /** Dotted paper: a dot at every corner of a box, and none in the clearing. */
  private drawGrid() {
    const { box, dpr, cols, rows, left, top } = this
    const grid = this.grid ?? document.createElement("canvas")
    this.grid = grid
    grid.width = this.canvas.width
    grid.height = this.canvas.height
    const context = grid.getContext("2d")!
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.fillStyle = this.ink
    context.globalAlpha = INK[this.dark ? "dark" : "light"].grid
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        if (this.clearing) {
          const [cl, ct, cr, cb] = this.clearing
          if (x > cl && x < cr && y > ct && y < cb) continue
        }
        context.fillRect(left + x * box, top + y * box, GAP, GAP)
      }
    }
  }

  /**
   * How far each quarter of a box is from the living boxes round it, into
   * `far`: 1 for a quarter that touches one, 2 for one that does not.
   * Whether they differ: if not, the box grows or shrinks as one square.
   */
  private measure(i: number, living: Uint8Array) {
    const { across, far } = this
    far.fill(2)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || !living[i + dy * across + dx]) continue
        for (let q = 0; q < 4; q++) {
          const qx = q & 1
          const qy = q >> 1
          const touches =
            (dx === 0 || (dx < 0 ? qx === 0 : qx === 1)) &&
            (dy === 0 || (dy < 0 ? qy === 0 : qy === 1))
          if (touches) far[q] = 1
        }
      }
    }
    return far[0] !== far[1] || far[0] !== far[2] || far[0] !== far[3]
  }

  /** A square about a point, in the ink, with as much of the blue as asked. */
  private square(
    x: number,
    y: number,
    side: number,
    ink: number,
    blue: number
  ) {
    if (side < 0.4) return
    const { context } = this
    const corner = side / 2
    if (blue < 0.995) {
      context.globalAlpha = ink * (1 - blue)
      context.fillRect(x - corner, y - corner, side, side)
    }
    if (blue <= 0.005) return
    context.globalAlpha = Math.min(1, ink * 1.5 + 0.2) * blue
    context.fillStyle = INK[this.dark ? "dark" : "light"].sky
    context.fillRect(x - corner, y - corner, side, side)
    context.fillStyle = this.ink
  }

  /** The page: every box, as far from how it was to how it will be as the game is. */
  private draw() {
    const { context, dpr, across, box, now, coming, from, to, waits, takes } =
      this
    const at = this.through
    const side = box - GAP
    const palette = INK[this.dark ? "dark" : "light"]
    const inks = palette.boxes
    const inkAt = (lived: number) => {
      const whole = Math.min(Math.floor(lived), inks.length - 1)
      const next = Math.min(whole + 1, inks.length - 1)
      return inks[whole] + (inks[next] - inks[whole]) * (lived - whole)
    }
    const look = new Float32Array(LOOKS)
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalAlpha = 1
    context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if (this.grid) context.drawImage(this.grid, 0, 0)
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.fillStyle = this.ink
    for (let y = OUT; y < OUT + this.rows; y++) {
      for (let x = OUT; x < OUT + this.cols; x++) {
        const i = y * across + x
        const lit = this.lit[i]
        // The middle of the box's square, which sits past the gap.
        const cx = this.left + (x - OUT) * box + (box + GAP) / 2
        const cy = this.top + (y - OUT) * box + (box + GAP) / 2

        const base = i * LOOKS
        let area = 0
        for (let k = 0; k < LOOKS; k++) {
          const a = from[base + k]
          const b = to[base + k]
          look[k] =
            a === b
              ? a
              : a + (b - a) * arrive((at - waits[base + k]) / takes[base + k])
        }
        for (let q = 0; q < 4; q++) area += look[QUARTER + q]
        area *= look[SCALE]
        if (area < 0.002) {
          if (lit > 0.01) {
            this.square(cx, cy, side * arrive(lit), palette.bare, lit)
          }
          continue
        }

        const ink = now[i] ? inkAt(this.age[i] + at) : inks[0]
        const blue = Math.max(
          lit,
          !now[i]
            ? this.blueComing[i]
            : !coming[i]
              ? this.blue[i]
              : this.blue[i] + (this.blueComing[i] - this.blue[i]) * at
        )

        const scale = look[SCALE]
        const parted = look[PARTED] * GAP
        if (
          parted < 0.02 &&
          look[QUARTER] > 0.999 &&
          look[QUARTER + 1] > 0.999 &&
          look[QUARTER + 2] > 0.999 &&
          look[QUARTER + 3] > 0.999
        ) {
          this.square(cx, cy, side * scale, ink, blue)
          continue
        }
        const offset = (scale * (side + parted)) / 4
        const quarter = (scale * (side - parted)) / 2
        for (let q = 0; q < 4; q++) {
          this.square(
            cx + ((q & 1) * 2 - 1) * offset,
            cy + ((q >> 1) * 2 - 1) * offset,
            quarter * look[QUARTER + q],
            ink,
            blue
          )
        }
      }
    }
  }

  /** The box of the game a pointer is over, or -1 off the page or the copy. */
  private boxAt(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect()
    const x = Math.floor((event.clientX - rect.left - this.left) / this.box)
    const y = Math.floor((event.clientY - rect.top - this.top) / this.box)
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return -1
    const at = (y + OUT) * this.across + x + OUT
    return this.wall[at] ? -1 : at
  }

  private onPointerMove = (event: PointerEvent) => {
    this.pointed = event.pointerType === "mouse" ? this.boxAt(event) : -1
  }

  private onLeave = () => {
    this.pointed = -1
  }

  /**
   * A click on bare paper plants a seed; on anything living, crumbles it.
   * Either way it stirs the game, so it shows within a moment.
   */
  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    const target = event.target as Element | null
    if (target?.closest?.("a, button, input")) return
    const at = this.boxAt(event)
    if (at < 0) return
    const { across } = this
    let living = -1
    for (let dy = -across; dy <= across; dy += across) {
      for (let dx = -1; dx <= 1; dx++) {
        if (this.coming[at + dy + dx]) living = at + dy + dx
      }
    }
    if (living >= 0) {
      this.doomed.push(living)
    } else {
      const seed = shape(pick(CLICKED))
      const x = at % across
      this.place(
        seed,
        x - Math.floor(seed.width / 2),
        (at - x) / across - Math.floor(seed.height / 2),
        this.clicked
      )
    }
    this.lit[at] = 1
    this.stir = Math.max(this.stir, CLICK_STIR)
  }
}
