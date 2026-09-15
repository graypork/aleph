import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('public game rules display the same safe landing speed used by normal play', async () => {
  const html = await readFile(new URL('../play/index.html', import.meta.url), 'utf8')
  const source = await readFile(new URL('../src/game/play.js', import.meta.url), 'utf8')
  assert.match(html, /하강속도\s*<span id="rule-safe-speed">3\.5<\/span>\s*이하/)
  assert.match(source, /ruleSafeSpeed:\s*document\.querySelector\('#rule-safe-speed'\)/)
  assert.match(source, /elements\.ruleSafeSpeed\.textContent\s*=\s*runSafeLandingSpeed\.toFixed\(1\)/)
})

test('public game page does not expose the student name', async () => {
  const html = await readFile(new URL('../play/index.html', import.meta.url), 'utf8')
  assert.match(html, /← HOME/)
  assert.doesNotMatch(html, /HWANG\s+GEONHEE|황건희/i)
})

test('motion choice explains which effect it reduces', async () => {
  const html = await readFile(new URL('../play/index.html', import.meta.url), 'utf8')
  assert.match(html, /폭발 모션 줄이기/)
})

test('difficulty experiment compares only 3.5 and 4.0 across the same ten scenarios', async () => {
  const source = await readFile(new URL('../src/game/difficulty-test.js', import.meta.url), 'utf8')
  assert.match(source, /scenarioIndex:\s*index % 10/)
  assert.match(source, /safeSpeed:\s*after \? 4\.0 : 3\.5/)
})

test('public game exposes a sequential 20-run difficulty test workflow', async () => {
  const html = await readFile(new URL('../play/index.html', import.meta.url), 'utf8')
  const source = await readFile(new URL('../src/game/play.js', import.meta.url), 'utf8')
  for (const id of ['difficulty-start','difficulty-progress','difficulty-download','difficulty-reset']) {
    assert.match(html, new RegExp(`id="${id}"`))
  }
  assert.match(html, /20회 난이도 테스트/)
  assert.match(source, /appendDifficultyRecord/)
  assert.match(source, /buildDifficultyCsv/)
  assert.match(source, /recovery-difficulty-test-20-runs\.csv/)
})

test('ranking credentials stay server-side and no concrete Upstash secret is committed', async () => {
  const html = await readFile(new URL('../play/index.html', import.meta.url), 'utf8')
  const playSource = await readFile(new URL('../src/game/play.js', import.meta.url), 'utf8')
  const clientSource = await readFile(new URL('../src/game/ranking-client.js', import.meta.url), 'utf8')
  const storeSource = await readFile(new URL('../api/ranking-store.js', import.meta.url), 'utf8')

  for (const publicSource of [html, playSource, clientSource]) {
    assert.doesNotMatch(publicSource, /UPSTASH_REDIS_REST_TOKEN/)
    assert.doesNotMatch(publicSource, /UPSTASH_REDIS_REST_URL/)
    assert.doesNotMatch(publicSource, /VITE_.*UPSTASH/i)
  }
  assert.match(storeSource, /process\.env\.UPSTASH_REDIS_REST_URL/)
  assert.match(storeSource, /process\.env\.UPSTASH_REDIS_REST_TOKEN/)
  assert.doesNotMatch(storeSource, /https:\/\/[^'"\s]*upstash\.io/i)
})
