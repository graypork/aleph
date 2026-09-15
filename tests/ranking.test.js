import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeNickname,
  isValidNickname,
  encodeRankingScore,
  isBetterRecord,
} from '../src/game/ranking.js'

test('nickname is trimmed and normalized to uppercase callsign', () => {
  assert.equal(normalizeNickname(' miles_7 '), 'MILES_7')
  assert.equal(isValidNickname('MILES_7'), true)
  assert.equal(isValidNickname('황건희'), false)
  assert.equal(isValidNickname('A'), false)
})

test('quality outranks time and faster time breaks equal-quality ties', () => {
  assert.ok(encodeRankingScore(97, 29.9) > encodeRankingScore(96, 1.0))
  assert.ok(encodeRankingScore(97, 17.2) > encodeRankingScore(97, 19.2))
  assert.equal(isBetterRecord({ quality: 97, timeSeconds: 17.2 }, { quality: 97, timeSeconds: 19.2 }), true)
})
