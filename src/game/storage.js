const STORAGE_KEY = 'recovery-game:v1'

export const DEFAULT_PERSISTENT_STATE = Object.freeze({
  bestRecoveryQuality: 0,
  successfulRecoveries: 0,
  reducedMotion: false,
})

const isValid = (value) =>
  value &&
  typeof value === 'object' &&
  Number.isFinite(value.bestRecoveryQuality) &&
  value.bestRecoveryQuality >= 0 &&
  value.bestRecoveryQuality <= 100 &&
  Number.isInteger(value.successfulRecoveries) &&
  value.successfulRecoveries >= 0 &&
  typeof value.reducedMotion === 'boolean'

export function loadPersistent(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PERSISTENT_STATE }
    const parsed = JSON.parse(raw)
    return isValid(parsed) ? { ...parsed } : { ...DEFAULT_PERSISTENT_STATE }
  } catch {
    return { ...DEFAULT_PERSISTENT_STATE }
  }
}

export function savePersistent(storage = globalThis.localStorage, value) {
  const safe = isValid(value) ? value : DEFAULT_PERSISTENT_STATE
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(safe))
  } catch {
    // Storage may be unavailable in privacy modes; gameplay must continue.
  }
  return { ...safe }
}
