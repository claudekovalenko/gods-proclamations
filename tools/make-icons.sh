#!/bin/bash
# Renders the app icons from the same quotation-mark path the app draws in its
# masthead, using the headless Chromium that ships with this environment.
#
#   tools/make-icons.sh docs/icons
#
# Two forms of the mark: the pair for app icons, and a single comma for the
# favicon, which is too small to hold two.
set -e
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT
OUT="${1:-docs/icons}"
CHROME="${CHROME:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}"
INK="#131520"
RED="#D8555F"
mkdir -p "$OUT"

COMMA='<circle cx="34" cy="62" r="28"/><path d="M 8 52 C 14 32 38 14 76 8 C 62 26 48 36 38 42 Z"/>'
PAIR="<svg viewBox=\"12 14 164 82\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"$RED\"><g transform=\"translate(6,6)\">$COMMA</g><g transform=\"translate(100,6)\">$COMMA</g></g></svg>"
ONE="<svg viewBox=\"6 8 70 82\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"$RED\">$COMMA</g></svg>"

# $1 size  $2 filename  $3 mark width as a fraction of the canvas  $4 pair|one
render () {
  local size=$1 file=$2 frac=$3 form=${4:-pair} svg ratio
  if [ "$form" = one ]; then svg="$ONE"; ratio="82/70"; else svg="$PAIR"; ratio="82/164"; fi
  # Chromium will not render a viewport below about 150px, and for small
  # --window-size values the screenshot crops the top-left corner, so the
  # artboard is pinned to 0,0 rather than centred in the page.
  cat > "$SCRATCH/icon.html" <<HTML
<style>
  html,body{margin:0;padding:0;background:$INK}
  .art{
    position:absolute;top:0;left:0;
    width:${size}px;height:${size}px;background:$INK;
    display:flex;align-items:center;justify-content:center;overflow:hidden;
  }
  .art svg{
    width:$(python3 -c "print(round($size*$frac))")px;
    height:$(python3 -c "print(round($size*$frac*$ratio))")px;
    display:block;
  }
</style>
<div class="art">$svg</div>
HTML
  "$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=${size},${size} \
    --screenshot="$OUT/$file" "file://$SCRATCH/icon.html" >/dev/null 2>&1
  printf '  %-26s %sx%s\n' "$file" "$size" "$size"
}

# $1 source  $2 destination  $3 integer reduction factor
downscale () {
  python3 - "$OUT/$1" "$OUT/$2" "$3" <<'PY'
import sys, zlib, struct
src, dst, factor = sys.argv[1], sys.argv[2], int(sys.argv[3])

def read(path):
    d = open(path, 'rb').read(); pos = 8; idat = b''
    while pos < len(d):
        ln = struct.unpack('>I', d[pos:pos+4])[0]; typ = d[pos+4:pos+8]
        chunk = d[pos+8:pos+8+ln]
        if typ == b'IHDR': w, h, _, ct = struct.unpack('>IIBB', chunk[:10])
        elif typ == b'IDAT': idat += chunk
        pos += 12 + ln
    ch = {0:1, 2:3, 4:2, 6:4}[ct]
    raw = zlib.decompress(idat); stride = w * ch
    rows = []; prev = bytearray(stride); i = 0
    for _ in range(h):
        f = raw[i]; i += 1
        line = bytearray(raw[i:i+stride]); i += stride
        for x in range(stride):                        # undo the per-row filters
            a = line[x-ch] if x >= ch else 0
            b = prev[x]
            c = prev[x-ch] if x >= ch else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c; pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(bytes(line)); prev = line
    return w, h, ch, rows

w, h, ch, rows = read(src)
nw, nh = w // factor, h // factor
out = bytearray()
for y in range(nh):
    out.append(0)                                      # filter type: none
    for x in range(nw):
        for c in range(ch):
            total = sum(rows[y*factor+dy][(x*factor+dx)*ch+c]
                        for dy in range(factor) for dx in range(factor))
            out.append(total // (factor*factor))

def chunk(typ, data):
    return struct.pack('>I', len(data)) + typ + data + \
           struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff)

png = b'\x89PNG\r\n\x1a\n' + \
      chunk(b'IHDR', struct.pack('>IIBBBBB', nw, nh, 8, {1:0, 2:4, 3:2, 4:6}[ch], 0, 0, 0)) + \
      chunk(b'IDAT', zlib.compress(bytes(out), 9)) + chunk(b'IEND', b'')
open(dst, 'wb').write(png)
PY
  printf '  %-26s (downscaled from %s)\n' "$2" "$1"
}

echo "rendering icons into $OUT"
render 512 icon-512.png           0.62 pair
render 192 icon-192.png           0.62 pair
render 512 icon-maskable-512.png  0.44 pair   # 44% keeps the mark inside the mask safe zone
render 192 icon-maskable-192.png  0.44 pair
render 180 apple-touch-icon.png   0.60 pair

render 512 _favicon-src.png       0.66 one
downscale _favicon-src.png favicon-32.png 16
rm -f "$OUT/_favicon-src.png"

cat > "$OUT/mark.svg" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <rect width="96" height="96" rx="18" fill="$INK"/>
  <g fill="$RED" transform="translate(16,10) scale(0.78)">$COMMA</g>
</svg>
SVG
echo "  mark.svg"
