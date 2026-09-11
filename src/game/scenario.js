const range = (random, min, max) => min + (max - min) * random()
const rounded = (value, digits = 2) => Number(value.toFixed(digits))

export const NORMAL_WIND_MIN = 0.45
export const NORMAL_WIND_MAX = 1.45
export const UPPER_WIND_MIN = 0.60
export const UPPER_WIND_MAX = 1.65
export const UPPER_WIND_END_Y = 200

const randomWindInRange = (random, min, max) => {
  const unit = random()
  const positive = unit >= 0.5
  const magnitudeUnit = positive ? (unit - 0.5) * 2 : unit * 2
  const magnitude = range(() => magnitudeUnit, min, max)
  return rounded(positive ? magnitude : -magnitude, 2)
}

const randomWind = (random) => randomWindInRange(random, NORMAL_WIND_MIN, NORMAL_WIND_MAX)
const randomUpperWind = (random) => randomWindInRange(random, UPPER_WIND_MIN, UPPER_WIND_MAX)

export function createWindSchedule(random = Math.random) {
  const events = []
  let at = 0
  while (true) {
    at += range(random, 3, 6)
    if (at >= 29.2) break
    events.push({
      at: rounded(at, 2),
      wind: randomWind(random),
    })
  }
  return events
}

export function createRandomScenario(random = Math.random) {
  return {
    mass: rounded(range(random, 36, 48), 1),
    entrySpeed: rounded(range(random, 6, 8.2), 2),
    startX: rounded(range(random, 420, 780), 1),
    initialWind: randomUpperWind(random),
    upperWindSchedule: [
      { y: rounded(range(random, 105, 125), 1), wind: randomUpperWind(random) },
      { y: rounded(range(random, 150, 175), 1), wind: randomUpperWind(random) },
    ],
    lowerInitialWind: randomWind(random),
    windSchedule: createWindSchedule(random),
  }
}

const fixed = [
  [38.0, 6.20, 505, -0.55, [[4.2, 0.65], [8.8, -0.35], [13.1, 0.8], [18.5, -0.7], [23.2, 0.3], [27.0, -0.15]]],
  [44.0, 7.10, 690, 0.40, [[3.5, -0.8], [7.6, 0.45], [12.9, -0.25], [17.3, 0.9], [21.2, -0.6], [25.7, 0.2]]],
  [41.0, 7.75, 545, -0.25, [[5.0, 0.75], [9.4, -0.55], [14.1, 0.35], [18.0, -0.9], [22.4, 0.55], [26.8, -0.2]]],
  [47.0, 6.65, 735, 0.65, [[4.4, -0.45], [8.1, 0.25], [12.0, -0.85], [16.8, 0.65], [21.4, -0.3], [25.4, 0.4]]],
  [36.5, 8.05, 465, -0.70, [[3.9, 0.55], [7.2, -0.25], [11.6, 0.95], [16.1, -0.45], [20.0, 0.35], [24.8, -0.65]]],
  [42.5, 6.90, 625, 0.15, [[4.7, -0.65], [9.0, 0.45], [13.4, -0.15], [17.9, 0.75], [22.0, -0.55], [26.4, 0.25]]],
  [45.5, 7.45, 570, -0.45, [[3.3, 0.35], [7.9, -0.75], [12.6, 0.6], [17.1, -0.35], [21.8, 0.85], [26.0, -0.1]]],
  [39.0, 7.90, 710, 0.55, [[4.1, -0.6], [8.6, 0.2], [12.4, -0.95], [16.6, 0.5], [20.9, -0.25], [25.2, 0.7]]],
  [46.0, 6.35, 490, -0.20, [[5.2, 0.5], [9.7, -0.4], [14.0, 0.7], [18.6, -0.55], [23.0, 0.25], [27.2, -0.3]]],
  [40.0, 7.30, 655, 0.30, [[3.8, -0.7], [8.0, 0.55], [12.8, -0.2], [17.5, 0.8], [21.7, -0.45], [25.9, 0.15]]],
]

export const FIXED_TEST_SCENARIOS = Object.freeze(
  fixed.map(([mass, entrySpeed, startX, initialWind, events]) =>
    Object.freeze({
      mass,
      entrySpeed,
      startX,
      initialWind,
      windSchedule: Object.freeze(events.map(([at, wind]) => Object.freeze({ at, wind }))),
    }),
  ),
)

export function getTestScenario(index) {
  const source = FIXED_TEST_SCENARIOS[((index % FIXED_TEST_SCENARIOS.length) + FIXED_TEST_SCENARIOS.length) % FIXED_TEST_SCENARIOS.length]
  return {
    ...source,
    windSchedule: source.windSchedule.map((event) => ({ ...event })),
  }
}
