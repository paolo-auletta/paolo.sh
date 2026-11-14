"""
The 404 page's layers, from one frame of 8½ (Fellini, 1963): the opening
dream, looking down past Guido's ankle at the man on the beach who holds the
rope (still from FilmGrab).

Writes to public/404/:
  beach.jpg       the frame with the leg and the free run of rope painted out
  leg.webp        the leg alone, cut out, to swing on its own

Both are mirrored, so the leg hangs in from the right and the copy sits
on the open sand. The rope itself is drawn live by the page
(components/not-found/beach.ts), from the cuff to the hand.

    python scripts/404/bake.py      # needs numpy and opencv-python
"""

from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).parent
OUT = HERE.parent.parent / "public" / "404"

# Drawn by hand on the unmirrored 1280×688 frame, within a few px of the
# leg's edge: `cut_leg` snaps it the rest of the way.
LEG_OUTLINE = [
    # the shoe's dark side, measured: where it drops below 80
    (250, 75), (266, 45), (283, 15), (296, 0),
    # the shoe's lit welt, as bright as the sand: traced, and kept as drawn
    (372, 0), (381, 25), (386, 50), (390, 90), (390, 120), (388, 150),
    (383, 180), (377, 200), (372, 220), (368, 235), (364, 250),
    # the turn-up, the cuff, the trouser
    (366, 257), (394, 270), (410, 280), (417, 290), (421, 305), (422, 320),
    (405, 395), (350, 440), (335, 455), (320, 500), (290, 570), (250, 640),
    (222, 688), (0, 688), (0, 312), (90, 300), (175, 296), (206, 262),
    (211, 215), (215, 170), (222, 135), (233, 105),
]
# Where the outline is kept as drawn: (x0, y0, x1, y1), and outward of x0.
WELT = (355, 0, 420, 262)
ROPE = [
    (330, 452), (400, 438), (450, 428), (520, 416), (570, 407), (592, 398),
    (604, 380), (612, 350), (620, 310), (628, 280), (635, 260),
]
# Px of the outline's points are worked to: 1/8.
SUBPIXEL = 3


def disc(n):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))


def smooth_closed(values, sigma):
    """A Gaussian along a closed curve's points (or values at them)."""
    r = int(sigma * 3)
    kernel = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    kernel /= kernel.sum()
    padded = np.concatenate([values[-r:], values, values[:r]])
    if values.ndim == 1:
        return np.convolve(padded, kernel, "valid")
    return np.stack(
        [np.convolve(padded[:, i], kernel, "valid") for i in range(values.shape[1])], 1
    )


def median_closed(values, width):
    half = width // 2
    padded = np.concatenate([values[-half:], values, values[:half]])
    return np.median(np.lib.stride_tricks.sliding_window_view(padded, width), axis=1)


