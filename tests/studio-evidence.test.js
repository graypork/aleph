import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

const samples = [
  ['card-studio-output-1-square.png', 1080, 1080],
  ['card-studio-output-2-feed.png', 1080, 1350],
  ['card-studio-output-3-story.png', 1080, 1920],
]

function parsePng(buffer) {
  const signature = buffer.subarray(0, 8)
  assert.deepEqual([...signature], [137,80,78,71,13,10,26,10])
  let offset = 8
  const chunks = []
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    chunks.push({ type, data })
    offset += 12 + length
    if (type === 'IEND') break
  }
  return chunks
}

test('three finished PNG samples exist, open as PNG, and use exact assignment dimensions', async () => {
  for (const [name, width, height] of samples) {
    const url = new URL(`../evidence/${name}`, import.meta.url)
    assert.ok((await stat(url)).size > 100)
    const chunks = parsePng(await readFile(url))
    const ihdr = chunks.find(chunk => chunk.type === 'IHDR')
    assert.ok(ihdr)
    assert.equal(ihdr.data.readUInt32BE(0), width)
    assert.equal(ihdr.data.readUInt32BE(4), height)
  }
})

test('sample PNGs carry no EXIF/GPS/text metadata chunks', async () => {
  for (const [name] of samples) {
    const chunks = parsePng(await readFile(new URL(`../evidence/${name}`, import.meta.url)))
    const types = chunks.map(chunk => chunk.type)
    for (const forbidden of ['eXIf', 'tEXt', 'zTXt', 'iTXt']) assert.equal(types.includes(forbidden), false, `${name} contains ${forbidden}`)
    assert.deepEqual(types, ['IHDR', 'IDAT', 'IEND'])
  }
})

test('rights evidence records all three finished images as self-made', async () => {
  const rights = await readFile(new URL('../evidence/card-studio-rights.md', import.meta.url), 'utf8')
  for (const [name] of samples) {
    assert.match(rights, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.equal((rights.match(/본인 제작/g) || []).length >= 3, true)
})
