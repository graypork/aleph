import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateRecovery, predictLandingX } from '../src/game/recovery.js'

const context = {
  pad: { centerX: 600, width: 180 },
  safeLandingSpeed: 3,
  groundY: 620,
  minDescentSpeed: 1.6,
}

test('predicted landing point follows horizontal velocity direction', () => {
  const base = { x: 600, y: 200, vx: 0, vy: 5, wind: 0 }
  const left = predictLandingX({ ...base, vx: -2 }, context)
  const right = predictLandingX({ ...base, vx: 2 }, context)
  assert.ok(left < 600)
  assert.ok(right > 600)
})

test('recovery chance rewards safer position, descent, angle, and fuel', () => {
  const good = calculateRecovery(
    { x: 600, y: 420, vx: 0, vy: 2.7, angle: 2, fuel: 55, wind: 0 },
    context,
  )
  const bad = calculateRecovery(
    { x: 760, y: 420, vx: 2.5, vy: 6.5, angle: 20, fuel: 4, wind: 1 },
    context,
  )
  assert.ok(good.chance > bad.chance)
  assert.equal(good.status.angle, 'SAFE')
  assert.equal(bad.status.angle, 'CRITICAL')
})

test('airborne recovery chance is capped at 99 percent', () => {
  const result = calculateRecovery(
    { x: 600, y: 610, vx: 0, vy: 1.6, angle: 0, fuel: 100, wind: 0 },
    context,
  )
  assert.ok(result.chance <= 99)
})

test('predicted landing point matches a no-input physics simulation', async () => {
  const { createPhysicsState, stepPhysics, DEFAULT_PHYSICS_CONFIG } = await import('../src/game/physics.js')
  let state = createPhysicsState({
    mass: 42,
    entrySpeed: 7.2,
    x: 540,
    y: 180,
    angle: 18,
    vx: 3,
    wind: 0.7,
    fuel: 62,
  })

  const predicted = predictLandingX(state, {
    ...context,
    groundY: DEFAULT_PHYSICS_CONFIG.groundY,
    physicsConfig: DEFAULT_PHYSICS_CONFIG,
  })

  let simulated = { ...state }
  let elapsed = 0
  while (simulated.y < DEFAULT_PHYSICS_CONFIG.groundY && elapsed < 30) {
    simulated = stepPhysics(simulated, { left: false, right: false, burn: false }, 1 / 60)
    elapsed += 1 / 60
  }

  assert.ok(Math.abs(predicted - simulated.x) < 1.5, `predicted=${predicted.toFixed(2)}, simulated=${simulated.x.toFixed(2)}`)
})
