"""
Bake the plaster-relief textures for the /album page.

Every relief is described as a height field. From it we bake three images
that the WebGL relief shader (components/album/relief-canvas.tsx) reads:

  *-base.webp    the plaster render you see at rest (monochrome, lit top-left)
  *-normal.webp  tangent-space normals, so the cursor light can rake the surface
  *-mask.webp    where the surface may turn to metal under the cursor

Reliefs:
  cover     the album cover: subject cut out (rembg), raised as a bas-relief
  column-l  an Ionic column under a sun and stars
  column-r  the same column, mirrored, under a crescent moon
  disc      a medallion for the player: rays, waves, I–VI, meander centre
  temple    a temple front for the footer: six columns, one per track

Run with a Python that has numpy, scipy and pillow (and rembg the first time,
to cut the subject mask out of the cover):

  python scripts/album-relief/generate.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = ROOT / "public" / "album" / "relief"
COVER = ROOT / "public" / "album" / "cover.jpg"
SUBJECT_MASK = HERE / "cover-subject-mask.png"
FONT = HERE / "Marcellus-Regular.ttf"
GREEK_FONT = HERE / "Commissioner.ttf"  # Marcellus has no Greek

# Light for the baked plaster: from the top left, a little in front.
# Coordinates: x right, y up, z out of the wall.
LIGHT = np.array([-0.5, 0.62, 0.62])
LIGHT = LIGHT / np.linalg.norm(LIGHT)
PLASTER = np.array([0.952, 0.948, 0.934])
FLAT_TONE = 0.925  # how bright an untouched flat wall reads
# Rows of the 1900px column images that hold only the fluted shaft. The page
# stretches this band to make a column as tall as its cell
# (PILLAR_SHAFT in components/album/relief-canvas.tsx), so nothing that
# would look wrong stretched (stars) may sit in it.
SHAFT_BAND = (580, 1600)


# ───────────────────────── helpers ─────────────────────────


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def blur(a, s):
    return ndi.gaussian_filter(a, s, mode="nearest")


def normals_from_height(h):
    """Unit normals (x right, y up, z out) from a height field in pixels."""
    gx = ndi.sobel(h, axis=1, mode="nearest") / 8.0
    gy = -ndi.sobel(h, axis=0, mode="nearest") / 8.0  # rows grow downwards
    n = np.stack([-gx, -gy, np.ones_like(h)], axis=-1)
    return n / np.linalg.norm(n, axis=-1, keepdims=True)


def cast_shadow(h, steps=28, slope=0.55):
    """Soft shadow along the light: how far a nearby point towards the light
    rises above the ray from this one."""
    lx, ly = LIGHT[0], -LIGHT[1]  # image space, rows down
    d = np.hypot(lx, ly)
    lx, ly = lx / d, ly / d
    occ = np.zeros_like(h)
    for k in range(1, steps + 1):
        shifted = ndi.shift(h, (-ly * k, -lx * k), order=1, mode="nearest")
        occ = np.maximum(occ, (shifted - h - k * slope) / (k ** 0.5))
    return 1.0 - np.clip(occ * 0.32, 0.0, 0.42)


def bake(name, h, metal_mask, ao_radius=14, ao_strength=0.03):
    n = normals_from_height(h)
    diff = np.clip(n @ LIGHT, 0.0, 1.0)
    ambient = 0.58
    flat = ambient + (1 - ambient) * LIGHT[2]
    shade = (ambient + (1 - ambient) * diff) / flat * FLAT_TONE

    cavity = np.clip((blur(h, ao_radius) - h) * ao_strength, 0.0, 0.32)
    shade = shade * (1.0 - cavity) * cast_shadow(h)
    # A whisper of grain so large flats don't read as vector fills.
    rng = np.random.default_rng(7)
    grain = blur(rng.standard_normal(h.shape), 0.8) * 0.012
    shade = np.clip(shade + grain, 0.0, 1.02)

    base = np.clip(shade[..., None] * PLASTER, 0, 1)
    save_rgb(OUT / f"{name}-base.webp", base, quality=90)
    save_rgb(OUT / f"{name}-normal.webp", n * 0.5 + 0.5, quality=95)
    save_gray(OUT / f"{name}-mask.webp", np.clip(metal_mask, 0, 1), quality=85)
    print(f"  {name}: {h.shape[1]}×{h.shape[0]}")


def save_rgb(path, a, quality):
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB").save(
        path, quality=quality, method=6
    )


def save_gray(path, a, quality):
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), "L").save(
        path, quality=quality, method=6
    )


def dome(mask, radius):
    """A rounded 'pillow' over a mask: rises over `radius` px from its edge."""
    dist = ndi.distance_transform_edt(mask > 0.5)
    t = np.clip(dist / radius, 0, 1)
    return np.sqrt(1 - (1 - t) ** 2)


def text_height(size, text, font_px, center, angle=0.0, relief=10.0, font_path=None):
    """Raised lettering as a height field (rounded strokes)."""
    w, hgt = size
    layer = Image.new("L", (w, hgt), 0)
    font = ImageFont.truetype(str(font_path or FONT), font_px)
    tw = font.getbbox(text)
    glyph = Image.new("L", (tw[2] - tw[0] + 20, tw[3] - tw[1] + 20), 0)
    ImageDraw.Draw(glyph).text((10 - tw[0], 10 - tw[1]), text, fill=255, font=font)
    glyph = glyph.rotate(angle, resample=Image.BICUBIC, expand=True)
    layer.paste(glyph, (int(center[0] - glyph.width / 2), int(center[1] - glyph.height / 2)))
    m = np.asarray(layer, dtype=np.float32) / 255.0
    return dome(m, max(2.0, font_px * 0.06)) * relief * (m > 0.5) + blur(m, 0.7) * 0.0, m


def incised_text_height(size, text, cap_px, center, depth=7.0, weight=520, font_path=None, tracking=0.12):
    """Lettering cut into the stone with a V-groove, like a carved
    inscription. Drawn 4x larger and scaled down so the cut stays clean.
    Returns (height, mask); the height is <= 0."""
    k = 4
    font = ImageFont.truetype(str(font_path or GREEK_FONT), int(cap_px * k / 0.7))
    # Commissioner's axes: weight, slant, flare, volume. Flare gives the
    # flared, chiselled cut the page's Greek type uses.
    font.set_variation_by_axes([weight, 0, 100, 0])
    # Lay the letters out one by one, spaced like an inscription.
    widths = [font.getbbox(ch)[2] - font.getbbox(ch)[0] if ch != " " else font.getbbox("Ι")[2] * 2 for ch in text]
    gap = cap_px * k * tracking
    total = int(sum(widths) + gap * (len(text) - 1)) + 40
    asc = font.getbbox("Η")
    glyph = Image.new("L", (total, asc[3] - asc[1] + 40), 0)
    d = ImageDraw.Draw(glyph)
    x = 20.0
    for ch, wch in zip(text, widths):
        if ch != " ":
            bb = font.getbbox(ch)
            d.text((x - bb[0], 20 - asc[1]), ch, fill=255, font=font)
        x += wch + gap
    big = np.asarray(glyph, dtype=np.float32) / 255.0
    dist = ndi.distance_transform_edt(big > 0.5)
    half = max(2.0, float(np.percentile(dist[dist > 0], 97)))
    groove = -depth * np.clip(dist / half, 0, 1) ** 0.85
    gh, gw = groove.shape[0] // k, groove.shape[1] // k
    small = np.asarray(
        Image.fromarray(groove[: gh * k, : gw * k]).resize((gw, gh), Image.BOX), dtype=np.float32
    )
    small_m = np.asarray(Image.fromarray(big[: gh * k, : gw * k]).resize((gw, gh), Image.BOX), dtype=np.float32)
    w, hgt = size
    out = np.zeros((hgt, w), np.float32)
    out_m = np.zeros((hgt, w), np.float32)
    x0, y0 = int(center[0] - gw / 2), int(center[1] - gh / 2)
    out[y0 : y0 + gh, x0 : x0 + gw] = small
    out_m[y0 : y0 + gh, x0 : x0 + gw] = small_m
    return out, out_m


def star_field(shape, points, rng_seed=3):
    """Small four-pointed stars as a height field."""
    hgt, w = shape
    yy, xx = np.mgrid[0:hgt, 0:w].astype(np.float32)
    out = np.zeros(shape, np.float32)
    for (cx, cy, r) in points:
        dx, dy = np.abs(xx - cx), np.abs(yy - cy)
        # astroid-ish: |x|^p + |y|^p < r^p with p < 1 gives pointy arms
        p = 0.55
        v = (dx / r) ** p + (dy / r) ** p
        star = np.clip(1 - v, 0, 1)
        out = np.maximum(out, star ** 0.6 * r * 0.35)
    return out


# ───────────────────────── cover ─────────────────────────


def cover_subject_mask(im):
    if SUBJECT_MASK.exists():
        return np.asarray(Image.open(SUBJECT_MASK).convert("L"), np.float32) / 255
    from rembg import new_session, remove

    m = remove(im, session=new_session("isnet-general-use"), only_mask=True)
    m.save(SUBJECT_MASK)
    return np.asarray(m, np.float32) / 255


def cover_heights(size=None):
    im = Image.open(COVER).convert("RGB")
    if size:
        im = im.resize(size, Image.LANCZOS)
    lum = np.asarray(im.convert("L"), np.float32) / 255.0
    m = cover_subject_mask(im if not size else Image.open(COVER).convert("RGB"))
    if size:
        m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize(size, Image.LANCZOS), np.float32) / 255
    m = blur(m, 1.0)
    hard = m > 0.5

    # Subject: a rounded pillow, with the photo's own light and shade read as
    # sculpted detail (shape from shading, the old trick).
    pillow = blur(dome(hard, 34.0), 2.0) * 30.0
    fine = (blur(lum, 2.4) - blur(lum, 7.0)) * 14.0  # crisp edges, kept faint
    detail = (blur(lum, 4.0) - blur(lum, 16.0)) * 26.0  # folds and features
    form = (blur(lum, 14.0) - blur(lum, 60.0)) * 30.0  # broad volumes
    subject = (pillow + fine + detail + form) * smoothstep(0.35, 0.65, m)

    # Background: a ghost of the landscape, barely raised.
    ghost = (blur(lum, 4.5) - blur(lum, 36.0)) * 9.0
    bg = ghost * (1 - smoothstep(0.2, 0.6, blur(m, 6)))

    h = blur(subject + bg, 1.1)
    metal = smoothstep(0.35, 0.7, blur(m, 1.5))
    return h, metal


def build_cover():
    h, metal = cover_heights()
    bake("cover", h, metal)


# ───────────────────────── column ─────────────────────────


def column_heights(W=760, H=1900, sky="sun", U=None):
    U = U or W  # the column's own scale, so the wall around it can be narrower
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    cx = W / 2
    h = np.zeros((H, W), np.float32)
    solid = np.zeros((H, W), bool)

    top_cap = int(H * 0.17)  # abacus top
    cap_h = int(H * 0.11)
    shaft_top = top_cap + cap_h
    base_top = int(H * 0.86)
    plinth_bottom = int(H * 0.975)

    # Shaft: cylinder with entasis and 20 flutes (we see half of them).
    R0, R1 = U * 0.2, U * 0.172
    t = np.clip((yy - shaft_top) / (base_top - shaft_top), 0, 1)
    r = R1 + (R0 - R1) * (1 - (1 - t) ** 1.6)  # wider at the base
    u = (xx - cx) / r
    inside = (np.abs(u) < 1) & (yy >= shaft_top) & (yy < base_top)
    cyl = np.sqrt(np.clip(1 - u * u, 0, 1))
    theta = np.arcsin(np.clip(u, -1, 1))
    flutes = 12
    phase = ((theta / np.pi + 0.5) * flutes) % 1.0
    groove = np.sqrt(np.clip(1 - ((phase - 0.5) / 0.4) ** 2, 0, 1)) * (np.abs(phase - 0.5) < 0.4)
    shaft = cyl * r * 0.42 - groove * r * 0.055 * np.sqrt(cyl)
    h = np.where(inside, shaft, h)
    solid |= inside

    # Astragal (bead) under the capital.
    ay = shaft_top + 10
    ring = (np.abs(yy - ay) < 12) & (np.abs(xx - cx) < R1 * 1.06)
    ring_h = np.sqrt(np.clip(1 - ((yy - ay) / 12) ** 2, 0, 1)) * 10 + R1 * 0.42 * np.sqrt(np.clip(1 - ((xx - cx) / (R1 * 1.06)) ** 2, 0, 1))
    h = np.where(ring, np.maximum(h, ring_h), h)
    solid |= ring

    # Echinus: a convex cushion with egg-and-dart.
    ey0, ey1 = top_cap + int(cap_h * 0.42), shaft_top
    ech = (yy >= ey0) & (yy < ey1) & (np.abs(xx - cx) < R1 * 1.35)
    ev = (yy - ey0) / (ey1 - ey0)
    eh = np.sqrt(np.clip(1 - ((xx - cx) / (R1 * 1.35)) ** 2, 0, 1)) * R1 * 0.5 + np.sin(ev * np.pi) * 8
    eggs = 7
    ex = ((xx - cx) / (R1 * 1.35) * 0.5 + 0.5) * eggs
    ef = ex % 1.0
    egg = np.clip(1 - ((ef - 0.5) / 0.36) ** 2 - ((ev - 0.5) / 0.42) ** 2, 0, 1)
    eh = eh + np.sqrt(egg) * 7 - (np.abs(ef - 0.5) > 0.42) * 4
    h = np.where(ech, eh, h)
    solid |= ech

    # Volutes: two spirals and the channel between them.
    vr = cap_h * 0.62 * (U / 760) ** 0.5
    vy = top_cap + cap_h * 0.55
    channel_top, channel_bot = top_cap + 6, top_cap + int(cap_h * 0.42)
    span = R1 * 1.55
    chan = (yy >= channel_top) & (yy < channel_bot) & (np.abs(xx - cx) < span + vr * 0.3)
    cv = (yy - channel_top) / (channel_bot - channel_top)
    # The channel's lower lip sags in the middle, like the reference capital.
    sag = 0.15 * np.cos((xx - cx) / span * np.pi / 2) ** 2
    chan &= cv < 1 - sag + 0.15
    chan_h = 14 - np.sin(np.clip(cv / (1 - sag + 0.15), 0, 1) * np.pi) * 7
    h = np.where(chan, np.maximum(h, chan_h + R1 * 0.18), h)
    solid |= chan
    for side in (-1, 1):
        vx = cx + side * span
        dx, dy = xx - vx, yy - vy
        rho = np.hypot(dx, dy)
        disk = rho < vr
        phi = np.arctan2(dy, dx * side)
        turns = 2.6
        # Archimedean spiral ridge, winding inwards.
        s = (rho / vr) * turns - (phi / (2 * np.pi))
        ridge = np.abs((s % 1.0) - 0.5)
        ridge_h = smoothstep(0.32, 0.12, ridge) * 9
        vh = np.sqrt(np.clip(1 - (rho / vr) ** 2, 0, 1)) * 26 + ridge_h + R1 * 0.18
        eye = rho < vr * 0.13
        vh = np.where(eye, vh + 8 * np.sqrt(np.clip(1 - (rho / (vr * 0.13)) ** 2, 0, 1)), vh)
        h = np.where(disk, np.maximum(h, vh), h)
        solid |= disk

    # Abacus: thin slab on top.
    ab = (yy >= top_cap - 16) & (yy < top_cap + 8) & (np.abs(xx - cx) < span + vr * 0.55)
    ab_edge = np.minimum(np.minimum(yy - (top_cap - 16), top_cap + 8 - yy), span + vr * 0.55 - np.abs(xx - cx))
    h = np.where(ab, np.maximum(h, R1 * 0.2 + np.clip(ab_edge, 0, 5) * 2.0), h)
    solid |= ab

    # Attic base: torus, scotia, torus, plinth.
    def torus(y_c, half, rx, lift):
        nonlocal h, solid
        reg = (np.abs(yy - y_c) < half) & (np.abs(xx - cx) < rx)
        prof = np.sqrt(np.clip(1 - ((yy - y_c) / half) ** 2, 0, 1)) * half * 0.9
        across = np.sqrt(np.clip(1 - ((xx - cx) / rx) ** 2, 0, 1)) * rx * 0.36
        h = np.where(reg, np.maximum(h, prof + across + lift), h)
        solid |= reg

    torus(base_top + 16, 16, R0 * 1.12, 0)
    sc = (yy >= base_top + 30) & (yy < base_top + 52) & (np.abs(xx - cx) < R0 * 1.12)
    sch = np.sqrt(np.clip(1 - ((xx - cx) / (R0 * 1.12)) ** 2, 0, 1)) * R0 * 0.36 - np.sin(((yy - base_top - 30) / 22) * np.pi) * 6
    h = np.where(sc, sch, h)
    solid |= sc
    torus(base_top + 70, 20, R0 * 1.3, 0)
    pl = (yy >= base_top + 88) & (yy < plinth_bottom) & (np.abs(xx - cx) < R0 * 1.42)
    pl_edge = np.minimum(np.minimum(yy - (base_top + 88), plinth_bottom - yy), R0 * 1.42 - np.abs(xx - cx))
    h = np.where(pl, np.maximum(h, 14 + np.clip(pl_edge, 0, 6) * 2.4), h)
    solid |= pl

    # Sky: sun or crescent moon, and stars (none for a column in a building).
    rng = np.random.default_rng(11 if sky == "sun" else 23)
    sky_h = np.zeros_like(h)
    if sky is None:
        h = blur(np.where(solid, h, 0), 0.9)
        return h, blur(solid.astype(np.float32), 1.5)
    if sky == "sun":
        sx, sy, sr = W * 0.5, H * 0.075, U * 0.06
        d = np.hypot(xx - sx, yy - sy)
        disk = np.sqrt(np.clip(1 - (d / sr) ** 2, 0, 1)) * 12
        ang = np.arctan2(yy - sy, xx - sx)
        rays = (np.cos(ang * 16) > 0.82) & (d > sr * 1.35) & (d < sr * 2.2)
        ray_h = np.where(rays, 5 * smoothstep(sr * 2.2, sr * 1.4, d) + 2, 0)
        sky_h = np.maximum(disk, blur(ray_h.astype(np.float32), 1.2))
    else:
        sx, sy, sr = W * 0.5, H * 0.075, U * 0.055
        d1 = np.hypot(xx - sx, yy - sy)
        d2 = np.hypot(xx - (sx + sr * 0.5), yy - (sy - sr * 0.2))
        cres = (d1 < sr) & (d2 > sr * 0.85)
        sky_h = np.where(cres, np.sqrt(np.clip(1 - (d1 / sr) ** 2, 0, 1)) * 12 + 2, 0)
        sky_h = blur(sky_h.astype(np.float32), 1.0)
    stars = []
    band = (SHAFT_BAND[0] / 1900 * H - 16, SHAFT_BAND[1] / 1900 * H + 16)
    for _ in range(40):
        x = rng.uniform(0.06, 0.94) * W
        y = rng.uniform(0.02, 0.97) * H
        if abs(x - cx) < R0 * 1.6 and y > top_cap - 40:
            continue
        if band[0] < y < band[1]:
            continue
        if math.hypot(x - sx, y - sy) < U * 0.16:
            continue
        stars.append((x, y, rng.uniform(5, 13)))
    sky_h = np.maximum(sky_h, star_field((H, W), stars))

    h = np.where(solid, h, sky_h)
    h = blur(h, 0.9)
    metal = blur(solid.astype(np.float32), 1.5)
    metal = np.maximum(metal, smoothstep(0.5, 2.0, sky_h))
    return h, metal


def build_columns():
    """Slender columns for the pillars pinned to the window's edges: the wall
    is barely wider than the capital, so tall narrow cells crop sky, not stone."""
    h, m = column_heights(W=600, H=1900, sky="sun", U=520)
    bake("column-l", h, m)
    h, m = column_heights(W=600, H=1900, sky="moon", U=520)
    bake("column-r", h[:, ::-1].copy(), m[:, ::-1].copy())


# ───────────────────────── temple ─────────────────────────


def box(shape, x0, y0, x1, y1, lift, bevel=5.0):
    """A raised slab with softly bevelled edges."""
    hgt, w = shape
    yy, xx = np.mgrid[0:hgt, 0:w].astype(np.float32)
    edge = np.minimum.reduce([xx - x0, x1 - xx, yy - y0, y1 - yy])
    inside = edge >= 0
    return np.where(inside, lift + np.clip(edge, 0, bevel) * 1.6, 0), inside


def meander(width, height):
    """A Greek key strip as a 0–1 stroke mask."""
    cell = height
    s = cell / 10
    tile = Image.new("L", (cell, cell), 0)
    d = ImageDraw.Draw(tile)
    lw = max(2, int(s * 1.2))
    pts = [(0, 9), (0, 1), (8, 1), (8, 7), (4, 7), (4, 4)]
    d.line([(x * s + s * 0.8, y * s) for x, y in pts], fill=255, width=lw, joint="curve")
    d.line([(0, 9 * s), (cell, 9 * s)], fill=255, width=lw)
    strip = Image.new("L", (width, cell), 0)
    for x in range(0, width, cell):
        strip.paste(tile, (x, 0))
    return np.asarray(strip, np.float32) / 255


def build_temple(W=2600, H=1120):
    """A temple front: stars, a pediment with the sun, an inscribed
    architrave, six columns (one per track) on three steps."""
    shape = (H, W)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    cx = W / 2
    h = np.zeros(shape, np.float32)
    solid = np.zeros(shape, bool)

    def add(part, mask):
        nonlocal h, solid
        h = np.where(mask, np.maximum(h, part), h)
        solid |= mask

    fx0, fx1 = W * 0.17, W * 0.83  # facade
    ped_top, ped_base = int(H * 0.07), int(H * 0.27)
    cornice = (ped_base, ped_base + 26)
    frieze = (cornice[1], cornice[1] + 64)
    archi = (frieze[1], frieze[1] + 70)
    steps_top = int(H * 0.86)

    # Pediment: a raised triangle with a heavy raking cornice.
    half = (fx1 - fx0) / 2 + 30
    slope = (ped_base - ped_top) / half
    tri = (yy >= ped_top + np.abs(xx - cx) * slope) & (yy < ped_base)
    rim = tri & (yy < ped_top + np.abs(xx - cx) * slope + 22)
    add(np.where(rim, 26.0, 12.0), tri)
    # Sun in the tympanum.
    sy = ped_top + (ped_base - ped_top) * 0.62
    d = np.hypot(xx - cx, yy - sy)
    sun_r = (ped_base - ped_top) * 0.2
    sun = d < sun_r
    h = np.where(sun & tri, h + np.sqrt(np.clip(1 - (d / sun_r) ** 2, 0, 1)) * 12, h)
    ang = np.arctan2(yy - sy, xx - cx)
    rays = tri & ~rim & (np.cos(ang * 22) > 0.7) & (d > sun_r * 1.3) & (d < sun_r * 2.6) & (yy < sy + 4)
    h = np.where(rays, h + 4 * smoothstep(sun_r * 2.6, sun_r * 1.4, d) + 2, h)

    # Cornice, frieze (meander), architrave (inscription).
    part, m = box(shape, fx0 - 34, cornice[0], fx1 + 34, cornice[1], 24)
    add(part, m)
    part, m = box(shape, fx0 - 10, frieze[0], fx1 + 10, frieze[1], 14)
    add(part, m)
    key = meander(int(fx1 - fx0 - 20), frieze[1] - frieze[0] - 16)
    kh = dome(key > 0.5, 2.5) * 6
    ky, kx = frieze[0] + 8, int(fx0)
    h[ky : ky + kh.shape[0], kx : kx + kh.shape[1]] += kh
    part, m = box(shape, fx0, archi[0], fx1, archi[1], 18)
    add(part, m)
    # One fascia line above and below; the inscription is cut between them.
    for fy in (archi[0] + 11, archi[1] - 11):
        h = np.where(m & (np.abs(yy - fy) < 1.5), h - 2.5, h)
    th, _ = incised_text_height((W, H), "ΑΛΜΠΟΥΜ ΣΙΩΠΗΛΟΣ", 30, (cx, (archi[0] + archi[1]) / 2), depth=6.5)
    h = h + np.where(m, th, 0)

    # Six columns, one per track.
    col_h = steps_top - archi[1]
    src_h = int(col_h / (0.975 - 0.17 + 0.012))
    ch, cm = column_heights(W=260, H=src_h, sky=None, U=250)
    ch = ch[int(src_h * 0.17) - 16 :]
    cm = cm[int(src_h * 0.17) - 16 :]
    ch, cm = ch[:col_h], cm[:col_h]
    for i in range(6):
        x = fx0 + 70 + (fx1 - fx0 - 140) * (i + 0.5) / 6
        x0 = int(x - ch.shape[1] / 2)
        region = (slice(archi[1], archi[1] + ch.shape[0]), slice(x0, x0 + ch.shape[1]))
        sub = cm > 0.5
        h[region] = np.where(sub, ch + 8, h[region])
        solid[region] |= sub

    # Three steps.
    for k, inset in enumerate((0, 26, 52)):
        y0 = steps_top + k * 30
        part, m = box(shape, fx0 - 60 - inset * 1.5 + 52 * 1.5 - (2 - k) * 0, y0, fx1 + 60 + inset * 1.5 - 52 * 1.5, y0 + 30, 22 - k * 4)
        add(part, m)

    # Sky: sun and moon over the corners, scattered stars.
    rng = np.random.default_rng(31)
    stars = []
    while len(stars) < 34:
        x, y = rng.uniform(0.02, 0.98) * W, rng.uniform(0.04, 0.95) * H
        if fx0 - 80 < x < fx1 + 80 and y > ped_top - 30:
            continue
        stars.append((x, y, rng.uniform(5, 12)))
    sky = star_field(shape, stars)
    for sx, kind in ((W * 0.08, "sun"), (W * 0.92, "moon")):
        sy2, r = H * 0.16, H * 0.045
        d1 = np.hypot(xx - sx, yy - sy2)
        if kind == "sun":
            disk = np.sqrt(np.clip(1 - (d1 / r) ** 2, 0, 1)) * 12
            a2 = np.arctan2(yy - sy2, xx - sx)
            ray = (np.cos(a2 * 16) > 0.82) & (d1 > r * 1.35) & (d1 < r * 2.2)
            sky = np.maximum(sky, np.maximum(disk, blur(np.where(ray, 6.0, 0).astype(np.float32), 1.2)))
        else:
            d2 = np.hypot(xx - (sx + r * 0.5), yy - (sy2 - r * 0.2))
            cres = (d1 < r) & (d2 > r * 0.85)
            sky = np.maximum(sky, blur(np.where(cres, np.sqrt(np.clip(1 - (d1 / r) ** 2, 0, 1)) * 12 + 2, 0).astype(np.float32), 1.0))

    h = blur(np.where(solid, h, sky), 0.9)
    metal = np.maximum(blur(solid.astype(np.float32), 1.5), smoothstep(0.5, 2.0, sky))
    bake("temple", h, metal)


# ───────────────────────── disc ─────────────────────────


def build_disc(S=1440):
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    c = S / 2
    dx, dy = xx - c, yy - c
    r = np.hypot(dx, dy) / c  # 0 centre → 1 rim
    ang = np.arctan2(dy, dx)
    h = np.zeros((S, S), np.float32)

    def ring(r0, half, height):
        return np.sqrt(np.clip(1 - ((r - r0) / half) ** 2, 0, 1)) * height

    # Plate: a shallow dish, everything sits on it.
    plate = (r < 0.985).astype(np.float32)
    h += plate * 6 + smoothstep(1.0, 0.95, r) * 0  # flat
    h += ring(0.965, 0.022, 14)
    h += ring(0.905, 0.008, 7)
    h += ring(0.79, 0.01, 8)
    h += ring(0.77, 0.006, 5)

    # Band 1 (0.91–0.95): running-dog waves.
    band = (r > 0.915) & (r < 0.945)
    t = (r - 0.915) / 0.03
    period = 2 * np.pi / 40
    phase = (ang % period) / period
    curve = 0.5 + 0.34 * np.sin(phase * 2 * np.pi)
    wave = smoothstep(0.08, -0.08, t - curve)
    h += np.where(band, wave * 5, 0)

    # Band 2 (0.79–0.9): eight half-suns on the inner ring, rays fanning out.
    burst_n = 8
    for k in range(burst_n):
        a = (k + 0.5) / burst_n * 2 * np.pi
        sx, sy = c + math.cos(a) * c * 0.79, c + math.sin(a) * c * 0.79
        d = np.hypot(xx - sx, yy - sy) / c
        outward = (dx * math.cos(a) + dy * math.sin(a)) / c - 0.79
        sun = (d < 0.04) & (outward > 0)
        h = np.where(sun, np.maximum(h, np.sqrt(np.clip(1 - (d / 0.04) ** 2, 0, 1)) * 9 + 6), h)
        ray_ang = np.arctan2(yy - sy, xx - sx) - a
        ray_ang = (ray_ang + np.pi) % (2 * np.pi) - np.pi
        rays = (np.abs(ray_ang) < 1.2) & (np.cos(ray_ang * 11) > 0.6) & (d > 0.052) & (r < 0.895) & (outward > 0)
        h = np.where(rays, np.maximum(h, 6 + 4 * smoothstep(0.11, 0.05, d)), h)
    stars = []
    for k in range(burst_n):
        a = k / burst_n * 2 * np.pi
        stars.append((c + math.cos(a) * c * 0.85, c + math.sin(a) * c * 0.85, c * 0.022))
    h = np.maximum(h, star_field((S, S), stars) + 6 * plate)

    # Field (0.3–0.76): six raised sectors, one per track, numerals I–VI.
    numerals = ["I", "II", "III", "IV", "V", "VI"]
    field = (r > 0.31) & (r < 0.76)
    a6 = ((ang + np.pi / 2) / (2 * np.pi) * 6) % 1.0  # sector 0 starts at top
    divider = (np.abs(a6 - 0.0) < 0.012) | (np.abs(a6 - 1.0) < 0.012)
    sector_lift = np.where(field, 3 + 6 * np.sin(np.clip((r - 0.31) / 0.45, 0, 1) * np.pi), 0)
    h += sector_lift
    h += np.where(field & divider, 6, 0)
    for i, numeral in enumerate(numerals):
        a = -np.pi / 2 + (i + 0.5) / 6 * 2 * np.pi
        px, py = c + math.cos(a) * c * 0.55, c + math.sin(a) * c * 0.55
        th, tm = text_height((S, S), numeral, int(S * 0.09), (px, py), relief=12)
        h = np.where(tm > 0.5, h + th, h)
        # three small stars under each numeral
        for j in (-1, 0, 1):
            aa = a + j * 0.13
            qx, qy = c + math.cos(aa) * c * 0.4, c + math.sin(aa) * c * 0.4
            h = np.maximum(h, star_field((S, S), [(qx, qy, c * 0.016)]) + h * 0 + 9 * field)

    h += ring(0.3, 0.01, 7)

    # Centre (r < 0.29): meander ring, then a sunken well for the play button.
    mz = (r > 0.17) & (r < 0.27)
    mt = (r - 0.17) / 0.1
    ma = (ang / (2 * np.pi) * 18) % 1.0
    # meander motif in polar coordinates, drawn as strokes
    stroke = np.zeros_like(r, bool)
    w = 0.09
    stroke |= (np.abs(mt - 0.1) < w)  # inner rail
    stroke |= (np.abs(mt - 0.9) < w)  # outer rail
    stroke |= (np.abs(ma - 0.1) < w * 0.7) & (mt > 0.1) & (mt < 0.75)
    stroke |= (np.abs(mt - 0.75) < w) & (ma > 0.1) & (ma < 0.75)
    stroke |= (np.abs(ma - 0.75) < w * 0.7) & (mt > 0.35) & (mt < 0.75)
    stroke |= (np.abs(mt - 0.35) < w) & (ma > 0.45) & (ma < 0.75)
    stroke |= (np.abs(ma - 0.45) < w * 0.7) & (mt > 0.35) & (mt < 0.55)
    h += np.where(mz, 4 + blur(stroke.astype(np.float32), 1.0) * 7, 0)
    h += ring(0.165, 0.008, 6)
    h += ring(0.28, 0.006, 6)

    h = np.where(r < 0.985, h, 0)
    h = blur(h, 0.9)
    # Metal only on the ornament (numerals, rings, suns, meander), never on
    # the broad flat fields, which would just read as a grey smudge.
    local = h - blur(h, 10)
    metal = smoothstep(0.4, 1.6, local)
    metal = ndi.maximum_filter(metal, size=7)
    metal = blur(metal, 1.5) * smoothstep(0.99, 0.975, r) * (r > 0.16)
    bake("disc", h, metal, ao_radius=10)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    which = set(sys.argv[1:]) or {"cover", "columns", "disc", "temple"}
    print("Baking reliefs →", OUT.relative_to(ROOT))
    if "cover" in which:
        build_cover()
    if "columns" in which:
        build_columns()
    if "disc" in which:
        build_disc()
    if "temple" in which:
        build_temple()
