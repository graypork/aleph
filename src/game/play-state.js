export function createRunState(scenario) {
  return {
    gameState: 'READY',
    elapsed: 0,
    timeRemaining: 30,
    mass: scenario.mass,
    entrySpeed: scenario.entrySpeed,
    x: scenario.startX,
    y: 70,
    vx: 0,
    vy: scenario.entrySpeed * 3,
    angle: 0,
    fuel: 100,
    wind: scenario.initialWind,
    windSchedule: scenario.windSchedule.map((event) => ({ ...event })),
    nextWindIndex: 0,
    recoveryChance: 0,
  }
}

export function nudgeAngle(angle, key, maxTilt = 22, step = 0.5) {
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return angle
  const delta = key === 'ArrowRight' ? step : -step
  return Math.max(-maxTilt, Math.min(maxTilt, angle + delta))
}
