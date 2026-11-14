"""
The 404 page's layers, from one frame of 8½ (Fellini, 1963): the opening
dream, looking down past Guido's ankle at the man on the beach who holds the
rope (still from FilmGrab).

Writes to public/404/:
  beach.jpg       the frame with the leg and the free run of rope painted out
  leg.webp        the leg alone, cut out, to swing on its own
  blue-noise.png  the threshold map the page dithers against

All three are mirrored, so the leg hangs in from the right and the copy sits
on the open sand. The rope itself is drawn live by the page
(components/not-found/beach.ts), from the cuff to the hand.

    python scripts/404/bake.py      # needs numpy and opencv-python
"""

from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).parent
OUT = HERE.parent.parent / "public" / "404"

# Drawn by hand on the unmirrored 1280×688 frame.
LEG_OUTLINE = [
    (225, 30), (262, 0), (375, 0), (392, 60), (392, 180), (380, 240),
    (410, 262), (422, 320), (405, 395), (350, 440), (335, 455), (320, 500),
    (290, 570), (250, 640), (222, 688), (0, 688), (0, 312), (90, 300),
    (175, 296), (200, 262), (212, 215), (208, 140),
]
ROPE = [
    (330, 452), (400, 438), (450, 428), (520, 416), (570, 407), (592, 398),
    (604, 380), (612, 350), (620, 310), (628, 280), (635, 260),
]
# The shoe's lit side is brighter than the cut below; there the outline is
# already on the edge. (y0, y1, x0, x1)
SHOE_SHINE = (0, 250, 300, 420)


def disc(n):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))


def cut_leg(frame):
    """The leg's mask. The leg is dark against bright sand (about 49 against
    113, over ~6px), so its edge is a threshold taken near the outline; the
    outline's core keeps the rope wrapped round the cuff and the shoe's
    highlights."""
    outline = np.zeros_like(frame)
    cv2.fillPoly(outline, [np.array(LEG_OUTLINE, np.int32)], 255)
    blur = cv2.GaussianBlur(frame, (0, 0), 1.4)
    near = cv2.dilate(outline, disc(41)) > 0
    core = cv2.erode(outline, disc(29)) > 0
    leg = np.where((near & (blur < 84)) | core, 255, 0).astype(np.uint8)

    rope = np.zeros_like(frame)
    cv2.polylines(rope, [np.array(ROPE[1:], np.int32)], False, 255, 9)
    leg[rope > 0] = 0
    leg = cv2.morphologyEx(leg, cv2.MORPH_OPEN, disc(7))

    y0, y1, x0, x1 = SHOE_SHINE
    shine = np.zeros_like(frame)
    shine[y0:y1, x0:x1] = 255
    leg[(shine > 0) & (cv2.erode(outline, disc(5)) > 0)] = 255

    # One solid piece, its holes filled, its edge smoothed.
    _, labels, stats, _ = cv2.connectedComponentsWithStats(leg)
    biggest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    leg = np.where(labels == biggest, 255, 0).astype(np.uint8)
    leg = cv2.morphologyEx(leg, cv2.MORPH_CLOSE, disc(11))
    leg = cv2.morphologyEx(leg, cv2.MORPH_OPEN, disc(9))
    contours, _ = cv2.findContours(leg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    leg = np.zeros_like(leg)
    cv2.drawContours(leg, contours, -1, 255, cv2.FILLED)
    return leg


def paint_out(frame, leg):
    """The beach without the leg or the rope. Only a few pixels of it show,
    round the leg as it swings, so a smooth inpaint with the sand's grain
    put back is enough."""
    hole = cv2.dilate(leg, disc(31))
    cv2.polylines(hole, [np.array(ROPE, np.int32)], False, 255, 13)
    beach = cv2.inpaint(frame, hole, 9, cv2.INPAINT_TELEA).astype(np.float32)
    noise = np.random.default_rng(1).normal(0, 10, frame.shape).astype(np.float32)
    grain = cv2.GaussianBlur(noise, (0, 0), 1.1)
    beach = np.where(hole > 0, np.clip(beach + grain, 0, 255), beach)
    return beach.astype(np.uint8)


def blue_noise(size=128, sigma=1.6, seed=7):
    """Void-and-cluster (Ulichney, 1993): a threshold map whose dots never
    clump, at any grey."""
    rng = np.random.default_rng(seed)
    d = np.minimum(np.arange(size), size - np.arange(size))
    kernel = np.exp(-(d[:, None] ** 2 + d[None, :] ** 2) / (2 * sigma * sigma))

    def stamp(energy, index, sign):
        i, j = divmod(index, size)
        energy += sign * np.roll(np.roll(kernel, i, 0), j, 1)

    def tightest(pattern, energy):
        return np.argmax(np.where(pattern == 1, energy, -np.inf))

    def emptiest(pattern, energy):
        return np.argmin(np.where(pattern == 0, energy, np.inf))

    pattern = np.zeros((size, size))
    pattern.flat[rng.choice(size * size, size * size // 10, replace=False)] = 1
    energy = np.real(np.fft.ifft2(np.fft.fft2(pattern) * np.fft.fft2(kernel)))
    while True:  # relax the seed until it is evenly spread
        cluster = tightest(pattern, energy)
        pattern.flat[cluster] = 0
        stamp(energy, cluster, -1)
        void = emptiest(pattern, energy)
        pattern.flat[void] = 1
        stamp(energy, void, 1)
        if void == cluster:
            break

    rank = np.zeros(size * size, int)
    ones = int(pattern.sum())
    seed_pattern, seed_energy = pattern.copy(), energy.copy()
    for r in range(ones - 1, -1, -1):  # rank the seed, tightest first
        cluster = tightest(seed_pattern, seed_energy)
        seed_pattern.flat[cluster] = 0
        stamp(seed_energy, cluster, -1)
        rank[cluster] = r
    for r in range(ones, size * size):  # then fill the voids, largest first
        void = emptiest(pattern, energy)
        pattern.flat[void] = 1
        stamp(energy, void, 1)
        rank[void] = r
    return ((rank.reshape(size, size) + 0.5) / (size * size) * 256).astype(np.uint8)


def main():
    frame = cv2.imread(str(HERE / "frame.jpg"), cv2.IMREAD_GRAYSCALE)
    leg = cut_leg(frame)
    beach = paint_out(frame, leg)
    alpha = cv2.GaussianBlur(leg, (0, 0), 0.9)
    leg_rgba = np.dstack([frame, frame, frame, alpha])
    leg_rgba[alpha == 0, :3] = 0

    def mirror(a):
        return np.ascontiguousarray(a[:, ::-1])

    OUT.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(OUT / "beach.jpg"), mirror(beach), [cv2.IMWRITE_JPEG_QUALITY, 88])
    cv2.imwrite(str(OUT / "leg.webp"), mirror(leg_rgba), [cv2.IMWRITE_WEBP_QUALITY, 92])
    cv2.imwrite(str(OUT / "blue-noise.png"), blue_noise())

    lum = np.sort(frame[frame > 6].ravel())
    lo, hi = lum[int(len(lum) * 0.01)], lum[int(len(lum) * 0.995)]
    print(f"levels {lo}–{hi} (LEVELS in components/not-found/beach.ts)")


if __name__ == "__main__":
    main()
