// Membuat ikon PWA (PNG) + favicon SVG dari logo "gerbang hitung":
// empat garis tally (warna cat marka) dipotong satu diagonal kuning = hitungan ke-5.
// Jalankan sekali bila logo berubah: `npm run icons`. Tanpa dependency (zlib bawaan Node).
import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const ASPHALT = [0x17, 0x19, 0x1b];
const PAINT = [0xed, 0xeb, 0xe4];
const MARK = [0xf2, 0xb7, 0x05];

// Geometri pada kanvas 512 x 512, pusat (256, 256).
const BARS = [139, 217, 295, 373].map((x) => ({ a: [x, 158], b: [x, 354], r: 22 }));
const DIAG = { a: [96, 372], b: [416, 140], r: 23 };
const CUT = 14; // celah aspal di sekeliling diagonal
const CORNER = 112; // radius sudut untuk ikon "any"

function distToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function inRoundedSquare(x, y, r) {
  const cx = Math.min(Math.max(x, r), 512 - r);
  const cy = Math.min(Math.max(y, r), 512 - r);
  return x >= 0 && y >= 0 && x <= 512 && y <= 512 && Math.hypot(x - cx, y - cy) <= r;
}

function colorAt(x, y, { corner, markScale }) {
  if (corner !== null && !inRoundedSquare(x, y, corner)) return null;
  const m = [256 + (x - 256) / markScale, 256 + (y - 256) / markScale];
  const d = distToSegment(m, DIAG.a, DIAG.b);
  if (d <= DIAG.r) return MARK;
  if (d <= DIAG.r + CUT) return ASPHALT;
  if (BARS.some((b) => distToSegment(m, b.a, b.b) <= b.r)) return PAINT;
  return ASPHALT;
}

// Supersampling 4x4 per piksel supaya tepi halus.
function render(size, opts) {
  const out = Buffer.alloc(size * size * 4);
  const k = 512 / size;
  const n = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const c = colorAt((px + (i + 0.5) / n) * k, (py + (j + 0.5) / n) * k, opts);
          if (!c) continue;
          r += c[0];
          g += c[1];
          b += c[2];
          a += 1;
        }
      }
      const o = (py * size + px) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
      }
      out[o + 3] = Math.round((a / (n * n)) * 255);
    }
  }
  return out;
}

function encodePng(size, rgba) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const bars = BARS.map((b) => `M${b.a[0]} ${b.a[1]}V${b.b[1]}`).join('');
const diag = `M${DIAG.a.join(' ')}L${DIAG.b.join(' ')}`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${CORNER}" fill="${hex(ASPHALT)}"/>
  <g fill="none" stroke-linecap="round">
    <path d="${bars}" stroke="${hex(PAINT)}" stroke-width="${BARS[0].r * 2}"/>
    <path d="${diag}" stroke="${hex(ASPHALT)}" stroke-width="${(DIAG.r + CUT) * 2}"/>
    <path d="${diag}" stroke="${hex(MARK)}" stroke-width="${DIAG.r * 2}"/>
  </g>
</svg>
`;

const dir = new URL('../public/icons/', import.meta.url);
mkdirSync(dir, { recursive: true });
const targets = [
  ['icon-192.png', 192, { corner: CORNER, markScale: 1 }],
  ['icon-512.png', 512, { corner: CORNER, markScale: 1 }],
  ['maskable-512.png', 512, { corner: null, markScale: 0.8 }], // aman di zona 80%
  ['apple-touch-icon.png', 180, { corner: null, markScale: 0.86 }], // iOS membulatkan sendiri
];
for (const [name, size, opts] of targets) {
  writeFileSync(new URL(name, dir), encodePng(size, render(size, opts)));
}
writeFileSync(new URL('favicon.svg', dir), svg);
console.log('Ikon dibuat di public/icons/');
