import { createReplayState, runFixture } from './replay.js'

export const FAILURE_BATCH_ORDER = Object.freeze([
  { key: 'timeout', label: '느린 응답' },
  { key: 'auth', label: '외부 401' },
  { key: 'rate_limit', label: '호출 제한' },
  { key: 'offline', label: '오프라인' },
  { key: 'schema_error', label: '형식 변경' },
])

async function baseline(loadFixture) {
  let state = createReplayState()
  state = runFixture(state, await loadFixture('d1a'))
  state = runFixture(state, await loadFixture('d1b'))
  return state
}

export async function runFailureBatch(loadFixture) {
  const rows = []
  for (const scenario of FAILURE_BATCH_ORDER) {
    let state = await baseline(loadFixture)
    state = runFixture(state, await loadFixture(scenario.key))
    rows.push({
      key: scenario.key,
      label: scenario.label,
      freshness: state.status?.freshness ?? 'none',
      error_code: state.status?.error_code ?? 'none',
      value: state.current_reading?.normalized_value ?? null,
      row_count: state.daily_readings.length,
    })
  }
  return rows
}

export async function runRecoverySummary(loadFixture) {
  let state = await baseline(loadFixture)
  state = runFixture(state, await loadFixture('timeout'))
  state = runFixture(state, await loadFixture('recover'))
  return {
    freshness: state.status?.freshness ?? 'none',
    error_code: state.status?.error_code ?? 'none',
    value: state.current_reading?.normalized_value ?? null,
    row_count: state.daily_readings.length,
  }
}
