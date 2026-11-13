/**
 * Double-clicking the homepage's scene: the night's Giant points his beams
 * there, the day's plane flies there. Shared so both read a double click the
 * same way, and both leave text selection alone unless it was the point.
 */

/** Links and controls keep their own clicks. */
export function isInteractive(target: EventTarget | null) {
  return (
    target instanceof Element &&
    !!target.closest("a, button, input, textarea, select, [role='button']")
  )
}

/** Whether a point is on a character of text, not just inside its box. */
function isOverText(x: number, y: number) {
  const doc = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  let node: Node | null = null
  let offset = 0
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y)
    node = position?.offsetNode ?? null
    offset = position?.offset ?? 0
  } else if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y)
    node = range?.startContainer ?? null
    offset = range?.startOffset ?? 0
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return false
  // The caret falls between two characters: check the one on either side.
  const length = node.textContent?.length ?? 0
  const range = document.createRange()
  for (const start of [offset - 1, offset]) {
    if (start < 0 || start >= length) continue
    range.setStart(node, start)
    range.setEnd(node, start + 1)
    for (const rect of range.getClientRects()) {
      if (
        x >= rect.left - 1 &&
        x <= rect.right + 1 &&
        y >= rect.top - 1 &&
        y <= rect.bottom + 1
      ) {
        return true
      }
    }
  }
  return false
}

/**
 * Calls `onDouble` for a double click anywhere on the page except on a link,
 * a control or the text itself (double-clicking a word selects it: that was
 * the point). A double click beside the copy (past the end of a line,
 * between paragraphs) would also select the nearest word, so that selection
 * is held back. With `touch`, a double tap counts too. Returns the cleanup.
 */
export function watchDoubleClicks(
  onDouble: (x: number, y: number) => void,
  { touch = false }: { touch?: boolean } = {}
) {
  const missesText = (event: MouseEvent) =>
    !isInteractive(event.target) && !isOverText(event.clientX, event.clientY)

  const onMouseDown = (event: MouseEvent) => {
    if (event.detail >= 2 && event.button === 0 && missesText(event)) {
      event.preventDefault()
    }
  }
  const onDoubleClick = (event: MouseEvent) => {
    if (missesText(event)) onDouble(event.clientX, event.clientY)
  }
  let lastTap = { at: -Infinity, x: 0, y: 0 }
  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerType !== "touch" || isInteractive(event.target)) return
    const at = performance.now()
    if (
      at - lastTap.at < 320 &&
      Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 40
    ) {
      onDouble(event.clientX, event.clientY)
      lastTap = { at: -Infinity, x: 0, y: 0 }
    } else {
      lastTap = { at, x: event.clientX, y: event.clientY }
    }
  }

  window.addEventListener("mousedown", onMouseDown)
  window.addEventListener("dblclick", onDoubleClick)
  if (touch)
    window.addEventListener("pointerup", onPointerUp, { passive: true })
  return () => {
    window.removeEventListener("mousedown", onMouseDown)
    window.removeEventListener("dblclick", onDoubleClick)
    window.removeEventListener("pointerup", onPointerUp)
  }
}
