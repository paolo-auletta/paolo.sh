"""
Rasterize gen.ts's draw ops over the homepage's paintings into PNG frames.

  python3 scripts/og/render.py day|night <work dir>

Reads <work dir>/<scene>.json (and, at night, the searchlight frames that
beam.ts wrote to <work dir>/beam/), and writes <work dir>/<scene>/fNNNN.png,
starting from the poster frame: the first frame is what platforms that
don't animate show, so each loop starts on its best pose.

Needs Pillow.
"""

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
HOME = HERE.parents[1] / "public" / "home"
MONO = HERE / "GeistMono.ttf"
W, H = 1200, 630
# Everything that moves is drawn at twice the size and scaled down.
SS = 2
# The fill behind the plane's glyphs, against their own color: solid, so
# no sky or cloud shows through it, yet the glyphs still read as texture.
PLANE_FILL = 0.42

scene = sys.argv[1]
work = Path(sys.argv[2])
out = work / scene
out.mkdir(parents=True, exist_ok=True)
data = json.loads((work / f"{scene}.json").read_text())

# Each painting cropped as the homepage rests on it, with its land matte
# (red: the land, which the plane and the beam pass behind).
SCENES = {
    "day": dict(
        world="sky-world.webp",
        top=1700,
        matte="land-matte.webp",
        matte_top=1800,
        matte_height=1083,
        ink=(255, 255, 255),
        shadow=(10, 70, 120, 70),
    ),
    "night": dict(
        world="giant/night-world.webp",
        top=1950,
        matte="giant/night-mattes.webp",
        matte_top=2100,
        matte_height=1100,
        ink=(232, 238, 252),
        shadow=None,
    ),
}
CFG = SCENES[scene]
SCALE = 0.6  # screen px per world px: the world's 2000 px across the card


def background():
    im = Image.open(HOME / CFG["world"]).convert("RGB")
    cw, ch = W / SCALE, H / SCALE
    x0 = (im.width - cw) / 2
    box = (round(x0), CFG["top"], round(x0 + cw), round(CFG["top"] + ch))
    return im.crop(box).resize((W, H), Image.LANCZOS)


def land_mask():
    """Where the land is, at fx resolution: 255 = land."""
    m = Image.open(HOME / CFG["matte"]).convert("RGB").split()[0]
    s = SCALE * SS
    m = m.resize((round(2000 * s), round(CFG["matte_height"] * s)), Image.LANCZOS)
    canvas = Image.new("L", (W * SS, H * SS), 0)
    canvas.paste(m, (0, round((CFG["matte_top"] - CFG["top"]) * s)))
    return canvas


BG = background()
LAND = land_mask()

# Glyphs --------------------------------------------------------------------

_fonts = {}
_glyphs = {}


def font(px, weight=700):
    key = (round(px * 4) / 4, weight)
    if key not in _fonts:
        f = ImageFont.truetype(str(MONO), max(1, key[0]))
        f.set_variation_by_axes([weight])
        _fonts[key] = f
    return _fonts[key]


def glyph(ch, px):
    """A glyph's mask, centred like canvas's textAlign center / middle."""
    key = (ch, round(px * 4) / 4)
    if key not in _glyphs:
        f = font(key[1])
        l, t, r, b = f.getbbox(ch, anchor="mm")
        pad = 2
        w, h = int(r - l) + 2 * pad + 1, int(b - t) + 2 * pad + 1
        m = Image.new("L", (max(1, w), max(1, h)), 0)
        ImageDraw.Draw(m).text((pad - l, pad - t), ch, font=f, fill=255, anchor="mm")
        _glyphs[key] = (m, pad - l, pad - t)
    return _glyphs[key]


def paste(layer, patch, dx, dy):
    """alpha_composite at (dx, dy), clipped to the layer."""
    sx0, sy0 = max(0, -dx), max(0, -dy)
    sx1 = min(patch.width, layer.width - dx)
    sy1 = min(patch.height, layer.height - dy)
    if sx1 <= sx0 or sy1 <= sy0:
        return
    if (sx0, sy0, sx1, sy1) != (0, 0, patch.width, patch.height):
        patch = patch.crop((sx0, sy0, sx1, sy1))
    layer.alpha_composite(patch, dest=(dx + sx0, dy + sy0))


def hexrgb(c):
    return ((c >> 16) & 255, (c >> 8) & 255, c & 255)


def put_glyph(layer, x, y, ch, px, rgba):
    a = max(0.0, min(1.0, rgba[3]))
    if a <= 0.004:
        return
    m, ox, oy = glyph(ch, px * SS)
    if a < 1:
        m = m.point(lambda v: int(v * a))
    patch = Image.new("RGBA", m.size, tuple(int(c) for c in rgba[:3]) + (0,))
    patch.putalpha(m)
    paste(layer, patch, round(x * SS - ox), round(y * SS - oy))


def put_cells(layer, op):
    """The plane: each cell filled with a deeper shade of its color, then its glyph."""
    cells = op["cells"]
    cw, ch = op["cw"] * SS, op["ch"] * SS
    d = ImageDraw.Draw(layer)
    for i in range(0, len(cells), 3):
        x, y = cells[i] * SS, cells[i + 1] * SS
        fill = tuple(int(v * PLANE_FILL) for v in hexrgb(int(cells[i + 2])))
        d.rectangle(
            (x - cw / 2 - 0.5, y - ch / 2 - 0.5, x + cw / 2 + 0.5, y + ch / 2 + 0.5),
            fill=fill + (255,),
        )
    for i in range(0, len(cells), 3):
        put_glyph(layer, cells[i], cells[i + 1], "#", op["px"], hexrgb(int(cells[i + 2])) + (1,))


# Light ---------------------------------------------------------------------

