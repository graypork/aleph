export const NORMALIZED_KEYS = Object.freeze([
  'signal_id',
  'normalized_value',
  'unit',
  'source_name',
  'source_url',
  'source_time',
  'fetched_at',
  'record_timezone',
  'record_date',
])

export function kstDate(isoString) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) throw new TypeError('fetched_at must be a valid ISO-8601 date-time')
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}-${byType.month}-${byType.day}`
}

export function validateNormalizedReading(reading) {
  if (!reading || typeof reading !== 'object' || Array.isArray(reading)) {
    throw new TypeError('normalized reading must be an object')
  }
  const actual = Object.keys(reading).sort()
  const expected = [...NORMALIZED_KEYS].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`normalized reading keys must be exactly: ${NORMALIZED_KEYS.join(', ')}`)
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(reading.signal_id) || reading.signal_id.length > 100) {
    throw new TypeError('signal_id is invalid')
  }
  if (!Number.isFinite(reading.normalized_value)) throw new TypeError('normalized_value must be a finite number')
  if (typeof reading.unit !== 'string' || !reading.unit.trim() || reading.unit.length > 24) throw new TypeError('unit is invalid')
  if (typeof reading.source_name !== 'string' || !reading.source_name.trim() || reading.source_name.length > 120) throw new TypeError('source_name is invalid')
  let sourceUrl
  try {
    sourceUrl = new URL(reading.source_url)
  } catch {
    throw new TypeError('source_url must be an absolute URL')
  }
  if (sourceUrl.protocol !== 'https:') throw new TypeError('source_url must use HTTPS')
  if (reading.source_time !== null && Number.isNaN(new Date(reading.source_time).getTime())) {
    throw new TypeError('source_time must be a valid date-time or null')
  }
  if (Number.isNaN(new Date(reading.fetched_at).getTime())) throw new TypeError('fetched_at must be a valid date-time')
  if (reading.record_timezone !== 'Asia/Seoul') throw new TypeError('record_timezone must be Asia/Seoul')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reading.record_date) || reading.record_date !== kstDate(reading.fetched_at)) {
    throw new TypeError('record_date must be the Asia/Seoul date derived from fetched_at')
  }
  return true
}

export function recordIdFor(reading) {
  return `t04-${reading.signal_id}-${reading.record_date}`
}

export function upsertDailyRow(rows, reading) {
  validateNormalizedReading(reading)
  const next = rows.map((row) => structuredClone(row))
  const index = next.findIndex((row) => row.signal_id === reading.signal_id && row.record_date === reading.record_date)
  const existing = index >= 0 ? next[index] : null
  const row = {
    record_id: existing?.record_id ?? recordIdFor(reading),
    signal_id: reading.signal_id,
    record_date: reading.record_date,
    normalized_value: reading.normalized_value,
    unit: reading.unit,
    source_name: reading.source_name,
    source_url: reading.source_url,
    source_observed_at: reading.source_time,
    first_fetched_at: existing?.first_fetched_at ?? reading.fetched_at,
    last_fetched_at: reading.fetched_at,
    reading: structuredClone(reading),
  }
  if (index >= 0) next[index] = row
  else next.push(row)
  next.sort((a, b) => a.record_date.localeCompare(b.record_date))
  return { rows: next, row, inserted: index < 0 }
}

export function comparisonFor(rows, current) {
  const previous = rows
    .filter((row) => row.signal_id === current.signal_id && row.record_date < current.record_date)
    .sort((a, b) => b.record_date.localeCompare(a.record_date))[0]
  if (!previous) return { state: 'insufficient', signed: null, direction: null, magnitude: null, unit: null }
  if (previous.unit !== current.unit) return { state: 'unit_mismatch', signed: null, direction: null, magnitude: null, unit: null }
  const signed = Number((current.normalized_value - previous.normalized_value).toFixed(6))
  return {
    state: 'comparable',
    signed,
    direction: signed > 0 ? 'increase' : signed < 0 ? 'decrease' : 'unchanged',
    magnitude: Math.abs(signed),
    unit: current.unit,
  }
}
