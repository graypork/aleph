import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/game/play.css', import.meta.url), 'utf8')

test('game world is tall enough for result overlay', () => {
  assert.match(css, /\.world\s*\{[\s\S]*?aspect-ratio:\s*1200\s*\/\s*500\s*;/)
  assert.match(css, /\.world\s*\{[\s\S]*?min-height:\s*440px\s*;/)
  assert.match(css, /\.world\s*\{[\s\S]*?max-height:\s*none\s*;/)
})

test('result card cannot be clipped by the game world', () => {
  assert.match(css, /\.state-card\s*\{[\s\S]*?max-height:\s*calc\(100%\s*-\s*32px\)\s*;/)
  assert.match(css, /\.state-card\s*\{[\s\S]*?overflow-y:\s*auto\s*;/)
})
