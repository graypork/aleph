import test from 'node:test'
import assert from 'node:assert/strict'
import { createBoardLiveHandler } from '../api/board/live.js'

function resRecorder() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

const reading = {
  signal_id: 'seoul.temperature_2m',
  normalized_value: 23.4,
  unit: '°C',
  source_name: 'Open-Meteo',
  source_url: 'https://api.open-meteo.com/v1/forecast?latitude=37.5665',
  source_time: '2026-09-16T13:45:00+09:00',
  fetched_at: '2026-09-16T04:46:00.000Z',
  record_timezone: 'Asia/Seoul',
  record_date: '2026-09-16',
}

const day = {
  record_id: 't04-seoul.temperature_2m-2026-09-16',
  signal_id: reading.signal_id,
  record_date: reading.record_date,
  normalized_value: reading.normalized_value,
  unit: reading.unit,
  source_name: reading.source_name,
  source_url: reading.source_url,
  source_observed_at: reading.source_time,
  first_fetched_at: reading.fetched_at,
  last_fetched_at: reading.fetched_at,
  server_created_at: '2026-09-16T04:46:01.000Z',
  raw_snapshot: { current: { temperature_2m: 23.4 } },
  reading,
}

test('GET fresh success persists reading and exposes raw/stored/display agreement', async () => {
  const store = {
    async saveLiveReading() { return { persisted: true, evidenceLocked: false, row: day, days: [day] } },
    async readLastGood() { return day },
    receiptsFor(days) { return days.map((row) => ({ kind: 't04_day', server_created_at: row.server_created_at, payload: { normalized_value: row.normalized_value } })) },
  }
  const handler = createBoardLiveHandler({
    fetchReading: async () => ({ reading, raw: { current: { temperature_2m: 23.4 } } }),
    store,
  })
  const res = resRecorder()
  await handler({ method: 'GET' }, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.ok, true)
  assert.deepEqual(res.body.status, { freshness: 'fresh', error_code: 'none' })
  assert.equal(res.body.rawCheck.raw_value, 23.4)
  assert.equal(res.body.rawCheck.stored_value, 23.4)
  assert.equal(res.body.rawCheck.display_value, 23.4)
  assert.equal(res.body.evidenceDays.length, 1)
})

test('live source failure returns last good value as stale and never deletes evidence', async () => {
  const store = {
    async saveLiveReading() { throw new Error('must not be called') },
    async listEvidenceDays() { return [day] },
    async readLastGood() { return day },
    receiptsFor(days) { return days.map((row) => ({ kind: 't04_day', server_created_at: row.server_created_at, payload: {} })) },
  }
  const handler = createBoardLiveHandler({
    fetchReading: async () => { const e = new Error('slow'); e.code = 'timeout'; throw e },
    store,
  })
  const res = resRecorder()
  await handler({ method: 'GET' }, res)
  assert.equal(res.statusCode, 502)
  assert.equal(res.body.ok, false)
  assert.equal(res.body.reading.normalized_value, 23.4)
  assert.deepEqual(res.body.status, { freshness: 'stale', error_code: 'timeout' })
  assert.equal(res.body.evidenceDays.length, 1)
  assert.equal(res.body.retryable, true)
})

test('unknown upstream live error is normalized into contract-safe offline status', async () => {
  const store = {
    async listEvidenceDays() { return [] },
    async readLastGood() { return null },
    receiptsFor() { return [] },
  }
  const handler = createBoardLiveHandler({
    fetchReading: async () => { const e = new Error('500'); e.code = 'upstream'; throw e },
    store,
  })
  const res = resRecorder()
  await handler({ method: 'GET' }, res)
  assert.equal(res.body.status.error_code, 'offline')
})

test('non-GET methods are rejected without touching live source', async () => {
  let calls = 0
  const handler = createBoardLiveHandler({
    fetchReading: async () => { calls += 1 },
    store: {},
  })
  const res = resRecorder()
  await handler({ method: 'POST' }, res)
  assert.equal(res.statusCode, 405)
  assert.equal(calls, 0)
})
