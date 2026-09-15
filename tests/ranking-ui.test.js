import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const htmlPromise = readFile(new URL('../play/index.html', import.meta.url), 'utf8')
const sourcePromise = readFile(new URL('../src/game/play.js', import.meta.url), 'utf8')

test('public game exposes nickname controls and TOP 10 ranking UI', async () => {
  const html = await htmlPromise
  for (const id of ['player-nickname', 'player-save', 'player-error', 'ranking-list', 'ranking-refresh', 'ranking-status']) {
    assert.match(html, new RegExp(`id="${id}"`))
  }
  assert.match(html, /닉네임 · 실명 입력 금지/)
  assert.match(html, /TOP 10/)
})

test('normal successful landing submits ranking and refreshes it, but test runs do not', async () => {
  const source = await sourcePromise
  assert.match(source, /loadSessionNickname/)
  assert.match(source, /saveSessionNickname/)
  assert.match(source, /submitRanking/)
  assert.match(source, /fetchRankings/)
  assert.match(source, /if \(landing\.success\)[\s\S]*if \(!runTestConfig\)[\s\S]*submitNormalRanking/s)
  assert.match(source, /await submitRanking\(fetch,[\s\S]*await refreshRankings\(\)/s)
})

test('normal START is guarded by a valid nickname while difficulty test remains separate', async () => {
  const source = await sourcePromise
  assert.match(source, /function ensureNormalNickname\(/)
  assert.match(source, /if \(!runTestConfig && !ensureNormalNickname\(\)\) return/)
  assert.match(source, /function startDifficultyTest\(\)[\s\S]*difficultyModeEnabled = true/s)
})
