import test from 'node:test'
import assert from 'node:assert/strict'
import {
  loadSessionNickname,
  saveSessionNickname,
  fetchRankings,
  submitRanking,
} from '../src/game/ranking-client.js'

function memoryStorage() {
  const map = new Map()
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
  }
}

test('session nickname round-trips and invalid stored value returns blank', () => {
  const storage = memoryStorage()
  assert.equal(loadSessionNickname(storage), '')
  assert.equal(saveSessionNickname(storage, ' miles_7 '), 'MILES_7')
  assert.equal(loadSessionNickname(storage), 'MILES_7')
  storage.setItem('recovery-game:player-nickname:v1', '황건희')
  assert.equal(loadSessionNickname(storage), '')
})

test('fetchRankings reads GET /api/ranking', async () => {
  let called
  const fetchImpl = async (url, options) => {
    called = { url, options }
    return { ok: true, json: async () => ({ rankings: [{ rank: 1, nickname: 'MILES', quality: 97, timeSeconds: 18.42 }] }) }
  }
  const rows = await fetchRankings(fetchImpl)
  assert.equal(called.url, '/api/ranking')
  assert.equal(called.options.method, 'GET')
  assert.equal(rows[0].nickname, 'MILES')
})

test('submitRanking posts JSON to /api/ranking', async () => {
  let called
  const fetchImpl = async (url, options) => {
    called = { url, options }
    return { ok: true, json: async () => ({ accepted: true, improved: true }) }
  }
  const result = await submitRanking(fetchImpl, { nickname: 'MILES', quality: 97, timeSeconds: 18.42 })
  assert.equal(called.url, '/api/ranking')
  assert.equal(called.options.method, 'POST')
  assert.equal(called.options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(called.options.body), { nickname: 'MILES', quality: 97, timeSeconds: 18.42 })
  assert.equal(result.improved, true)
})
