import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const cssUrl = new URL('../src/game/play.css', import.meta.url)

test('game palette matches the WHAT CONNECTS THEM section and removes neon green', async () => {
  const css = await readFile(cssUrl, 'utf8')
  assert.match(css, /--bg:\s*#17191f;/i)
  assert.match(css, /--accent:\s*#f4efe4;/i)
  assert.match(css, /--line:\s*#494b48;/i)
  assert.match(css, /--muted:\s*#aaa9a4;/i)
  assert.doesNotMatch(css, /#c8ff3d/i)
})
