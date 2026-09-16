import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createReplayState, runFixture } from '../src/board/replay.js'

const fixture = async (name) => JSON.parse(await readFile(new URL(`../public/t04-fixtures/fixtures/${name}.json`, import.meta.url), 'utf8'))

async function baseline() {
  let state = createReplayState()
  state = runFixture(state, await fixture('normal-d1-a'))
  state = runFixture(state, await fixture('normal-d1-b'))
  return state
}

test('D1-A then D1-B updates the same daily row to 105', async () => {
  const state = await baseline()
  assert.equal(state.daily_readings.length, 1)
  assert.equal(state.current_reading.normalized_value, 105)
  assert.deepEqual(state.status, { freshness: 'fresh', error_code: 'none' })
})

test('D2 adds exactly one next-date row and yields +15', async () => {
  let state = await baseline()
  state = runFixture(state, await fixture('normal-d2'))
  assert.equal(state.daily_readings.length, 2)
  assert.equal(state.daily_readings[1].record_date, '2026-08-25')
  assert.equal(state.current_reading.normalized_value, 120)
  assert.equal(state.last_comparison.signed, 15)
})

for (const [file, code] of [
  ['timeout', 'timeout'],
  ['auth-401', 'auth'],
  ['rate-429', 'rate_limit'],
  ['offline', 'offline'],
  ['schema-break', 'schema_error'],
]) {
  test(`${file} preserves last good 105 and exposes ${code}`, async () => {
    let state = await baseline()
    state = runFixture(state, await fixture(file))
    assert.equal(state.daily_readings.length, 1)
    assert.equal(state.current_reading.normalized_value, 105)
    assert.deepEqual(state.status, { freshness: 'stale', error_code: code })
  })
}

test('RECOVER-D2 after timeout returns fresh/none and adds one D2 row', async () => {
  let state = await baseline()
  state = runFixture(state, await fixture('timeout'))
  state = runFixture(state, await fixture('recover-d2'))
  assert.deepEqual(state.status, { freshness: 'fresh', error_code: 'none' })
  assert.equal(state.daily_readings.length, 2)
  assert.equal(state.daily_readings.filter((row) => row.record_date === '2026-08-25').length, 1)
  assert.equal(state.current_reading.normalized_value, 120)
})
