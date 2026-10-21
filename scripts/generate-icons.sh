#!/usr/bin/env bash
# Regenerates every app icon raster from the SVG sources.
#
# The geometry lives in scripts/icon/wavedigger_icon.py, which writes the SVGs. To change the
# icon, edit that script, run it, then run this one and commit the results:
#   uv run scripts/icon/wavedigger_icon.py
#   scripts/generate-icons.sh
#
# Sources:
#   public/wavedigger-icon.svg                    regular drawing, rounded tile (32 px and up)
#   scripts/icon/svg/wavedigger-icon-small.svg    small drawing, rounded tile (16 to 24 px)
#   scripts/icon/svg/wavedigger-icon-square.svg   full-bleed square, for platforms that mask (iOS)
#   scripts/icon/svg/wavedigger-icon-maskable.svg full-bleed, art inside the PWA safe zone
#
# Requires rsvg-convert (librsvg) and magick (ImageMagick 7):
#   brew install librsvg imagemagick
set -euo pipefail

cd "$(dirname "$0")/.."

for tool in rsvg-convert magick; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "error: $tool is not installed (brew install librsvg imagemagick)" >&2
    exit 1
  fi
done

REGULAR=public/wavedigger-icon.svg
SMALL=scripts/icon/svg/wavedigger-icon-small.svg
SQUARE=scripts/icon/svg/wavedigger-icon-square.svg
MASKABLE=scripts/icon/svg/wavedigger-icon-maskable.svg
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

render() {
  local src=$1 size=$2 out=$3
  rsvg-convert -w "$size" -h "$size" "$src" -o "$TMP/raw.png"
  magick "$TMP/raw.png" -strip "$out"
  echo "wrote $out (${size}x${size})"
}

# Full-bleed squares carry no transparency; iOS and Android mask them and fill gaps with black.
render_opaque() {
  local src=$1 size=$2 out=$3
  rsvg-convert -w "$size" -h "$size" "$src" -o "$TMP/raw.png"
  magick "$TMP/raw.png" -alpha remove -alpha off -strip "$out"
  echo "wrote $out (${size}x${size}, opaque)"
}

render "$SMALL"   16  public/icon-16.png
render "$REGULAR" 32  public/icon-32.png
render "$REGULAR" 48  "$TMP/icon-48.png"
render "$REGULAR" 192 public/icon-192.png
render "$REGULAR" 256 public/logo.png
render "$REGULAR" 512 public/icon-512.png
render_opaque "$SQUARE"   180 public/apple-icon.png
render_opaque "$MASKABLE" 192 public/icon-maskable-192.png
render_opaque "$MASKABLE" 512 public/icon-maskable-512.png

magick public/icon-16.png public/icon-32.png "$TMP/icon-48.png" app/favicon.ico
echo "wrote app/favicon.ico (16 small drawing, 32 and 48 regular)"
