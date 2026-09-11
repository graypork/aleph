export const DEFAULT_PHYSICS_CONFIG = Object.freeze({
  gravity: 0.82,
  thrustAcceleration: 5.5,
  tiltSteeringAcceleration: 60.0,
  burnRate: 12,
  tiltSpeed: 72,
  autoReturnSpeed: 58,
  maxTilt: 22,
  minDescentSpeed: 1.6,
  massReference: 40,
  worldWidth: 1200,
  groundY: 330,
  rocketHalfWidth: 16,
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const moveToward = (value, target, amount) => {
  if (value < target) return Math.min(target, value + amount)
  if (value > target) return Math.max(target, value - amount)
  return value
}

export function createPhysicsState({
  mass,
  entrySpeed,
  x,
  y = 70,
  angle = 0,
  fuel = 100,
  vx = 0,
  wind = 0,
}) {
  return {
    mass,
    entrySpeed,
    x,
    y,
    vx,
    vy: Math.max(0, entrySpeed * 3),
    angle,
    fuel,
    wind,
  }
}

export function stepPhysics(state, input, dt, config = DEFAULT_PHYSICS_CONFIG) {
  const safeDt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05)
  const next = { ...state }

  let targetAngle = 0
  if (input.left && !input.right) targetAngle = -config.maxTilt
  if (input.right && !input.left) targetAngle = config.maxTilt

  const angularSpeed = targetAngle === 0 ? config.autoReturnSpeed : config.tiltSpeed
  next.angle = moveToward(next.angle, targetAngle, angularSpeed * safeDt)
  next.angle = clamp(next.angle, -config.maxTilt, config.maxTilt)

  const canBurn = Boolean(input.burn) && next.fuel > 0
  const burnSeconds = canBurn ? Math.min(safeDt, next.fuel / config.burnRate) : 0
  next.fuel = clamp(next.fuel - config.burnRate * burnSeconds, 0, 100)

  const radians = (next.angle * Math.PI) / 180
  const massFactor = config.massReference / next.mass
  const thrust = burnSeconds > 0 ? config.thrustAcceleration * massFactor : 0
  const verticalThrust = thrust * Math.cos(radians)
  const horizontalThrust = thrust * Math.sin(radians)
  // Tilting changes the aerodynamic trajectory even when the landing burn is off.
  // The burn adds stronger correction on top of this steering force.
  const tiltSteering = config.tiltSteeringAcceleration * Math.sin(radians) * massFactor

  next.vx += (next.wind + tiltSteering + horizontalThrust) * safeDt
  next.vy += (config.gravity - verticalThrust) * safeDt
  next.vy = Math.max(config.minDescentSpeed, next.vy)

  next.x += next.vx * safeDt
  next.y += next.vy * safeDt

  const edge = config.rocketHalfWidth
  next.x = clamp(next.x, edge, config.worldWidth - edge)

  return next
}

export function evaluateLanding(state, pad, safeLandingSpeed) {
  const halfPad = pad.width / 2
  const insidePad = state.x >= pad.centerX - halfPad && state.x <= pad.centerX + halfPad
  const safeSpeed = state.vy <= safeLandingSpeed
  const safeAngle = Math.abs(state.angle) <= 5

  const failures = []
  if (!insidePad) failures.push('OUTSIDE LANDING ZONE')
  if (!safeSpeed) failures.push('EXCESSIVE DESCENT SPEED')
  if (!safeAngle) failures.push('UNSAFE LANDING ANGLE')

  return {
    success: insidePad && safeSpeed && safeAngle,
    insidePad,
    safeSpeed,
    safeAngle,
    failures,
  }
}
