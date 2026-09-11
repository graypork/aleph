import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FIXED_TEST_SCENARIOS,
  NORMAL_WIND_MAX,
  NORMAL_WIND_MIN,
  UPPER_INITIAL_WIND_MAX,
  UPPER_INITIAL_WIND_MIN,
  UPPER_WEAK_WIND_MAX,
  UPPER_WEAK_WIND_MIN,
  UPPER_FINAL_WIND_MAX,
  UPPER_FINAL_WIND_MIN,
  UPPER_LATE_WIND_MAX,
  UPPER_LATE_WIND_MIN,
  UPPER_WIND_END_Y,
  createRandomScenario,
  createWindSchedule,
  getTestScenario,
} from '../src/game/scenario.js'

const sequenceRandom = (values) => {
  let index = 0
  return () => values[index++ % values.length]
}


test('normal random wind maximum is tuned to 1.45', () => {
  assert.equal(NORMAL_WIND_MAX, 1.45)
})

test('normal random wind never becomes almost calm', () => {
  assert.equal(NORMAL_WIND_MIN, 0.45)

  const random = sequenceRandom([0, 0.1, 0.24, 0.49, 0.5, 0.74, 0.9, 0.99])
  for (let i = 0; i < 40; i += 1) {
    const scenario = createRandomScenario(random)
    assert.ok(Math.abs(scenario.initialWind) >= UPPER_INITIAL_WIND_MIN)
    assert.ok(Math.abs(scenario.initialWind) <= UPPER_INITIAL_WIND_MAX)

    for (const event of scenario.windSchedule) {
      assert.ok(Math.abs(event.wind) >= NORMAL_WIND_MIN)
      assert.ok(Math.abs(event.wind) <= NORMAL_WIND_MAX)
    }
  }
})

test('random scenario stays inside declared recoverable bounds', () => {
  const random = sequenceRandom([0, 0.25, 0.5, 0.75, 0.99])
  for (let i = 0; i < 20; i += 1) {
    const scenario = createRandomScenario(random)
    assert.ok(scenario.mass >= 36 && scenario.mass <= 48)
    assert.ok(scenario.entrySpeed >= 6.0 && scenario.entrySpeed <= 8.2)
    assert.ok(scenario.startX >= 420 && scenario.startX <= 780)
    assert.ok(Math.abs(scenario.initialWind) <= UPPER_INITIAL_WIND_MAX)
  }
})

test('wind schedule changes every 3 to 6 seconds and stops before 30 seconds', () => {
  const schedule = createWindSchedule(() => 0.5)
  assert.ok(schedule.length >= 4)
  let previous = 0
  for (const event of schedule) {
    const gap = event.at - previous
    assert.ok(gap >= 3 && gap <= 6)
    assert.ok(event.at < 30)
    assert.ok(Math.abs(event.wind) <= 1.45)
    previous = event.at
  }
})

test('ten fixed test scenarios are stable and cloned on access', () => {
  assert.equal(FIXED_TEST_SCENARIOS.length, 10)
  const first = getTestScenario(0)
  const again = getTestScenario(0)
  assert.deepEqual(first, again)
  first.mass = 999
  assert.notEqual(getTestScenario(0).mass, 999)
})


test('normal play changes wind exactly three times inside the upper half before lower-wind logic takes over', () => {
  const random = sequenceRandom([0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9])
  const scenario = createRandomScenario(random)

  assert.equal(UPPER_INITIAL_WIND_MIN, 1.20)
  assert.equal(UPPER_INITIAL_WIND_MAX, 1.40)
  assert.equal(UPPER_WEAK_WIND_MIN, 0.45)
  assert.equal(UPPER_WEAK_WIND_MAX, 0.60)
  assert.equal(UPPER_FINAL_WIND_MIN, 1.50)
  assert.equal(UPPER_FINAL_WIND_MAX, 1.70)
  assert.equal(UPPER_LATE_WIND_MIN, 0.50)
  assert.equal(UPPER_LATE_WIND_MAX, 0.75)
  assert.equal(UPPER_WIND_END_Y, 200)

  assert.equal(scenario.upperWindSchedule.length, 3)
  const [weakShift, finalShift, lateShift] = scenario.upperWindSchedule
  const initialMagnitude = Math.abs(scenario.initialWind)
  const weakMagnitude = Math.abs(weakShift.wind)
  const finalMagnitude = Math.abs(finalShift.wind)
  const lateMagnitude = Math.abs(lateShift.wind)

  assert.ok(initialMagnitude >= UPPER_INITIAL_WIND_MIN && initialMagnitude <= UPPER_INITIAL_WIND_MAX)
  assert.ok(weakMagnitude >= UPPER_WEAK_WIND_MIN && weakMagnitude <= UPPER_WEAK_WIND_MAX)
  assert.ok(finalMagnitude >= UPPER_FINAL_WIND_MIN && finalMagnitude <= UPPER_FINAL_WIND_MAX)
  assert.ok(lateMagnitude >= UPPER_LATE_WIND_MIN && lateMagnitude <= UPPER_LATE_WIND_MAX)

  assert.ok(initialMagnitude - weakMagnitude >= 0.60)
  assert.ok(finalMagnitude - weakMagnitude >= 0.90)
  assert.ok(finalMagnitude - lateMagnitude >= 0.75)

  assert.ok(weakShift.y > 70 && weakShift.y < finalShift.y)
  assert.ok(finalShift.y < lateShift.y)
  assert.ok(lateShift.y < UPPER_WIND_END_Y)
  assert.ok(Math.abs(scenario.lowerInitialWind) >= NORMAL_WIND_MIN)
  assert.ok(Math.abs(scenario.lowerInitialWind) <= NORMAL_WIND_MAX)
})

test('fixed difficulty-test scenarios remain unchanged and do not use upper-half wind overrides', () => {
  const scenario = getTestScenario(0)
  assert.equal('upperWindSchedule' in scenario, false)
  assert.equal('lowerInitialWind' in scenario, false)
  assert.deepEqual(scenario.windSchedule, FIXED_TEST_SCENARIOS[0].windSchedule)
})
