const STORAGE_KEY = 'recovery-game:difficulty-test:v1'

export const TOTAL_DIFFICULTY_RUNS = 20

const EMPTY_SESSION = Object.freeze({
  active: false,
  completed: false,
  currentRun: 0,
  records: [],
})

function cloneSession(value) {
  return {
    active: Boolean(value.active),
    completed: Boolean(value.completed),
    currentRun: value.currentRun,
    records: value.records.map((record) => ({ ...record })),
  }
}

function validRecord(record, expectedIndex) {
  if (!record || typeof record !== 'object') return false
  const config = getDifficultyRunConfig(null, expectedIndex)
  return record.run === config.run &&
    record.group === config.group &&
    record.scenarioIndex === config.scenarioIndex &&
    record.safeSpeed === config.safeSpeed &&
    typeof record.success === 'boolean' &&
    Number.isFinite(record.landingSpeed) &&
    Number.isFinite(record.landingAngle) &&
    typeof record.positionPass === 'boolean' &&
    Number.isFinite(record.fuelLeft) &&
    typeof record.failureReason === 'string' &&
    Number.isFinite(record.recoveryQuality) &&
    Number.isFinite(record.elapsedSeconds)
}

function validSession(value) {
  if (!value || typeof value !== 'object') return false
  if (typeof value.active !== 'boolean' || typeof value.completed !== 'boolean') return false
  if (!Number.isInteger(value.currentRun) || value.currentRun < 0 || value.currentRun > TOTAL_DIFFICULTY_RUNS) return false
  if (!Array.isArray(value.records) || value.records.length !== value.currentRun) return false
  if (value.completed !== (value.currentRun === TOTAL_DIFFICULTY_RUNS)) return false
  return value.records.every((record, index) => validRecord(record, index))
}

export function createDifficultySession() {
  return {
    active: true,
    completed: false,
    currentRun: 0,
    records: [],
  }
}

export function getDifficultyRunConfig(_session, runIndex) {
  const index = Number.isInteger(runIndex) ? runIndex : _session?.currentRun
  if (!Number.isInteger(index) || index < 0 || index >= TOTAL_DIFFICULTY_RUNS) return null
  const after = index >= 10
  return {
    run: index + 1,
    group: after ? 'AFTER' : 'BEFORE',
    scenarioIndex: index % 10,
    safeSpeed: after ? 4.0 : 3.5,
  }
}

export function appendDifficultyRecord(session, result) {
  if (session && typeof session === 'object' && Array.isArray(session.records) && session.currentRun !== session.records.length) {
    const sequentialRecords = session.records.length <= TOTAL_DIFFICULTY_RUNS &&
      session.records.every((record, index) => validRecord(record, index))
    if (sequentialRecords) {
      return {
        active: Boolean(session.active),
        completed: session.records.length === TOTAL_DIFFICULTY_RUNS,
        currentRun: session.records.length,
        records: session.records.map((record) => ({ ...record })),
      }
    }
  }
  if (!validSession(session) || !session.active || session.completed) return validSession(session) ? cloneSession(session) : { ...EMPTY_SESSION, records: [] }

  const config = getDifficultyRunConfig(session)
  if (!config) return cloneSession(session)

  const record = {
    ...config,
    success: Boolean(result.success),
    landingSpeed: Number(result.landingSpeed.toFixed(2)),
    landingAngle: Number(result.landingAngle.toFixed(1)),
    positionPass: Boolean(result.positionPass),
    fuelLeft: Math.round(result.fuelLeft),
    failureReason: String(result.failureReason || ''),
    recoveryQuality: Math.round(result.recoveryQuality || 0),
    elapsedSeconds: Number(result.elapsedSeconds.toFixed(2)),
  }
  const nextRun = session.currentRun + 1
  return {
    active: true,
    completed: nextRun === TOTAL_DIFFICULTY_RUNS,
    currentRun: nextRun,
    records: [...session.records, record],
  }
}

export function loadDifficultySession(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_SESSION, records: [] }
    const parsed = JSON.parse(raw)
    return validSession(parsed) ? cloneSession(parsed) : { ...EMPTY_SESSION, records: [] }
  } catch {
    return { ...EMPTY_SESSION, records: [] }
  }
}

export function saveDifficultySession(storage = globalThis.localStorage, session) {
  const safe = validSession(session) ? session : EMPTY_SESSION
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(safe))
  } catch {
    // Storage can be unavailable; the current page session can still continue.
  }
  return cloneSession(safe)
}

export function clearDifficultySession(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // Ignore unavailable storage.
  }
  return { ...EMPTY_SESSION, records: [] }
}

function csvCell(value) {
  const text = String(value ?? '')
  if (!/[",\n]/.test(text)) return text
  return `"${text.replaceAll('"', '""')}"`
}

export function buildDifficultyCsv(session) {
  if (!validSession(session) || !session.completed || session.records.length !== TOTAL_DIFFICULTY_RUNS) return ''
  const header = [
    '회차', '그룹', '시나리오', '안전속도', '결과', '착륙하강속도', '착륙각도',
    '위치판정', '남은연료', '실패원인', '회수품질', '플레이시간초',
  ]
  const rows = session.records.map((record) => [
    record.run,
    record.group,
    record.scenarioIndex + 1,
    record.safeSpeed.toFixed(1),
    record.success ? 'SUCCESS' : 'FAIL',
    record.landingSpeed.toFixed(2),
    record.landingAngle.toFixed(1),
    record.positionPass ? 'PASS' : 'FAIL',
    `${record.fuelLeft}%`,
    record.failureReason,
    record.recoveryQuality,
    record.elapsedSeconds.toFixed(2),
  ].map(csvCell).join(','))
  return [header.join(','), ...rows].join('\n')
}
