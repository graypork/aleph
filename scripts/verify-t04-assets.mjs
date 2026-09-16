import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const root = new URL('../public/t04-fixtures/', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('asset-manifest.json', root), 'utf8'))
let mismatches = 0
for (const item of manifest.files) {
  try {
    const bytes = await readFile(new URL(item.path, root))
    const digest = createHash('sha256').update(bytes).digest('hex')
    if (bytes.length !== item.bytes || digest !== item.sha256) {
      mismatches += 1
      console.error(`MISMATCH ${item.path}`)
    }
  } catch {
    mismatches += 1
    console.error(`MISSING ${item.path}`)
  }
}
console.log(`package_id=${manifest.package_id}`)
console.log(`verified=${manifest.files.length - mismatches}/${manifest.files.length}`)
console.log(`mismatches=${mismatches}`)
if (mismatches) process.exitCode = 1
