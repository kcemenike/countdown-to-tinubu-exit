#!/bin/bash
#
# Regenerates every binary asset in the repo from its HTML source:
#
#   og.html     -> og.png                 (social share card)
#   icon.html   -> icons/*.png            (home-screen icons)
#   splash.html -> splash/*.png           (iOS launch screens)
#
# Requires Google Chrome and macOS `sips`. Run from anywhere:
#   ./tools/build-assets.sh
#
# Headless Chrome clamps the viewport to a 500px minimum width, so anything
# smaller than that is rendered at 512 and downscaled.

set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

[ -x "$CHROME" ] || { echo "Chrome not found at $CHROME" >&2; exit 1; }

shoot() { # shoot <out.png> <width> <height> <url>
  "$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --virtual-time-budget=4000 --window-size="$2,$3" --screenshot="$1" "$4" >/dev/null 2>&1
}

mkdir -p icons splash

echo "==> social card"
shoot og.png 1200 630 "file://$ROOT/og.html"

echo "==> icons"
shoot icons/icon-512.png 512 512 "file://$ROOT/icon.html"
shoot icons/icon-maskable-512.png 512 512 "file://$ROOT/icon.html?maskable=1"

# Downscale the square icon into the sizes the manifest and iOS ask for.
for size in 192 180 167 152 120; do
  sips -z "$size" "$size" icons/icon-512.png --out "icons/icon-${size}.png" >/dev/null
done
sips -z 192 192 icons/icon-maskable-512.png --out icons/icon-maskable-192.png >/dev/null
cp icons/icon-180.png apple-touch-icon.png   # iOS looks here by default

echo "==> iOS launch screens"
# "<width>x<height>" in device pixels, portrait. Covers iPhone SE (2nd gen)
# through the current Pro Max. iOS picks the exact match or shows nothing.
for size in \
  750x1334 828x1792 1125x2436 1170x2532 1179x2556 \
  1206x2622 1242x2688 1284x2778 1290x2796 1320x2868
do
  w="${size%x*}"; h="${size#*x}"
  shoot "splash/splash-${size}.png" "$w" "$h" "file://$ROOT/splash.html"
done

echo "==> install-dialog screenshots"
mkdir -p screenshots
shoot screenshots/narrow.png 500 1000 "file://$ROOT/index.html"
shoot screenshots/wide.png 1440 900 "file://$ROOT/index.html"

echo "==> done"
ls -la og.png apple-touch-icon.png
ls -la icons splash | head -30
