import test from 'node:test'
import assert from 'node:assert/strict'
import {
  comparisonFor,
  kstDate,
  upsertDailyRow,
  validateNormalizedReading,
} from '../src/board/model.js'

const reading = (overrides = {}) => ({
  signal_id: 'seoul.temperature_2m',
  normalized_value: 23.4,
  unit: '°C',
  source_name: 'Open-Meteo',
  source_url: 'https://api.open-meteo.com/v1/forecast?latitude=37.5665',
  source_time: '2026-09-16T13:45:00+09:00',
  fetched_at: '2026-09-16T04:46:00.000Z',
  record_timezone: 'Asia/Seoul',
  record_date: '2026-09-16',
  ...overrides,
})

test('kstDate derives the Asia/Seoul calendar date around UTC midnight', () => {
  assert.equal(kstDate('2026-09-15T15:00:00.000Z'), '2026-09-16')
  assert.equal(kstDate('2026-09-16T14:59:59.000Z'), '2026-09-16')
  assert.equal(kstDate('2026-09-16T15:00:00.000Z'), '2026-09-17')
})

test('validateNormalizedReading accepts the exact contract and rejects record_date mismatch', () => {
  assert.equal(validateNormalizedReading(reading()), true)
  assert.throws(() => validateNormalizedReading(reading({ record_date: '2026-09-15' })), /record_date/)
})

test('same-day upsert keeps one row and preserves stable record id plus first fetched time', () => {
  const first = upsertDailyRow([], reading({ normalized_value: 20, fetched_at: '2026-09-16T01:00:00.000Z' }))
  const firstId = first.rows[0].record_id
  const second = upsertDailyRow(first.rows, reading({ normalized_value: 21, fetched_at: '2026-09-16T03:00:00.000Z' }))
  assert.equal(second.rows.length, 1)
  assert.equal(second.rows[0].record_id, firstId)
  assert.equal(second.rows[0].first_fetched_at, '2026-09-16T01:00:00.000Z')
  assert.equal(second.rows[0].last_fetched_at, '2026-09-16T03:00:00.000Z')
  assert.equal(second.rows[0].normalized_value, 21)
})

test('next KST date creates a second row and comparison uses signed delta', () => {
  const day1 = upsertDailyRow([], reading({ normalized_value: 20 }))
  const day2Reading = reading({
    normalized_value: 17.5,
    fetched_at: '2026-09-17T04:46:00.000Z',
    record_date: '2026-09-17',
    source_time: '2026-09-17T13:45:00+09:00',
  })
  const day2 = upsertDailyRow(day1.rows, day2Reading)
  assert.equal(day2.rows.length, 2)
  assert.deepEqual(comparisonFor(day2.rows, day2.rows[1]), {
    state: 'comparable',
    signed: -2.5,
    direction: 'decrease',
    magnitude: 2.5,
    unit: '°C',
  })
})
