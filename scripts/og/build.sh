#!/bin/zsh
#
# The site's link previews, rendered from the homepage itself.
#
#   day    the seaplane's swoop over the meadow (components/home/flight.ts,
#          ascii-plane.ts), solid in front of the clouds, with its smoke
#   night  the Giant's eyes in the pines, sweeping their searchlight across
#          the valley (components/home/beacon.ts, run on the CPU)
#
# Both are 1200x630 looping GIFs with just the name, starting on their best
# frame (what platforms that don't animate show), plus that frame as a JPEG
# for X. lib/metadata.ts points at them.
#
#   scripts/og/build.sh [day|night|all]     (default: all)
#
# Out, in public/og/: day.gif, day.jpg, night.gif, night.jpg
#
# The pieces:
#   gen.ts     the motion: per-frame draw ops, as JSON
#   beam.ts    the searchlight's light, per frame (night only)
#   render.py  draws the ops over the paintings into PNG frames
#
# Needs bun, ffmpeg, and a python3 with Pillow. Work files go to .work/.

set -euo pipefail

HERE=${0:a:h}
ROOT=${HERE:h:h}
WORK=$HERE/.work
OUT=$ROOT/public/og
mkdir -p $WORK $OUT
cd $ROOT

# One palette for the whole loop and ordered dithering, which stays put from
# frame to frame, so only what moves is stored again.
encode() {
  local scene=$1 fps=$2 bayer=$3
  ffmpeg -loglevel error -y -framerate $fps -i $WORK/$scene/f%04d.png \
    -vf "palettegen=max_colors=256:stats_mode=full" $WORK/$scene-palette.png
  ffmpeg -loglevel error -y -framerate $fps -i $WORK/$scene/f%04d.png \
    -i $WORK/$scene-palette.png \
    -lavfi "paletteuse=dither=bayer:bayer_scale=$bayer:diff_mode=rectangle" \
    -loop 0 $OUT/$scene.gif
  ffmpeg -loglevel error -y -i $WORK/$scene/f0000.png -q:v 2 $OUT/$scene.jpg
  ls -lh $OUT/$scene.gif $OUT/$scene.jpg
}

day() {
  bun $HERE/gen.ts day 20 > $WORK/day.json
  rm -rf $WORK/day
  python3 $HERE/render.py day $WORK
  encode day 20 4
}

night() {
  # 12 fps: the beam moves across the whole sky, and every frame of it costs.
  bun $HERE/gen.ts night 12 > $WORK/night.json
  # The painting's resting part and its mattes, raw, for the beam.
  ffmpeg -loglevel error -y -i $ROOT/public/home/giant/night-world.webp \
    -vf "crop=2000:1100:0:2100" -f rawvideo -pix_fmt rgb24 $WORK/albedo.rgb
  ffmpeg -loglevel error -y -i $ROOT/public/home/giant/night-mattes.webp \
    -f rawvideo -pix_fmt rgb24 $WORK/mattes.rgb
  rm -rf $WORK/beam $WORK/night
  local n=$(python3 -c "import json; print(len(json.load(open('$WORK/night.json'))['frames']))")
  local jobs=6
  local per=$(( (n + jobs - 1) / jobs ))
  local pids=()
  for k in $(seq 0 $((jobs - 1))); do
    bun $HERE/beam.ts $WORK $((k * per)) $(((k + 1) * per)) &
    pids+=($!)
  done
  # Wait on each worker by pid so the first failure stops the build here.
  local pid
  for pid in $pids; do wait $pid; done
  python3 $HERE/render.py night $WORK
  encode night 12 5
}

case ${1:-all} in
  day) day ;;
  night) night ;;
  all) day; night ;;
  *) echo "usage: scripts/og/build.sh [day|night|all]" >&2; exit 1 ;;
esac