# 0 at the centre, 180 at r = 128 px (255 in the corners).
_radial = Image.radial_gradient("L")


def put_glow(layer, x, y, r0, r1, rgba):
    r = r1 * SS
    size = max(2, int(r * 2) + 2)
    inner = r0 / r1 if r1 else 0
    a = rgba[3]

    def falloff(v):
        d = v / 180.3
        k = 0 if d >= 1 else (1 if d <= inner else 1 - (d - inner) / (1 - inner))
        return int(255 * max(0, min(1, k * k * a)))

    m = _radial.resize((size, size), Image.BILINEAR).point(falloff)
    patch = Image.new("RGBA", (size, size), tuple(int(c) for c in rgba[:3]) + (0,))
    patch.putalpha(m)
    paste(layer, patch, round(x * SS - size / 2), round(y * SS - size / 2))


def put_eye(layer, x, y, r, lid, rgba):
    rx, ry = r * SS, r * SS * lid
    if ry <= 0.05:
        return
    k = 4
    size = int(rx * 2) + 4
    big = Image.new("L", (size * k, size * k), 0)
    c = size * k / 2
    ImageDraw.Draw(big).ellipse(
        (c - rx * k, c - ry * k, c + rx * k, c + ry * k), fill=int(255 * rgba[3])
    )
    patch = Image.new("RGBA", (size, size), tuple(int(v) for v in rgba[:3]) + (0,))
    patch.putalpha(big.resize((size, size), Image.LANCZOS))
    paste(layer, patch, round(x * SS - size / 2), round(y * SS - size / 2))


def draw(layer, ops):
    for op in ops:
        kind = op["o"]
        if kind == "g":
            put_glyph(layer, op["x"], op["y"], op["c"], op["px"], op["rgba"])
        elif kind == "cells":
            put_cells(layer, op)
        elif kind == "glow":
            put_glow(layer, op["x"], op["y"], op["r0"], op["r1"], op["rgba"])
        elif kind == "eye":
            put_eye(layer, op["x"], op["y"], op["r"], op["lid"], op["rgba"])


# The name ------------------------------------------------------------------


def name_layer():
    """Geist Mono Medium, as the site's copy; a soft shadow by day."""
    k = 2
    layer = Image.new("RGBA", (W * k, H * k), (0, 0, 0, 0))
    f = ImageFont.truetype(str(MONO), 60 * k)
    f.set_variation_by_axes([500])
    xy = (72 * k, 66 * k)
    if CFG["shadow"]:
        shadow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        ImageDraw.Draw(shadow).text(
            (xy[0], xy[1] + 2 * k), "Paolo Auletta", font=f, fill=CFG["shadow"]
        )
        layer = Image.alpha_composite(layer, shadow.filter(ImageFilter.GaussianBlur(10 * k)))
    ImageDraw.Draw(layer).text(xy, "Paolo Auletta", font=f, fill=CFG["ink"] + (255,))
    return layer.resize((W, H), Image.LANCZOS)


NAME = name_layer()


def twinkling_stars():
    """The brightest stars in the open sky, not under the name."""
    lum = BG.convert("L").load()
    found = []
    for y in range(3, 330):
        for x in range(3, W - 3):
            v = lum[x, y]
            if v < 120:
                continue
            if all(
                v >= lum[x + dx, y + dy] for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2)
            ):
                found.append((v, x, y))
    found.sort(reverse=True)
    found = [s for s in found if not (60 <= s[1] <= 560 and 50 <= s[2] <= 150)]
    return found[:28]


STARS = twinkling_stars() if scene == "night" else []


def beam_at(i):
    """The searchlight's frame, as beam.ts left it, ready to screen."""
    raw = (work / "beam" / f"b{i:04d}.rgb").read_bytes()
    beam = Image.frombytes("RGB", (W, H), raw)
    # The shader's per-pixel jitter is grain a GIF pays for on every frame.
    beam = beam.filter(ImageFilter.GaussianBlur(1.4))
    # Its faintest tails are invisible, but would redither half the sky.
    cut = 4
    return beam.point(lambda v: 0 if v < cut else int((v - cut) * 255 / (255 - cut)))


# Frames --------------------------------------------------------------------

frames = data["frames"]
n = len(frames)
period = n / data["fps"]
for out_i, fi in enumerate((data["poster"] + i) % n for i in range(n)):
    fr = frames[fi]
    t = fi / data["fps"]

    frame = BG.convert("RGBA")
    if STARS:
        glow = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
        for j, (_, x, y) in enumerate(STARS):
            # Whole cycles per loop, so the loop closes.
            cycles = 1 + (j % 3)
            k = 0.5 + 0.5 * math.sin(2 * math.pi * cycles * t / period + j * 2.399)
            put_glow(glow, x, y, 0, 5.5, (200, 220, 255, 0.55 * k * k))
        frame = Image.alpha_composite(frame, glow.resize((W, H), Image.LANCZOS))

    if fr["fx"]:
        fx = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
        draw(fx, fr["fx"])
        r, g, b, a = fx.split()
        a = ImageChops.multiply(a, ImageChops.invert(LAND))
        frame = Image.alpha_composite(
            frame, Image.merge("RGBA", (r, g, b, a)).resize((W, H), Image.LANCZOS)
        )

    if fr["top"]:
        top = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
        draw(top, fr["top"])
        frame = Image.alpha_composite(frame, top.resize((W, H), Image.LANCZOS))

    if fr.get("beam"):
        frame = ImageChops.screen(frame.convert("RGB"), beam_at(fi)).convert("RGBA")

    frame = Image.alpha_composite(frame, NAME)
    frame.convert("RGB").save(out / f"f{out_i:04d}.png")

print(f"{scene}: {n} frames")
