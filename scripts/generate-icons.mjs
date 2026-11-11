import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_DIR = join(ROOT, 'public')
const ICONS_DIR = join(PUBLIC_DIR, 'icons')

const DESIGN_SIZE = 512
const SUPERSAMPLE = 4

const COLORS = {
  blue: [39, 80, 216],
  white: [255, 255, 255],
  yellow: [255, 197, 31],
}

const SHEET = { x: 132, y: 96, w: 248, h: 320, r: 28 }
const LINES = [
  { x: 180, y: 168, w: 152, h: 20, r: 10 },
  { x: 180, y: 232, w: 120, h: 20, r: 10 },
]
const CHECK = {
  width: 46,
  points: [
    [188, 300],
    [238, 352],
    [336, 244],
  ],
}

function inRoundedRect(px, py, { x, y, w, h, r }) {
  if (px < x || px > x + w || py < y || py > y + h) return false
  const cx = Math.min(Math.max(px, x + r), x + w - r)
  const cy = Math.min(Math.max(py, y + r), y + h - r)
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy <= r * r
}

function distanceToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    return Math.hypot(px - ax, py - ay)
  }

  const t = Math.min(
    1,
    Math.max(0, ((px - ax) * dx + (py - ay) * dy) / lengthSquared),
  )
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function scaleShape(shape, scale) {
  const center = DESIGN_SIZE / 2
  const transform = (value) => center + (value - center) * scale

  return {
    x: transform(shape.x),
    y: transform(shape.y),
    w: shape.w * scale,
    h: shape.h * scale,
    r: shape.r * scale,
  }
}

function makeArt(variant) {
  const scale = variant === 'regular' ? 1 : 0.8
  const center = DESIGN_SIZE / 2
  const transformPoint = ([x, y]) => [
    center + (x - center) * scale,
    center + (y - center) * scale,
  ]

  return {
    background:
      variant === 'regular'
        ? { x: 0, y: 0, w: DESIGN_SIZE, h: DESIGN_SIZE, r: 112 }
        : { x: 0, y: 0, w: DESIGN_SIZE, h: DESIGN_SIZE, r: 0 },
    sheet: scaleShape(SHEET, scale),
    lines: LINES.map((line) => scaleShape(line, scale)),
    check: {
      width: CHECK.width * scale,
      points: CHECK.points.map(transformPoint),
    },
  }
}

function colorAt(px, py, art) {
  const halfWidth = art.check.width / 2
  for (let index = 0; index < art.check.points.length - 1; index += 1) {
    const distance = distanceToSegment(
      px,
      py,
      art.check.points[index],
      art.check.points[index + 1],
    )
    if (distance <= halfWidth) return COLORS.yellow
  }

  if (art.lines.some((line) => inRoundedRect(px, py, line))) {
    return COLORS.blue
  }

  if (inRoundedRect(px, py, art.sheet)) return COLORS.white

  if (inRoundedRect(px, py, art.background)) return COLORS.blue

  return null
}

function renderRgba(size, variant) {
  const art = makeArt(variant)
  const scale = DESIGN_SIZE / size
  const samplesPerPixel = SUPERSAMPLE * SUPERSAMPLE
  const pixels = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let red = 0
      let green = 0
      let blue = 0
      let covered = 0

      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const px = (x + (sx + 0.5) / SUPERSAMPLE) * scale
          const py = (y + (sy + 0.5) / SUPERSAMPLE) * scale
          const color = colorAt(px, py, art)

          if (color) {
            covered += 1
            red += color[0]
            green += color[1]
            blue += color[2]
          }
        }
      }

      const offset = (y * size + x) * 4
      pixels[offset] = covered > 0 ? Math.round(red / covered) : 0
      pixels[offset + 1] = covered > 0 ? Math.round(green / covered) : 0
      pixels[offset + 2] = covered > 0 ? Math.round(blue / covered) : 0
      pixels[offset + 3] = Math.round((covered / samplesPerPixel) * 255)
    }
  }

  return pixels
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([length, typeBuffer, data, crc])
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0

  const rowLength = size * 4
  const raw = Buffer.alloc((rowLength + 1) * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * (rowLength + 1)] = 0
    rgba.copy(raw, y * (rowLength + 1) + 1, y * rowLength, (y + 1) * rowLength)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function writePng(name, size, variant) {
  const png = encodePng(size, renderRgba(size, variant))
  writeFileSync(join(ICONS_DIR, name), png)
  return `${name} (${size}x${size}, ${png.length} byte)`
}

function buildSvg() {
  const art = makeArt('regular')
  const shapeToPath = ({ x, y, w, h, r }) =>
    `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`

  const linePaths = LINES.map((line) => shapeToPath(line)).join('')
  const checkPoints = art.check.points
    .map(([x, y]) => `${x} ${y}`)
    .join(' L ')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Quiz Maker">
  <rect width="512" height="512" rx="112" fill="#2750d8"/>
  <path d="${shapeToPath(SHEET)}" fill="#ffffff"/>
  <path d="${linePaths}" fill="#2750d8"/>
  <path d="M ${checkPoints}" fill="none" stroke="#ffc51f" stroke-width="${CHECK.width}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
}

function buildManifest() {
  return `${JSON.stringify(
    {
      name: 'Quiz Maker',
      short_name: 'Quiz Maker',
      description:
        'Aplikasi kuis interaktif untuk anak sekolah. Buat kuis, bagikan kode, dan lihat hasilnya.',
      lang: 'id',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#f7f9ff',
      theme_color: '#2750d8',
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
        { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      ],
    },
    null,
    2,
  )}\n`
}

mkdirSync(ICONS_DIR, { recursive: true })

const results = [
  writePng('icon-192.png', 192, 'regular'),
  writePng('icon-512.png', 512, 'regular'),
  writePng('maskable-512.png', 512, 'maskable'),
  writePng('apple-touch-icon.png', 180, 'maskable'),
  writePng('favicon-32.png', 32, 'regular'),
  writePng('favicon-16.png', 16, 'regular'),
]

writeFileSync(join(PUBLIC_DIR, 'icon.svg'), buildSvg())
writeFileSync(join(PUBLIC_DIR, 'manifest.webmanifest'), buildManifest())

for (const result of results) {
  console.log(`  ${result}`)
}
console.log('  icon.svg')
console.log('  manifest.webmanifest')
console.log('Ikon dan manifest siap di public/.')
