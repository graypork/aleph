import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateRankingPayload,
  rankRows,
  createRankingStore,
} from '../api/ranking-store.js'

test('ranking payload rejects invalid names and impossible values', () => {
  assert.equal(validateRankingPayload({ nickname: 'MILES', quality: 97, timeSeconds: 18.4 }).ok, true)
  assert.equal(validateRankingPayload({ nickname: '황건희', quality: 97, timeSeconds: 18.4 }).ok, false)
  assert.equal(validateRankingPayload({ nickname: 'MILES', quality: 101, timeSeconds: 18.4 }).ok, false)
  assert.equal(validateRankingPayload({ nickname: 'MILES', quality: 97, timeSeconds: 31 }).ok, false)
})

test('rankRows orders quality desc then time asc and assigns rank', () => {
  const rows = rankRows([
    { nickname: 'B1', quality: 96, timeSeconds: 10 },
    { nickname: 'C1', quality: 97, timeSeconds: 19 },
    { nickname: 'A1', quality: 97, timeSeconds: 17 },
  ])
  assert.deepEqual(rows.map((row) => [row.rank, row.nickname]), [[1, 'A1'], [2, 'C1'], [3, 'B1']])
})

test('shared store keeps only the best record for the same nickname', async () => {
  const scores = new Map()
  const records = new Map()
  const command = async (args) => {
    const [op, key, ...rest] = args
    if (op === 'ZADD') {
      const score = Number(rest[2])
      const nickname = rest[3]
      const previous = scores.get(nickname)
      if (previous === undefined || score > previous) {
        scores.set(nickname, score)
        return 1
      }
      return 0
    }
    if (op === 'HSET') {
      records.set(rest[0], rest[1])
      return 1
    }
    if (op === 'ZRANGE') {
      return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
    }
    if (op === 'HMGET') {
      return rest.map((name) => records.get(name) ?? null)
    }
    throw new Error(`unexpected command ${op} ${key}`)
  }

  const store = createRankingStore(command)
  await store.saveBestRanking({ nickname: 'MILES', quality: 95, timeSeconds: 18.5 })
  await store.saveBestRanking({ nickname: 'MILES', quality: 94, timeSeconds: 10.0 })
  await store.saveBestRanking({ nickname: 'MILES', quality: 95, timeSeconds: 17.2 })

  const rows = await store.readTopRankings(10)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].nickname, 'MILES')
  assert.equal(rows[0].quality, 95)
  assert.equal(rows[0].timeSeconds, 17.2)
})
