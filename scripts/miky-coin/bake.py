"""
Bake the coin on the /miky page.

The coin is his head struck as a bas-relief inside a Greek-key rim, made
the way the album bakes its cover (scripts/album-relief/generate.py): the
subject is cut out of the photo, raised as a rounded pillow, and the photo's
own light and shade are read back as sculpted detail.

Out, in public/miky/coin/:

  face.webp    the photo, framed so his head sits centred in the coin's
               field; the page prints it in blue on plaster
  normal.webp  tangent-space normals of the whole coin, rim and all
  shade.webp   the relief's own light and shade (grey), for the metal's form
  mask.webp    the coin's disc: where it turns to silver under the cursor

The geometry must match app/(athens)/miky/page.tsx: the field's inset (FACE_INSET)
and the key's rim (COIN_KEYS, COIN_OUTER, COIN_STEP).

Run with a Python that has numpy, scipy, pillow and rembg:

  python scripts/miky-coin/bake.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "album-relief"))

from generate import (  # noqa: E402
    LIGHT,
    blur,
    cast_shadow,
    dome,
    normals_from_height,
    save_gray,
    save_rgb,
    smoothstep,
)

PHOTO = ROOT / "public" / "miky" / "66291a3b-89ac-4515-8d0d-f57b03f6488c.jpg"
OUT = ROOT / "public" / "miky" / "coin"
SUBJECT_MASK = HERE / "subject-mask.png"

S = 1024  # the coin's texture, edge to edge
FACE_INSET = 0.096  # the field's inset from the coin's edge (page: .mk-coin-face)
# The field, in the photo: centred between his eyes, wide enough for his
# hair and down to his chin (the photo stops just under it).
FIELD_CENTRE = (286, 400)
FIELD_RADIUS = 318
# The key around the rim, in the page's 0–100 units.
COIN_KEYS, COIN_OUTER, COIN_STEP = 30, 48.4, 0.8
KEY = [(0, 8), (0, 0), (8, 0), (8, 6), (4, 6), (4, 4), (6, 4), (6, 2), (2, 2), (2, 8), (10, 8)]


def framed_photo(size):
    """The photo cropped to the field's square. Past the photo's sides (a
    sliver at his ears), it is mirrored, so the field is never empty."""
    im = ImageOps.exif_transpose(Image.open(PHOTO)).convert("RGB")
    pad = FIELD_RADIUS
    padded = ImageOps.expand(im, border=pad)
    w, h = im.size
    # Mirror into the border, side by side, top and bottom.
    padded.paste(ImageOps.mirror(im.crop((0, 0, pad, h))), (0, pad))
    padded.paste(ImageOps.mirror(im.crop((w - pad, 0, w, h))), (pad + w, pad))
    padded.paste(ImageOps.flip(padded.crop((0, pad + h - pad, w + 2 * pad, pad + h))), (0, pad + h))
    padded.paste(ImageOps.flip(padded.crop((0, pad, w + 2 * pad, 2 * pad))), (0, 0))
    cx, cy = FIELD_CENTRE[0] + pad, FIELD_CENTRE[1] + pad
    box = (cx - FIELD_RADIUS, cy - FIELD_RADIUS, cx + FIELD_RADIUS, cy + FIELD_RADIUS)
    return padded.crop(box).resize((size, size), Image.LANCZOS)


def subject_mask(im):
    if SUBJECT_MASK.exists():
        m = Image.open(SUBJECT_MASK).convert("L")
    else:
        from rembg import new_session, remove

        m = remove(im, session=new_session("isnet-general-use"), only_mask=True)
        m.save(SUBJECT_MASK)
    return np.asarray(m.resize(im.size, Image.LANCZOS), np.float32) / 255


def key_strokes():
    """The rim's Greek key as polylines in texture pixels."""

    def at(x, y):
        a = (x / (COIN_KEYS * 10)) * math.pi * 2 - math.pi / 2
        r = (COIN_OUTER - (y + 0.6) * COIN_STEP) * S / 100
        return (S / 2 + math.cos(a) * r, S / 2 + math.sin(a) * r)

    points = []
    for k in range(COIN_KEYS):
        for i, (x, y) in enumerate(KEY):
            if k > 0 and i == 0:
                continue
            if i > 0:
                px, py = KEY[i - 1]
                if py == y and abs(x - px) > 1:
                    n = abs(x - px) * 4
                    for j in range(1, n):
                        points.append(at(k * 10 + px + (x - px) * j / n, y))
            points.append(at(k * 10 + x, y))
    points.append(points[0])
    return points


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    r = np.hypot(xx - S / 2, yy - S / 2) / (S / 2)  # 0 centre → 1 edge
    field_r = 1 - 2 * FACE_INSET

    # The field: the framed photo, as big as the field.
    field_px = int(round(S * field_r))
    photo = framed_photo(field_px)
    photo.resize((900, 900), Image.LANCZOS).save(OUT / "face.webp", quality=88, method=6)
    lum_small = np.asarray(photo.convert("L"), np.float32) / 255
    m_small = subject_mask(photo)
    lum = np.full((S, S), float(lum_small.mean()), np.float32)
    m = np.zeros((S, S), np.float32)
    o = (S - field_px) // 2
    lum[o : o + field_px, o : o + field_px] = lum_small
    m[o : o + field_px, o : o + field_px] = m_small
    inside = (r < field_r).astype(np.float32)
    m = blur(m, 1.0) * inside

    # His head: a rounded pillow, with the photo's light and shade read as
    # sculpted detail, as on the album's cover.
    hard = m > 0.5
    pillow = blur(dome(hard, 40.0), 2.0) * 30.0
    fine = (blur(lum, 2.0) - blur(lum, 6.0)) * 12.0
    detail = (blur(lum, 3.5) - blur(lum, 14.0)) * 24.0
    form = (blur(lum, 12.0) - blur(lum, 50.0)) * 26.0
    head = (pillow + fine + detail + form) * smoothstep(0.35, 0.65, m)
    # The field around him: flat, with a ghost of the wood behind.
    ghost = (blur(lum, 4.0) - blur(lum, 30.0)) * 5.0
    field = ghost * (1 - smoothstep(0.2, 0.6, blur(m, 6))) * inside

    # The rim: a raised edge, a fine ridge round the field, and the key.
    def ring(r0, half, height):
        return np.sqrt(np.clip(1 - ((r - r0) / half) ** 2, 0, 1)) * height

    rim = ring(0.995, 0.03, 16) + ring(field_r + 0.004, 0.006, 6)
    band = (r > field_r) & (r < 0.99)
    rim += band * 4.0
    layer = Image.new("L", (S, S), 0)
    ImageDraw.Draw(layer).line(key_strokes(), fill=255, width=6, joint="curve")
    key = np.asarray(layer, np.float32) / 255
    rim += dome(key > 0.5, 2.6) * 6.0

    coin = (r < 1.0).astype(np.float32)
    h = blur(head + field + rim, 1.0) * coin

    n = normals_from_height(h)
    diff = np.clip(n @ LIGHT, 0.0, 1.0)
    shade = (0.58 + 0.42 * diff) * cast_shadow(h)
    shade = shade / np.percentile(shade[coin > 0], 60) * 0.86

    save_rgb(OUT / "normal.webp", n * 0.5 + 0.5, quality=95)
    save_gray(OUT / "shade.webp", np.clip(shade, 0, 1), quality=90)
    save_gray(OUT / "mask.webp", smoothstep(1.0, 0.985, r), quality=85)
    print("Baked the coin →", OUT.relative_to(ROOT))


if __name__ == "__main__":
    build()
