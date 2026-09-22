import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const loadReport = () => import(`../src/board/failure-report.js?run=${Date.now()}-${Math.random()}`)

const fixtures = {
  d1a: 'normal-d1-a.json',
  d1b: 'normal-d1-b.json',
  timeout: 'timeout.json',
  auth: 'auth-401.json',
  rate_limit: 'rate-429.json',
  offline: 'offline.json',
  schema_error: 'schema-break.json',
  recover: 'recover-d2.json',
}

async function loadFixture(name) {
  return JSON.parse(await read(`public/t04-fixtures/fixtures/${fixtures[name]}`))
}

async function suite() {
  const mod = await loadReport()
  return mod.runFailureBatch(loadFixture)
}

for (const [id, key, code] of [
  ['T05-FIX-01', 'timeout', 'timeout'],
  ['T05-FIX-02', 'auth', 'auth'],
  ['T05-FIX-03', 'rate_limit', 'rate_limit'],
  ['T05-FIX-04', 'offline', 'offline'],
  ['T05-FIX-05', 'schema_error', 'schema_error'],
]) {
  test(`${id} ${key} row is stale/${code}/105/1`, async () => {
    const rows = await suite()
    const row = rows.find((item) => item.key === key)
    assert.ok(row)
    assert.deepEqual(
      { freshness: row.freshness, error_code: row.error_code, value: row.value, row_count: row.row_count },
      { freshness: 'stale', error_code: code, value: 105, row_count: 1 },
    )
  })
}

test('T05-FIX-06 batch has exactly five rows and preserves 105/1 in every row', async () => {
  const rows = await suite()
  assert.equal(rows.length, 5)
  assert.equal(rows.every((row) => row.value === 105 && row.row_count === 1), true)
})

test('T05-FIX-07 batch order is frozen', async () => {
  const rows = await suite()
  assert.deepEqual(rows.map((row) => row.key), ['timeout', 'auth', 'rate_limit', 'offline', 'schema_error'])
})

test('T05-FIX-08 public board wires Run all failures to the five-row report body', async () => {
  const html = await read('board/index.html')
  const js = await read('src/board/board.js')
  assert.match(html, /id=["']run-all-failures["']/)
  assert.match(html, /id=["']failure-report-body["']/)
  assert.match(js, /runFailureBatch/)
  assert.match(js, /failure-report-body|failureReportBody/)
  assert.match(js, /run-all-failures/)
})

test('T05-FIX-09 reset clears batch report and returns synthetic state to none/none/0', async () => {
  const js = await read('src/board/board.js')
  assert.match(js, /clearFailureReport/)
  assert.match(js, /replay-reset[\s\S]{0,500}clearFailureReport/)
  assert.match(js, /createReplayState\(\)/)
})

test('T05-FIX-10 recovery summary exposes fresh/none/120/2 after timeout recovery', async () => {
  const mod = await loadReport()
  const recovery = await mod.runRecoverySummary(loadFixture)
  assert.deepEqual(recovery, { freshness: 'fresh', error_code: 'none', value: 120, row_count: 2 })
  const js = await read('src/board/board.js')
  assert.match(js, /runRecoverySummary/)
  assert.match(js, /recovery-summary|recoverySummary/)
})
