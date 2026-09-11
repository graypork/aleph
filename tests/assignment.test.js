import test from 'node:test'
import assert from 'node:assert/strict'
import { createRunState, nudgeAngle } from '../src/game/play-state.js'

test('ten discrete right input events produce exactly ten angle nudges', () => {
  let angle = 0
  for (let i = 0; i < 10; i += 1) angle = nudgeAngle(angle, 'ArrowRight')
  assert.equal(angle, 5)
})

test('discrete tilt nudges respect the same ±22 degree game limit', () => {
  let angle = 21.8
  angle = nudgeAngle(angle, 'ArrowRight')
  assert.equal(angle, 22)
  angle = -21.8
  angle = nudgeAngle(angle, 'ArrowLeft')
  assert.equal(angle, -22)
})

test('new run state resets current run values without embedding persistent stats', () => {
  const scenario = {
    mass: 42,
    entrySpeed: 7,
    startX: 650,
    initialWind: -0.5,
    windSchedule: [],
  }
  const state = createRunState(scenario)
  assert.equal(state.fuel, 100)
  assert.equal(state.angle, 0)
  assert.equal(state.gameState, 'READY')
  assert.equal('bestRecoveryQuality' in state, false)
})

import { readFileSync } from 'node:fs'

const playSource = readFileSync(new URL('../src/game/play.js', import.meta.url), 'utf8')

test('default safe landing speed is 3.5', () => {
  assert.match(playSource, /:\s*3\.5\b/)
})

test('safe landing speed query accepts 5.0', () => {
  assert.match(playSource, /parsedSafeSpeed\s*<=\s*5\b/)
})
