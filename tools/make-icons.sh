#!/bin/bash
# Renders the app icons from the same heart path the app draws in its masthead,
# using the headless Chromium that ships with this environment.
#
#   tools/make-icons.sh docs/icons
set -e
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT
OUT="${1:-docs/icons}"
CHROME="${CHROME:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}"
INK="#131520"
RED="#D8555F"
mkdir -p "$OUT"

HEART='<path d="M 50 88 C 20 66 6 48 6 32 C 6 18 17 8 30 8 C 39 8 46 13 50 20 C 54 13 61 8 70 8 C 83 8 94 18 94 32 C 94 48 80 66 50 88 Z"/>'
# viewBox trimmed to the path's own bounds (x 6–94, y 8–88) so the shape
# centres exactly on the artboard.
MARK="<svg viewBox=\"6 8 88 80\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"$RED\">$HEART</g></svg>"

# $1 size  $2 filename  $3 mark width as a fraction of the canvas
render () {
  local size=$1 file=$2 frac=$3 svg="$MARK" ratio="80/88"
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
render 512 icon-512.png           0.56
render 192 icon-192.png           0.56
render 512 icon-maskable-512.png  0.40   # 40% keeps the heart inside the mask safe zone
render 192 icon-maskable-192.png  0.40
render 180 apple-touch-icon.png   0.54

# Chromium will not render a viewport small enough for the favicon directly, so
# draw it large and box-filter it down — an exact 16:1 reduction.
render 512 _favicon-src.png       0.72
downscale _favicon-src.png favicon-32.png 16
rm -f "$OUT/_favicon-src.png"

# scalable favicon, for browsers that prefer one
cat > "$OUT/mark.svg" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <rect width="96" height="96" rx="18" fill="$INK"/>
  <g fill="$RED" transform="translate(15,16) scale(0.66)">$HEART</g>
</svg>
SVG
echo "  mark.svg"
