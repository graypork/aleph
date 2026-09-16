import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const root = new URL('../public/t04-fixtures/', import.meta.url)

test('official T04 manifest lists 17 files and every SHA-256 matches copied bytes', async () => {
  const manifest = JSON.parse(await readFile(new URL('asset-manifest.json', root), 'utf8'))
  assert.equal(manifest.package_id, 'aleph-t04-real-information-board-public-contract-v2')
  assert.equal(manifest.files.length, 17)
  for (const item of manifest.files) {
    const bytes = await readFile(new URL(item.path, root))
    assert.equal(bytes.length, item.bytes, `${item.path} byte length`)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, `${item.path} sha256`)
  }
})
