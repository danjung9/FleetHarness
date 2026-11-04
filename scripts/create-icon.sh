#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p build/icon.iconset
swift scripts/create-icon.swift build/icon.png
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" build/icon.png --out "build/icon.iconset/icon_"$size"x"$size".png" >/dev/null
  doubled=$((size * 2))
  sips -z "$doubled" "$doubled" build/icon.png --out "build/icon.iconset/icon_"$size"x"$size"@2x.png" >/dev/null
done
iconutil -c icns build/icon.iconset -o build/icon.icns
