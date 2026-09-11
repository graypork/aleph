import { DEFAULT_PHYSICS_CONFIG, stepPhysics } from './physics.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function predictLandingX(state, context) {
  const config = {
    ...DEFAULT_PHYSICS_CONFIG,
    ...(context.physicsConfig ?? {}),
    groundY: context.groundY ?? DEFAULT_PHYSICS_CONFIG.groundY,
  }

  let simulated = {
    mass: Number.isFinite(state.mass) ? state.mass : config.massReference,
    entrySpeed: Number.isFinite(state.entrySpeed) ? state.entrySpeed : Math.max(0, (state.vy ?? 0) / 3),
    x: state.x,
    y: state.y,
    vx: Number.isFinite(state.vx) ? state.vx : 0,
    vy: Number.isFinite(state.vy) ? state.vy : config.minDescentSpeed,
    angle: Number.isFinite(state.angle) ? state.angle : 0,
    fuel: Number.isFinite(state.fuel) ? state.fuel : 0,
    wind: Number.isFinite(state.wind) ? state.wind : 0,
  }

  const noInput = { left: false, right: false, burn: false }
  let elapsed = 0
  const dt = 1 / 60

  while (simulated.y < config.groundY && elapsed < 30) {
    simulated = stepPhysics(simulated, noInput, dt, config)
    elapsed += dt
  }

  return simulated.x
}

const statusFromScore = (score, good = 'GOOD') => {
  if (score >= 0.72) return good
  if (score >= 0.4) return 'WARNING'
  return 'DANGER'
}

export function calculateRecovery(state, context) {
  const predictedX = predictLandingX(state, context)
  const halfPad = context.pad.width / 2
  const distance = Math.abs(predictedX - context.pad.centerX)
  const positionScore = clamp(1 - distance / (halfPad * 2.4), 0, 1)

  const speedRatio = state.vy / context.safeLandingSpeed
  const descentScore = clamp(1.45 - speedRatio * 0.55, 0, 1)
  const angleScore = clamp(1 - Math.abs(state.angle) / 22, 0, 1)

  const remainingY = Math.max(1, context.groundY - state.y)
  const urgency = clamp(1 - remainingY / context.groundY, 0, 1)
  const desiredFuel = 18 + (1 - urgency) * 22 + Math.max(0, speedRatio - 1) * 12
  const fuelScore = clamp(state.fuel / desiredFuel, 0, 1)

  const raw = positionScore * 0.4 + descentScore * 0.3 + angleScore * 0.2 + fuelScore * 0.1
  const chance = Math.min(99, Math.max(0, Math.round(raw * 100)))

  let descentStatus = 'SAFE'
  if (state.vy > context.safeLandingSpeed * 1.65) descentStatus = 'CRITICAL'
  else if (state.vy > context.safeLandingSpeed) descentStatus = 'WARNING'

  let angleStatus = 'SAFE'
  if (Math.abs(state.angle) > 12) angleStatus = 'CRITICAL'
  else if (Math.abs(state.angle) > 5) angleStatus = 'WARNING'

  let fuelStatus = 'GOOD'
  if (fuelScore < 0.35) fuelStatus = 'CRITICAL'
  else if (fuelScore < 0.7) fuelStatus = 'LOW'

  return {
    chance,
    predictedX,
    components: { positionScore, descentScore, angleScore, fuelScore },
    status: {
      position: statusFromScore(positionScore),
      descent: descentStatus,
      angle: angleStatus,
      fuel: fuelStatus,
    },
  }
}
