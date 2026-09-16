import { comparisonFor, upsertDailyRow, validateNormalizedReading } from './model.js'

export const ERROR_CODES = Object.freeze(['timeout', 'auth', 'rate_limit', 'offline', 'schema_error'])

export function createReplayState() {
  return {
    schema_version: 'aleph-t04-evaluation-state-v1',
    daily_readings: [],
    current_reading: null,
    status: null,
    last_comparison: { state: 'insufficient', signed: null, direction: null, magnitude: null, unit: null },
    last_run: null,
    sequence: 0,
  }
}

function clone(value) {
  return structuredClone(value)
}

function applySuccess(input, reading, meta) {
  validateNormalizedReading(reading)
  const state = clone(input)
  const result = upsertDailyRow(state.daily_readings, reading)
  state.daily_readings = result.rows
  state.current_reading = clone(reading)
  state.status = { freshness: 'fresh', error_code: 'none' }
  state.last_comparison = comparisonFor(state.daily_readings, result.row)
  state.sequence += 1
  state.last_run = { ...meta, outcome: 'success', error_code: 'none' }
  return state
}

function applyError(input, errorCode, meta) {
  const state = clone(input)
  state.status = { freshness: 'stale', error_code: errorCode }
  state.sequence += 1
  state.last_run = { ...meta, outcome: 'error', error_code: errorCode }
  return state
}

export function runFixture(inputState, fixture) {
  const meta = {
    fixture_id: fixture.fixture_id,
    virtual_now: fixture.virtual_now,
    retry_after_seconds: fixture.transport?.headers?.['retry-after'] ? Number(fixture.transport.headers['retry-after']) : null,
  }
  if (fixture.transport?.mode === 'timeout') return applyError(inputState, 'timeout', meta)
  if (fixture.transport?.mode === 'offline') return applyError(inputState, 'offline', meta)
  if (fixture.transport?.status === 401 || fixture.transport?.status === 403) return applyError(inputState, 'auth', meta)
  if (fixture.transport?.status === 429) return applyError(inputState, 'rate_limit', meta)
  if (fixture.transport?.status >= 200 && fixture.transport?.status < 300) {
    try {
      return applySuccess(inputState, fixture.payload, meta)
    } catch {
      return applyError(inputState, 'schema_error', meta)
    }
  }
  return applyError(inputState, 'schema_error', meta)
}