def cut_leg(frame):
    """The leg's matte, 0–255, antialiased. The outline is walked a pixel at
    a time, and each point moves along its normal to the steepest rise from
    the dark leg to the bright sand (about 40 against 125, over ~8px). The
    moves are smoothed along the outline, so a grain of sand can't pull it
    off course. On the welt, which is as bright as the sand, there is no
    such rise, and the traced outline stands."""
    h, w = frame.shape
    blur = cv2.GaussianBlur(frame.astype(np.float32), (0, 0), 1.2)

    # The outline, a point per px, softened a little.
    closed = np.array(LEG_OUTLINE + LEG_OUTLINE[:1], np.float64)
    run = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(closed, axis=0), axis=1))])
    at = np.arange(0, run[-1], 1.0)
    base = np.stack([np.interp(at, run, closed[:, 0]), np.interp(at, run, closed[:, 1])], 1)
    base = smooth_closed(base, 2)
    tangent = np.gradient(base, axis=0)
    tangent /= np.linalg.norm(tangent, axis=1, keepdims=True) + 1e-9
    normal = np.stack([tangent[:, 1], -tangent[:, 0]], 1)
    inside = np.zeros_like(frame)
    cv2.fillPoly(inside, [np.array(LEG_OUTLINE, np.int32)], 255)
    probe = np.clip((base + normal * 4).round().astype(int), 0, [w - 1, h - 1])
    if (inside[probe[:, 1], probe[:, 0]] > 0).mean() > 0.5:
        normal = -normal  # outward

    # Each point's profile across the edge, and the steepest rise in it.
    reach = np.arange(-12, 12.01, 0.25)
    xs = (base[:, None, 0] + normal[:, None, 0] * reach).astype(np.float32)
    ys = (base[:, None, 1] + normal[:, None, 1] * reach).astype(np.float32)
    profile = cv2.remap(blur, xs, ys, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    move = reach[np.argmax(np.gradient(profile, axis=1), axis=1)]

    x0, y0, x1, y1 = WELT
    kept = (base[:, 0] < 2) | (base[:, 1] < 2) | (base[:, 0] > w - 3) | (base[:, 1] > h - 3)
    kept |= (base[:, 0] >= x0) & (base[:, 0] <= x1) & (base[:, 1] >= y0) & (base[:, 1] <= y1)
    move[kept] = 0
    move = smooth_closed(median_closed(move, 21), 3)
    move[kept] = 0
    edge = base + normal * move[:, None]

    matte = np.zeros_like(frame)
    points = (edge * (1 << SUBPIXEL)).round().astype(np.int32)
    cv2.fillPoly(matte, [points], 255, cv2.LINE_AA, SUBPIXEL)
    return matte


def leg_colours(frame, matte):
    """The frame under the leg, with its edge's px carried on from inside, so
    the sand they half show doesn't swing with the leg as a pale fringe."""
    solid = matte >= 250
    fringe = (cv2.dilate((matte > 0).astype(np.uint8), disc(5)) > 0) & ~solid
    return cv2.inpaint(frame, fringe.astype(np.uint8) * 255, 3, cv2.INPAINT_TELEA)


def paint_out(frame, matte):
    """The beach without the leg or the rope. Round the leg, a little of it
    shows as the leg swings, so it must read as sand: the inpaint gives the
    light, and the sand's texture is taken from clean sand elsewhere in the
    frame (the nearest of a grid of offsets that lands on some)."""
    hole = cv2.dilate((matte > 0).astype(np.uint8) * 255, disc(25))
    # The rope's glow runs a few px past it.
    cv2.polylines(hole, [np.array(ROPE, np.int32)], False, 255, 19)
    light = cv2.inpaint(frame, hole, 9, cv2.INPAINT_TELEA).astype(np.float32)

    f = frame.astype(np.float32)
    low = cv2.GaussianBlur(f, (0, 0), 4)
    detail = f - low
    # Clean sand: busy, neither shadow nor sun-bleached, nowhere near the
    # hole, and short of the shore, whose foam is busy too.
    h, w = frame.shape
    busy = cv2.GaussianBlur(np.abs(detail), (0, 0), 6)
    y, x = np.mgrid[0:h, 0:w]
    shore = y + 0.81 * (x - 400) > 620
    sand = (busy > 6) & (low > 95) & (low < 160) & ~shore
    sand &= cv2.dilate(hole, disc(15)) == 0
    sand = cv2.erode(sand.astype(np.uint8), disc(9)) > 0

    ys, xs = np.nonzero(hole)
    texture = np.zeros(len(ys), np.float32)
    found = np.zeros(len(ys), bool)
    offsets = [(dx, dy) for dx in range(440, 920, 80) for dy in range(-480, 241, 60)]
    offsets.sort(key=lambda o: abs(o[0] - 520) + abs(o[1]))
    for dx, dy in offsets:
        sx, sy = xs + dx, ys + dy
        ok = ~found & (sx >= 0) & (sx < w) & (sy >= 0) & (sy < h)
        ok[ok] &= sand[sy[ok], sx[ok]]
        texture[ok] = detail[sy[ok], sx[ok]]
        found |= ok
    noise = np.random.default_rng(1).normal(0, 10, frame.shape).astype(np.float32)
    grain = cv2.GaussianBlur(noise, (0, 0), 1.1)
    texture[~found] = grain[ys[~found], xs[~found]]

    beach = f.copy()
    beach[ys, xs] = cv2.GaussianBlur(light, (0, 0), 4)[ys, xs] + texture
    # Into the frame around the hole without a seam.
    blend = cv2.GaussianBlur((hole > 0).astype(np.float32), (0, 0), 2)
    beach = f * (1 - blend) + beach * blend
    return np.clip(beach, 0, 255).astype(np.uint8)


def main():
    frame = cv2.imread(str(HERE / "frame.jpg"), cv2.IMREAD_GRAYSCALE)
    matte = cut_leg(frame)
    beach = paint_out(frame, matte)
    colours = leg_colours(frame, matte)
    leg_rgba = np.dstack([colours, colours, colours, matte])
    leg_rgba[matte == 0, :3] = 0

    def mirror(a):
        return np.ascontiguousarray(a[:, ::-1])

    OUT.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(OUT / "beach.jpg"), mirror(beach), [cv2.IMWRITE_JPEG_QUALITY, 88])
    cv2.imwrite(str(OUT / "leg.webp"), mirror(leg_rgba), [cv2.IMWRITE_WEBP_QUALITY, 92])

    lum = np.sort(frame[frame > 6].ravel())
    lo, hi = lum[int(len(lum) * 0.01)], lum[int(len(lum) * 0.995)]
    print(f"levels {lo}–{hi} (LEVELS in components/not-found/beach.ts)")


if __name__ == "__main__":
    main()
