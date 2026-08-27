#!/usr/bin/env bash
# Regenerates every app icon from public/digger-icon.svg.
# The SVG is the single source of truth for icon color and shape; edit it,
# run this script, and commit the results.
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

SRC=public/digger-icon.svg
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

render() {
  local size=$1 out=$2
  rsvg-convert -w "$size" -h "$size" "$SRC" -o "$TMP/raw.png"
  magick "$TMP/raw.png" -strip "$out"
  echo "wrote $out (${size}x${size})"
}

render 16  public/icon-16.png
render 32  public/icon-32.png
render 48  "$TMP/icon-48.png"
render 180 public/apple-icon.png
cp public/apple-icon.png public/apple-icon-180.png
echo "wrote public/apple-icon-180.png (copy of apple-icon.png)"
render 192 public/icon-192.png
render 256 public/logo.png
render 512 public/icon-512.png

magick public/icon-16.png public/icon-32.png "$TMP/icon-48.png" app/favicon.ico
echo "wrote app/favicon.ico (16, 32, 48)"
