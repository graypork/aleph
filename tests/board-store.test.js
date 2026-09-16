import test from 'node:test'
import assert from 'node:assert/strict'
import { createBoardStore, LIVE_DAYS_KEY } from '../api/board-store.js'

const reading = (date, value, fetchedAt = `${date}T04:00:00.000Z`) => ({
  signal_id: 'seoul.temperature_2m',
  normalized_value: value,
  unit: '°C',
  source_name: 'Open-Meteo',
  source_url: 'https://api.open-meteo.com/v1/forecast?latitude=37.5665',
  source_time: `${date}T13:00:00+09:00`,
  fetched_at: fetchedAt,
  record_timezone: 'Asia/Seoul',
  record_date: date,
})

function fakeRedis() {
  const hashes = new Map()
  const hash = (key) => {
    if (!hashes.has(key)) hashes.set(key, new Map())
    return hashes.get(key)
  }
  return {
    hashes,
    async command(parts) {
      const [op, key, ...args] = parts
      if (op === 'HGET') return hash(key).get(args[0]) ?? null
      if (op === 'HGETALL') return [...hash(key)].flatMap(([field, value]) => [field, value])
      if (op === 'EVAL') {
        const redisKey = args[1]
        const field = args[2]
        const value = args[3]
        const h = hash(redisKey)
        if (h.has(field) || h.size < 2) {
          h.set(field, value)
          return 1
        }
        return 0
      }
      throw new Error(`unsupported command ${op}`)
    },
  }
}

test('same KST date updates one Redis hash field while preserving stable ids/timestamps', async () => {
  const redis = fakeRedis()
  const times = [new Date('2026-09-16T05:00:00Z'), new Date('2026-09-16T06:00:00Z')]
  const store = createBoardStore(redis.command, () => times.shift())
  const first = await store.saveLiveReading(reading('2026-09-16', 20), { current: { temperature_2m: 20 } })
  const second = await store.saveLiveReading(reading('2026-09-16', 21, '2026-09-16T05:30:00.000Z'), { current: { temperature_2m: 21 } })
  assert.equal(first.days.length, 1)
  assert.equal(second.days.length, 1)
  assert.equal(second.days[0].record_id, first.days[0].record_id)
  assert.equal(second.days[0].server_created_at, first.days[0].server_created_at)
  assert.equal(second.days[0].normalized_value, 21)
  assert.equal(redis.hashes.get(LIVE_DAYS_KEY).size, 1)
})

test('second real date inserts, third distinct date is displayed but not appended', async () => {
  const redis = fakeRedis()
  let tick = 0
  const store = createBoardStore(redis.command, () => new Date(`2026-09-${16 + tick++}T05:00:00Z`))
  const d1 = await store.saveLiveReading(reading('2026-09-16', 20), {})
  const d2 = await store.saveLiveReading(reading('2026-09-17', 22), {})
  const d3 = await store.saveLiveReading(reading('2026-09-18', 24), {})
  assert.equal(d1.persisted, true)
  assert.equal(d2.persisted, true)
  assert.equal(d3.persisted, false)
  assert.equal(d3.evidenceLocked, true)
  assert.deepEqual(d3.days.map((row) => row.record_date), ['2026-09-16', '2026-09-17'])
})

test('listEvidenceDays returns sorted rows and readLastGood returns newest stored date', async () => {
  const redis = fakeRedis()
  const store = createBoardStore(redis.command, () => new Date('2026-09-16T05:00:00Z'))
  await store.saveLiveReading(reading('2026-09-17', 22), {})
  await store.saveLiveReading(reading('2026-09-16', 20), {})
  const days = await store.listEvidenceDays()
  assert.deepEqual(days.map((row) => row.record_date), ['2026-09-16', '2026-09-17'])
  assert.equal((await store.readLastGood()).normalized_value, 22)
})

test('receipts expose exactly the canonical T04 grading payload fields', async () => {
  const redis = fakeRedis()
  const store = createBoardStore(redis.command, () => new Date('2026-09-16T05:00:00Z'))
  await store.saveLiveReading(reading('2026-09-16', 20), {})
  const [receipt] = store.receiptsFor(await store.listEvidenceDays())
  assert.equal(receipt.kind, 't04_day')
  assert.equal(receipt.server_created_at, '2026-09-16T05:00:00.000Z')
  assert.deepEqual(Object.keys(receipt.payload).sort(), ['normalized_value', 'source_observed_at', 'source_url', 'unit'])
  assert.equal(receipt.payload.normalized_value, 20)
})
