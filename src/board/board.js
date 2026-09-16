import './board.css'
import { createReplayState, runFixture } from './replay.js'

const $ = (selector) => document.querySelector(selector)

const elements = {
  liveValue: $('#live-value'),
  liveUnit: $('#live-unit'),
  liveStatus: $('#live-status-badge'),
  liveDelta: $('#live-delta'),
  liveMessage: $('#live-message'),
  sourceLink: $('#source-link'),
  sourceTime: $('#source-time'),
  fetchedTime: $('#fetched-time'),
  timezone: $('#timezone'),
  refresh: $('#refresh-live'),
  progress: $('#evidence-progress'),
  history: $('#daily-history'),
  raw: $('#raw-value'),
  stored: $('#stored-value'),
  display: $('#display-value'),
  syntheticValue: $('#synthetic-value'),
  syntheticFreshness: $('#synthetic-freshness'),
  syntheticError: $('#synthetic-error'),
  syntheticRows: $('#synthetic-row-count'),
  syntheticMessage: $('#synthetic-message'),
  syntheticRetry: $('#replay-retry'),
}

const errorCopy = {
  timeout: {
    title: '응답이 제한 시간을 넘겼습니다.',
    action: '잠시 뒤 다시 시도하세요.',
  },
  auth: {
    title: '외부 원천이 요청을 거부했습니다.',
    action: '원천 상태를 확인한 뒤 다시 시도하세요.',
  },
  rate_limit: {
    title: '외부 원천 호출 한도에 도달했습니다.',
    action: '호출 간격을 두고 다시 시도하세요.',
  },
  offline: {
    title: '외부 원천에 연결할 수 없습니다.',
    action: '네트워크 또는 원천 상태를 확인하고 다시 시도하세요.',
  },
  schema_error: {
    title: '응답 형식이 예상과 다릅니다.',
    action: '원천 형식 변경을 확인한 뒤 adapter를 점검하세요.',
  },
}

function formatKst(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date)
}

function formatValue(value, unit = '') {
  if (!Number.isFinite(Number(value))) return '--'
  return `${Number(value).toFixed(1)}${unit ? ` ${unit}` : ''}`
}

function renderComparison(comparison, count) {
  if (comparison?.state === 'comparable' && Number.isFinite(comparison.signed)) {
    const signed = comparison.signed
    const prefix = signed > 0 ? '+' : ''
    elements.liveDelta.textContent = `이전 실제 기록 대비 ${prefix}${signed.toFixed(1)} ${comparison.unit}`
    return
  }
  elements.liveDelta.textContent = count < 2
    ? `실제 둘째 날짜 기록을 기다리는 중 · ${count}/2`
    : '비교 가능한 이전 기록이 없습니다.'
}

function renderHistory(days) {
  elements.history.replaceChildren()
  if (!days.length) {
    const row = document.createElement('tr')
    const cell = document.createElement('td')
    cell.colSpan = 5
    cell.className = 'empty-cell'
    cell.textContent = '아직 보존된 실제 일별 기록이 없습니다.'
    row.append(cell)
    elements.history.append(row)
    return
  }
  for (const day of days) {
    const row = document.createElement('tr')
    const dateCell = document.createElement('td')
    dateCell.textContent = day.record_date
    const valueCell = document.createElement('td')
    valueCell.textContent = formatValue(day.normalized_value, day.unit)
    const sourceCell = document.createElement('td')
    const sourceLink = document.createElement('a')
    sourceLink.href = day.source_url
    sourceLink.target = '_blank'
    sourceLink.rel = 'noreferrer'
    sourceLink.textContent = day.source_name || 'Open-Meteo'
    sourceCell.append(sourceLink)
    const observedCell = document.createElement('td')
    observedCell.textContent = formatKst(day.source_observed_at)
    const storedCell = document.createElement('td')
    storedCell.textContent = formatKst(day.server_created_at)
    row.append(dateCell, valueCell, sourceCell, observedCell, storedCell)
    elements.history.append(row)
  }
}

