import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TOTAL_DIFFICULTY_RUNS,
  createDifficultySession,
  getDifficultyRunConfig,
  appendDifficultyRecord,
  buildDifficultyCsv,
  loadDifficultySession,
  saveDifficultySession,
} from '../src/game/difficulty-test.js'

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, String(value)) },
    removeItem(key) { values.delete(key) },
  }
}

test('difficulty test runs the same ten scenarios at 3.5 then 4.0', () => {
  const session = createDifficultySession()
  assert.equal(TOTAL_DIFFICULTY_RUNS, 20)

  const first = getDifficultyRunConfig(session, 0)
  const tenth = getDifficultyRunConfig(session, 9)
  const eleventh = getDifficultyRunConfig(session, 10)
  const twentieth = getDifficultyRunConfig(session, 19)

  assert.deepEqual(first, { run: 1, group: 'BEFORE', scenarioIndex: 0, safeSpeed: 3.5 })
  assert.deepEqual(tenth, { run: 10, group: 'BEFORE', scenarioIndex: 9, safeSpeed: 3.5 })
  assert.deepEqual(eleventh, { run: 11, group: 'AFTER', scenarioIndex: 0, safeSpeed: 4.0 })
  assert.deepEqual(twentieth, { run: 20, group: 'AFTER', scenarioIndex: 9, safeSpeed: 4.0 })
})

test('each finished run appends exactly one record and advances sequentially', () => {
  let session = createDifficultySession()
  session = appendDifficultyRecord(session, {
    success: false,
    landingSpeed: 5.2,
    landingAngle: 2.1,
    positionPass: true,
    fuelLeft: 44,
    failureReason: 'EXCESSIVE DESCENT SPEED',
    recoveryQuality: 0,
    elapsedSeconds: 24.6,
  })

  assert.equal(session.currentRun, 1)
  assert.equal(session.records.length, 1)
  assert.equal(session.records[0].run, 1)
  assert.equal(session.records[0].group, 'BEFORE')
  assert.equal(session.records[0].scenarioIndex, 0)
  assert.equal(session.records[0].safeSpeed, 3.5)
  assert.equal(session.completed, false)

  // Calling with a stale/corrupt session must not duplicate an already-recorded run.
  const stale = { ...session, currentRun: 0 }
  const unchanged = appendDifficultyRecord(stale, {
    success: true,
    landingSpeed: 3.0,
    landingAngle: 0,
    positionPass: true,
    fuelLeft: 20,
    failureReason: '',
    recoveryQuality: 90,
    elapsedSeconds: 25,
  })
  assert.equal(unchanged.records.length, 1)
})

test('the twentieth record marks the session complete', () => {
  let session = createDifficultySession()
  for (let index = 0; index < 20; index += 1) {
    session = appendDifficultyRecord(session, {
      success: index % 2 === 0,
      landingSpeed: 3.7,
      landingAngle: 1.2,
      positionPass: true,
      fuelLeft: 30,
      failureReason: index % 2 === 0 ? '' : 'EXCESSIVE DESCENT SPEED',
      recoveryQuality: index % 2 === 0 ? 90 : 0,
      elapsedSeconds: 24,
    })
  }

  assert.equal(session.currentRun, 20)
  assert.equal(session.records.length, 20)
  assert.equal(session.completed, true)
})

test('difficulty session survives reload and malformed storage falls back safely', () => {
  const storage = memoryStorage()
  let session = createDifficultySession()
  session = appendDifficultyRecord(session, {
    success: true,
    landingSpeed: 3.2,
    landingAngle: 0.5,
    positionPass: true,
    fuelLeft: 34,
    failureReason: '',
    recoveryQuality: 91,
    elapsedSeconds: 23.8,
  })
  saveDifficultySession(storage, session)
  assert.deepEqual(loadDifficultySession(storage), session)

  const broken = memoryStorage({ 'recovery-game:difficulty-test:v1': '{broken' })
  const fallback = loadDifficultySession(broken)
  assert.equal(fallback.active, false)
  assert.equal(fallback.currentRun, 0)
  assert.deepEqual(fallback.records, [])
})

test('completed 20-run session exports a CSV with one header and twenty records', () => {
  let session = createDifficultySession()
  for (let index = 0; index < 20; index += 1) {
    session = appendDifficultyRecord(session, {
      success: true,
      landingSpeed: 3.5,
      landingAngle: 0.7,
      positionPass: true,
      fuelLeft: 28,
      failureReason: '',
      recoveryQuality: 92,
      elapsedSeconds: 24.2,
    })
  }

  const csv = buildDifficultyCsv(session)
  const lines = csv.trim().split('\n')
  assert.equal(lines.length, 21)
  assert.match(lines[0], /회차,그룹,시나리오,안전속도,결과/)
  assert.match(lines[1], /^1,BEFORE,1,3\.5,SUCCESS/)
  assert.match(lines[11], /^11,AFTER,1,4\.0,SUCCESS/)
  assert.match(lines[20], /^20,AFTER,10,4\.0,SUCCESS/)
})
