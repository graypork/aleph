import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LiveSourceError,
  buildOpenMeteoUrl,
  fetchLiveReading,
  normalizeOpenMeteoPayload,
} from '../api/board-live-adapter.js'

const sample = {
  latitude: 37.55,
  longitude: 127,
  generationtime_ms: 0.02,
  utc_offset_seconds: 32400,
  timezone: 'Asia/Seoul',
  timezone_abbreviation: 'GMT+9',
  elevation: 38,
  current_units: { time: 'iso8601', interval: 'seconds', temperature_2m: '°C' },
  current: { time: '2026-09-16T13:45', interval: 900, temperature_2m: 23.4 },
}

test('Open-Meteo URL is public, keyless, Seoul-scoped, current temperature, KST', () => {
  const url = new URL(buildOpenMeteoUrl())
  assert.equal(url.protocol, 'https:')
  assert.equal(url.hostname, 'api.open-meteo.com')
  assert.equal(url.searchParams.get('latitude'), '37.5665')
  assert.equal(url.searchParams.get('longitude'), '126.978')
  assert.equal(url.searchParams.get('current'), 'temperature_2m')
  assert.equal(url.searchParams.get('timezone'), 'Asia/Seoul')
  for (const key of url.searchParams.keys()) assert.doesNotMatch(key, /key|token|secret/i)
})

test('Open-Meteo payload normalizes source time separately from fetched time', () => {
  const reading = normalizeOpenMeteoPayload(sample, '2026-09-16T04:46:00.000Z')
  assert.equal(reading.signal_id, 'seoul.temperature_2m')
  assert.equal(reading.normalized_value, 23.4)
  assert.equal(reading.unit, '°C')
  assert.equal(reading.source_name, 'Open-Meteo')
  assert.equal(reading.source_time, '2026-09-16T13:45:00+09:00')
  assert.equal(reading.fetched_at, '2026-09-16T04:46:00.000Z')
  assert.equal(reading.record_date, '2026-09-16')
})

test('schema changes are rejected as schema_error', () => {
  assert.throws(
    () => normalizeOpenMeteoPayload({ ...sample, current: { ...sample.current, temperature_2m: '23.4' } }, '2026-09-16T04:46:00.000Z'),
    (error) => error instanceof LiveSourceError && error.code === 'schema_error',
  )
})

test('fetchLiveReading returns raw snapshot plus normalized reading on HTTP 200', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return { ok: true, status: 200, json: async () => sample }
  }
  const result = await fetchLiveReading(fetchImpl, () => new Date('2026-09-16T04:46:00.000Z'))
  assert.equal(result.reading.normalized_value, 23.4)
  assert.equal(result.raw.current.temperature_2m, 23.4)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].options.headers.Accept, 'application/json')
})

test('non-2xx upstream statuses become typed auth/rate/upstream errors', async () => {
  const makeFetch = (status) => async () => ({ ok: false, status, json: async () => ({}) })
  await assert.rejects(fetchLiveReading(makeFetch(401)), (e) => e.code === 'auth')
  await assert.rejects(fetchLiveReading(makeFetch(429)), (e) => e.code === 'rate_limit')
  await assert.rejects(fetchLiveReading(makeFetch(500)), (e) => e.code === 'upstream')
})

test('network failure becomes offline unless it is an AbortError timeout', async () => {
  await assert.rejects(fetchLiveReading(async () => { throw new TypeError('network') }), (e) => e.code === 'offline')
  const abort = new Error('aborted')
  abort.name = 'AbortError'
  await assert.rejects(fetchLiveReading(async () => { throw abort }), (e) => e.code === 'timeout')
})
