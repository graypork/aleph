import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PERSISTENT_STATE,
  loadPersistent,
  savePersistent,
} from '../src/game/storage.js'

const fakeStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    dump: () => Object.fromEntries(data),
  }
}

test('missing storage starts from declared defaults', () => {
  assert.deepEqual(loadPersistent(fakeStorage()), DEFAULT_PERSISTENT_STATE)
})

test('malformed JSON safely falls back to defaults', () => {
  const storage = fakeStorage({ 'recovery-game:v1': '{not-json' })
  assert.deepEqual(loadPersistent(storage), DEFAULT_PERSISTENT_STATE)
})

test('wrong field types are sanitized instead of trusted', () => {
  const storage = fakeStorage({
    'recovery-game:v1': JSON.stringify({
      bestRecoveryQuality: 'high',
      successfulRecoveries: -2,
      reducedMotion: 'yes',
    }),
  })
  assert.deepEqual(loadPersistent(storage), DEFAULT_PERSISTENT_STATE)
})

test('valid persistent values survive save and reload', () => {
  const storage = fakeStorage()
  const value = { bestRecoveryQuality: 93, successfulRecoveries: 4, reducedMotion: true }
  savePersistent(storage, value)
  assert.deepEqual(loadPersistent(storage), value)
})
