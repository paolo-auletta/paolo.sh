import { useLayoutEffect, useRef, type RefObject } from "react"

/**
 * Hands a server-rendered page over to its entrance before the first paint.
 *
 * The page renders with a pending data attribute that hides it in CSS (with
 * a delayed fallback reveal, in globals.css, in case the script never
 * runs). On mount the attribute comes off and `run` animates the page in,
 * unless the fallback is already showing it, or the reader prefers reduced
 * motion.
 *
 * That decision is taken once per mount and kept: the layout effect can run
 * again for the same page (React runs it twice in development), and by then
 * the attribute is gone and the page reads as already shown.
 */
export function useEntrance(
  ref: RefObject<HTMLElement | null>,
  {
    pending,
    probe,
    enabled = true,
  }: {
    /** The pending attribute, as a dataset key: "paperPending". */
    pending: string
    /** An element that is hidden until the entrance, to test visibility. */
    probe: string
    /**
     * False to arrive already settled. The page should then not render the
     * pending attribute at all, so nothing is hidden in the first place.
     */
    enabled?: boolean
  },
  run: (root: HTMLElement) => () => void
) {
  const animate = useRef<boolean | null>(enabled ? null : false)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    if (animate.current === null) {
      const first = root.querySelector(probe)
      const shown = first ? Number(getComputedStyle(first).opacity) > 0 : false
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
      animate.current = !shown && !reduced
      delete root.dataset[pending]
    }
    if (!animate.current) return
    return run(root)
    // Runs once per mount; `run` is a module-level animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
