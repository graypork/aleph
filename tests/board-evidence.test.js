import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('package hash evidence records official package id and zero manifest mismatches', async () => {
  const text = await read('evidence/t04-package-hash-check.md')
  assert.match(text, /aleph-t04-real-information-board-public-contract-v2/)
  assert.match(text, /17\/17/)
  assert.match(text, /mismatch(?:es)?\s*[:=]\s*0/i)
})

test('fixture transition evidence records five distinct stale failures and recovery values', async () => {
  const text = await read('evidence/t04-fixture-transitions.md')
  for (const token of ['timeout','auth','rate_limit','offline','schema_error']) assert.match(text, new RegExp(token))
  assert.match(text, /last good[^\n]*105/i)
  assert.match(text, /fresh[^\n]*none/i)
  assert.match(text, /120/)
  assert.match(text, /2026-08-25/)
})

test('secret scan evidence covers browser, api, fixtures, and reports no literal secret assignment', async () => {
  const evidence = await read('evidence/t04-secret-scan.md')
  assert.match(evidence, /browser/i)
  assert.match(evidence, /api/i)
  assert.match(evidence, /fixture/i)
  assert.match(evidence, /secret plaintext matches\s*[:=]\s*0/i)

  const paths = [
    'board/index.html', 'src/board/board.js', 'src/board/board.css', 'src/board/model.js', 'src/board/replay.js',
    'api/board-live-adapter.js', 'api/board-store.js', 'api/board/live.js',
  ]
  const combined = (await Promise.all(paths.map(read))).join('\n')
  assert.doesNotMatch(combined, /(UPSTASH_REDIS_REST_TOKEN|API_KEY|SECRET|PASSWORD)\s*=\s*["'][^"']+["']/i)
  assert.doesNotMatch(combined, /황건희|Geonhee|hgh0759|miles@/i)
})

test('live evidence status explicitly refuses to fabricate day 1/day 2 before deployment', async () => {
  const text = await read('evidence/t04-live-evidence-status.md')
  assert.match(text, /실제 조회/i)
  assert.match(text, /조작하지 않/i)
  assert.match(text, /C22.*C24/s)
})

test('assignment handoff requires tests and build before commit and names immutable source URL requirement', async () => {
  const guide = await read('APPLY-FIX-ASSIGNMENT-04.md')
  const script = await read('APPLY-ASSIGNMENT-04.sh')
  assert.match(guide, /https:\/\/whogh\.vercel\.app\/board\//)
  assert.match(guide, /40자리/)
  assert.match(script, /node --test tests\/\*\.test\.js/)
  assert.match(script, /npm run build/)
  assert.match(script, /git push origin main/)
})
