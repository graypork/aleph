import { deflateSync } from 'node:zlib'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, crc])
}

function makePng(width, height, variant) {
  const stride = 1 + width * 3
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y += 1) {
    const row = y * stride
    raw[row] = 0
    for (let x = 0; x < width; x += 1) {
      const i = row + 1 + x * 3
      const nx = x / width
      const ny = y / height
      let rgb
      if (variant === 1) {
        const band = Math.abs(nx - ny) < 0.09
        rgb = band ? [238, 232, 215] : [33 + Math.round(25 * ny), 43 + Math.round(18 * nx), 74 + Math.round(30 * nx)]
      } else if (variant === 2) {
        const card = nx > 0.16 && nx < 0.84 && ny > 0.22 && ny < 0.78
        rgb = card ? [235, 231, 218] : [27, 29 + Math.round(38 * nx), 36 + Math.round(55 * ny)]
      } else {
        const horizon = ny > 0.62
        const beam = Math.abs(nx - 0.5) < (0.06 + ny * 0.04)
        rgb = beam ? [229, 224, 206] : horizon ? [39, 43, 52] : [22 + Math.round(30 * ny), 25 + Math.round(24 * nx), 37 + Math.round(45 * nx)]
      }
      raw[i] = rgb[0]
      raw[i + 1] = rgb[1]
      raw[i + 2] = rgb[2]
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND'),
  ])
}

const samples = [
  ['card-studio-output-1-square.png', 1080, 1080, 1],
  ['card-studio-output-2-feed.png', 1080, 1350, 2],
  ['card-studio-output-3-story.png', 1080, 1920, 3],
]

for (const [name, width, height, variant] of samples) {
  await writeFile(resolve(root, 'evidence', name), makePng(width, height, variant))
  console.log(`${name}: ${width}x${height}`)
}
