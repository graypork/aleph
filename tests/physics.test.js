import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PHYSICS_CONFIG,
  createPhysicsState,
  stepPhysics,
  evaluateLanding,
} from '../src/game/physics.js'

test('horizontal input never tilts beyond ±22 degrees', () => {
  let state = createPhysicsState({ mass: 40, entrySpeed: 7, x: 600, y: 80 })
  for (let i = 0; i < 120; i += 1) {
    state = stepPhysics(state, { left: false, right: true, burn: false }, 1 / 60)
  }
  assert.ok(state.angle <= 22)
  assert.ok(state.angle >= 21.5)
})

test('releasing horizontal input returns angle toward vertical', () => {
  let state = createPhysicsState({ mass: 40, entrySpeed: 7, x: 600, y: 80, angle: 18 })
  state = stepPhysics(state, { left: false, right: false, burn: false }, 0.5)
  assert.ok(Math.abs(state.angle) < 18)
})

test('tilting right changes horizontal trajectory even without landing burn', () => {
  let state = createPhysicsState({ mass: 40, entrySpeed: 7, x: 600, y: 80, wind: 0 })
  const startX = state.x

  for (let i = 0; i < 90; i += 1) {
    state = stepPhysics(state, { left: false, right: true, burn: false }, 1 / 60)
  }

  assert.ok(state.vx > 0, `expected positive horizontal velocity, got ${state.vx}`)
  assert.ok(state.x > startX, `expected x to increase from ${startX}, got ${state.x}`)
})

test('landing burn consumes fuel but cannot stop or reverse descent', () => {
  let state = createPhysicsState({ mass: 36, entrySpeed: 6, x: 600, y: 80, fuel: 100 })
  for (let i = 0; i < 600; i += 1) {
    state = stepPhysics(state, { left: false, right: false, burn: true }, 1 / 60)
  }
  assert.ok(state.fuel < 100)
  assert.ok(state.vy >= DEFAULT_PHYSICS_CONFIG.minDescentSpeed)
})

test('heavier booster receives less horizontal correction from the same tilted burn', () => {
  const lightStart = createPhysicsState({ mass: 36, entrySpeed: 7, x: 600, y: 80, angle: 20 })
  const heavyStart = createPhysicsState({ mass: 48, entrySpeed: 7, x: 600, y: 80, angle: 20 })
  const light = stepPhysics(lightStart, { left: false, right: true, burn: true }, 1)
  const heavy = stepPhysics(heavyStart, { left: false, right: true, burn: true }, 1)
  assert.ok(Math.abs(light.vx) > Math.abs(heavy.vx))
})

test('landing succeeds only when position, descent speed, and angle all pass', () => {
  const pad = { centerX: 600, width: 180 }
  const safe = { x: 600, vy: 2.9, angle: 4 }
  const fast = { x: 600, vy: 3.2, angle: 4 }
  const tilted = { x: 600, vy: 2.9, angle: 6 }
  const outside = { x: 730, vy: 2.9, angle: 0 }

  assert.equal(evaluateLanding(safe, pad, 3.0).success, true)
  assert.equal(evaluateLanding(fast, pad, 3.0).success, false)
  assert.equal(evaluateLanding(tilted, pad, 3.0).success, false)
  assert.equal(evaluateLanding(outside, pad, 3.0).success, false)
})

test('a maximum-braking descent still reaches the ground within 30 seconds', async () => {
  const { FIXED_TEST_SCENARIOS } = await import('../src/game/scenario.js')
  for (const scenario of FIXED_TEST_SCENARIOS) {
    let state = createPhysicsState({
      mass: scenario.mass,
      entrySpeed: scenario.entrySpeed,
      x: scenario.startX,
      y: 70,
      fuel: 100,
      wind: scenario.initialWind,
    })
    let elapsed = 0
    let windIndex = 0
    while (elapsed < 30 && state.y < DEFAULT_PHYSICS_CONFIG.groundY) {
      while (windIndex < scenario.windSchedule.length && elapsed >= scenario.windSchedule[windIndex].at) {
        state.wind = scenario.windSchedule[windIndex].wind
        windIndex += 1
      }
      state = stepPhysics(state, { left: false, right: false, burn: true }, 1 / 60)
      elapsed += 1 / 60
    }
    assert.ok(state.y >= DEFAULT_PHYSICS_CONFIG.groundY, `scenario did not land: mass=${scenario.mass}, entry=${scenario.entrySpeed}`)
    assert.ok(elapsed <= 30)
  }
})

test('holding right produces clearly visible horizontal travel within two seconds', () => {
  let state = createPhysicsState({ mass: 40, entrySpeed: 7, x: 600, y: 80, wind: 0 })
  const startX = state.x

  for (let i = 0; i < 120; i += 1) {
    state = stepPhysics(state, { left: false, right: true, burn: false }, 1 / 60)
  }

  assert.ok(state.x >= startX + 30, `expected at least 30 logical px travel, got ${(state.x - startX).toFixed(2)}`)
})
