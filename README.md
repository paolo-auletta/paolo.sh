# paolo.sh

Personal site. Next.js 16 (App Router), React 19, Tailwind 4, Motion.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm typecheck
pnpm lint
```

In dev, `/?t=<seconds>` freezes the homepage intro at that moment.

## Where things are

| Path | What |
| --- | --- |
| `app/page.tsx` | Homepage copy and its entrance |
| `components/home/` | The homepage scenes: the day sky with the ASCII seaplane (`sky-scene.tsx`, `flight.ts`, `ascii-plane.ts`) and the night with the Giant (`giant-night.tsx`, `night/`, `ascii-giant.ts`, `beacon.ts`) |
| `components/motion/` | Shared motion: the copy entrance, the Paper entrance for Music/Movies |
| `app/music`, `app/movies`, `lib/music/`, `lib/letterboxd.ts` | Monthly listening recaps (hand-entered, artwork from Deezer/iTunes) and the Letterboxd diary |
| `app/album`, `components/album/` | The album page and its WebGL plaster reliefs |
| `app/miky` | The Miky page and its coin |
| `app/mute` | The mute browser extension's page |
| `lib/metadata.ts` | Titles, descriptions and link previews |

## Generated assets

These are baked offline and committed under `public/`:

- `scripts/og/build.sh [day|night|all]`: the animated link previews in `public/og/`, rendered from the homepage's own code. Needs bun, ffmpeg and Python with Pillow.
- `scripts/album-relief/generate.py`: the album's relief textures. Needs Python with numpy, scipy, Pillow (and rembg once).
- `scripts/miky-coin/bake.py`: the Miky coin's textures, built on the album generator.
