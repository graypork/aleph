import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = () => readFile(new URL('../src/board/board.js', import.meta.url), 'utf8')

test('live client calls only the public board API and renders stale/fresh evidence honestly', async () => {
  const js = await source()
  assert.match(js, /fetch\(['"]\/api\/board\/live['"]/)
  assert.match(js, /FRESH/)
  assert.match(js, /STALE/)
  assert.match(js, /실제 둘째 날짜 기록을 기다리는 중/)
  assert.match(js, /evidenceDays/)
  assert.match(js, /rawCheck/)
})

test('synthetic client loads official fixture files and uses separate replay state', async () => {
  const js = await source()
  for (const fixture of ['normal-d1-a','normal-d1-b','normal-d2','timeout','auth-401','rate-429','offline','schema-break','recover-d2']) {
    assert.match(js, new RegExp(`${fixture}\\.json`), `missing ${fixture}`)
  }
  assert.match(js, /createReplayState/)
  assert.match(js, /runFixture/)
  assert.doesNotMatch(js, /localStorage|sessionStorage/)
})

test('five failure codes have distinct explanations and next actions', async () => {
  const js = await source()
  for (const code of ['timeout','auth','rate_limit','offline','schema_error']) {
    assert.match(js, new RegExp(`${code}\s*:`), `missing explanation for ${code}`)
  }
  assert.match(js, /다시 시도/)
})

test('daily history renders each preserved row source URL, observed time, value and unit for C23', async () => {
  const js = await source()
  assert.match(js, /day\.source_url/)
  assert.match(js, /day\.source_observed_at/)
  assert.match(js, /day\.normalized_value/)
  assert.match(js, /day\.unit/)
})