function renderLive(payload) {
  const reading = payload.reading
  const days = Array.isArray(payload.evidenceDays) ? payload.evidenceDays : []
  const stale = payload.status?.freshness === 'stale'
  elements.liveStatus.textContent = stale ? 'STALE' : 'FRESH'
  elements.liveStatus.className = `status-badge ${stale ? 'is-stale' : 'is-fresh'}`
  elements.liveValue.textContent = reading ? Number(reading.normalized_value).toFixed(1) : '--'
  elements.liveUnit.textContent = reading?.unit ?? '°C'
  elements.sourceLink.textContent = reading?.source_name ?? 'Open-Meteo'
  elements.sourceLink.href = reading?.source_url ?? 'https://open-meteo.com/'
  elements.sourceTime.textContent = formatKst(reading?.source_time)
  elements.fetchedTime.textContent = formatKst(reading?.fetched_at)
  elements.timezone.textContent = reading?.record_timezone ?? 'Asia/Seoul'
  elements.progress.textContent = `실제 기록 ${days.length}/2${payload.evidenceLocked ? ' · 보존 완료' : ''}`
  renderComparison(payload.comparison, days.length)
  renderHistory(days)

  if (payload.rawCheck) {
    elements.raw.textContent = formatValue(payload.rawCheck.raw_value, payload.rawCheck.unit)
    elements.stored.textContent = formatValue(payload.rawCheck.stored_value, payload.rawCheck.unit)
    elements.display.textContent = formatValue(payload.rawCheck.display_value, payload.rawCheck.unit)
  } else {
    elements.raw.textContent = '--'
    elements.stored.textContent = '--'
    elements.display.textContent = '--'
  }

  if (stale) {
    const info = errorCopy[payload.status?.error_code] ?? errorCopy.offline
    elements.liveMessage.textContent = `마지막 정상값을 표시 중입니다. ${info.title} ${info.action}`
  } else if (days.length < 2) {
    elements.liveMessage.textContent = '정상 조회입니다. 오늘 값은 KST 날짜 기준 한 행으로 보존됩니다.'
  } else if (!payload.persistedCurrentDate) {
    elements.liveMessage.textContent = '두 실제 날짜 증거는 이미 보존 완료했습니다. 현재 값은 표시하지만 세 번째 증거 행은 추가하지 않습니다.'
  } else {
    elements.liveMessage.textContent = '서로 다른 실제 KST 날짜 2건이 보존되어 있습니다.'
  }
}

async function refreshLive() {
  elements.refresh.disabled = true
  elements.liveStatus.textContent = 'LOADING'
  elements.liveStatus.className = 'status-badge is-loading'
  try {
    const response = await fetch('/api/board/live', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    const payload = await response.json()
    renderLive(payload)
  } catch {
    elements.liveStatus.textContent = 'STALE'
    elements.liveStatus.className = 'status-badge is-stale'
    elements.liveMessage.textContent = '정보판 API에 연결할 수 없습니다. 잠시 뒤 다시 시도하세요.'
  } finally {
    elements.refresh.disabled = false
  }
}

const fixturePaths = {
  d1a: 'normal-d1-a.json',
  d1b: 'normal-d1-b.json',
  d2: 'normal-d2.json',
  timeout: 'timeout.json',
  auth: 'auth-401.json',
  rate_limit: 'rate-429.json',
  offline: 'offline.json',
  schema_error: 'schema-break.json',
  recover: 'recover-d2.json',
}

const fixtureCache = new Map()
async function loadFixture(name) {
  const file = fixturePaths[name]
  if (!fixtureCache.has(file)) {
    const response = await fetch(`/t04-fixtures/fixtures/${file}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`fixture load failed: ${file}`)
    fixtureCache.set(file, await response.json())
  }
  return fixtureCache.get(file)
}

let replayState = createReplayState()

function renderReplay() {
  const status = replayState.status ?? { freshness: 'none', error_code: 'none' }
  elements.syntheticValue.textContent = replayState.current_reading
    ? Number(replayState.current_reading.normalized_value).toFixed(0)
    : '--'
  elements.syntheticFreshness.textContent = status.freshness
  elements.syntheticError.textContent = status.error_code
  elements.syntheticRows.textContent = String(replayState.daily_readings.length)

  const info = errorCopy[status.error_code]
  if (status.freshness === 'stale' && info) {
    elements.syntheticMessage.textContent = `${info.title} 마지막 정상값은 유지됩니다. ${info.action}`
    elements.syntheticRetry.hidden = false
  } else if (replayState.last_comparison?.state === 'comparable') {
    elements.syntheticMessage.textContent = `정상 회복 · 이전 합성 날짜 대비 +${replayState.last_comparison.signed} ${replayState.last_comparison.unit}`
    elements.syntheticRetry.hidden = true
  } else if (replayState.current_reading) {
    elements.syntheticMessage.textContent = '정상 합성값입니다. 같은 날짜 재실행은 기존 행을 갱신합니다.'
    elements.syntheticRetry.hidden = true
  } else {
    elements.syntheticMessage.textContent = '합성 fixture를 선택하면 상태 전이를 재생합니다.'
    elements.syntheticRetry.hidden = true
  }
}

async function runSequence(names) {
  replayState = createReplayState()
  for (const name of names) replayState = runFixture(replayState, await loadFixture(name))
  renderReplay()
}

async function runFailure(name) {
  await runSequence(['d1a', 'd1b', name])
}

$('#replay-reset')?.addEventListener('click', () => {
  replayState = createReplayState()
  renderReplay()
})
$('#replay-normal-d1')?.addEventListener('click', () => runSequence(['d1a', 'd1b']))
$('#replay-normal-d2')?.addEventListener('click', () => runSequence(['d1a', 'd1b', 'd2']))
$('#failure-timeout')?.addEventListener('click', () => runFailure('timeout'))
$('#failure-auth')?.addEventListener('click', () => runFailure('auth'))
$('#failure-rate')?.addEventListener('click', () => runFailure('rate_limit'))
$('#failure-offline')?.addEventListener('click', () => runFailure('offline'))
$('#failure-schema')?.addEventListener('click', () => runFailure('schema_error'))
$('#replay-retry')?.addEventListener('click', async () => {
  replayState = runFixture(replayState, await loadFixture('recover'))
  renderReplay()
})
elements.refresh?.addEventListener('click', refreshLive)

renderReplay()
void refreshLive()
