import { kstDate, validateNormalizedReading } from '../src/board/model.js'

export const SEOUL_SIGNAL_ID = 'seoul.temperature_2m'
export const SEOUL_LAT = 37.5665
export const SEOUL_LON = 126.978
export const LIVE_TIMEOUT_MS = 4000

export class LiveSourceError extends Error {
  constructor(code, message, status = null) {
    super(message)
    this.name = 'LiveSourceError'
    this.code = code
    this.status = status
  }
}

export function buildOpenMeteoUrl() {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(SEOUL_LAT))
  url.searchParams.set('longitude', String(SEOUL_LON))
  url.searchParams.set('current', 'temperature_2m')
  url.searchParams.set('timezone', 'Asia/Seoul')
  return url.toString()
}

function normalizeKstLocalTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) {
    throw new LiveSourceError('schema_error', 'Open-Meteo current.time 형식이 예상과 다릅니다.')
  }
  return `${value.length === 16 ? `${value}:00` : value}+09:00`
}

export function normalizeOpenMeteoPayload(payload, fetchedAt, sourceUrl = buildOpenMeteoUrl()) {
  try {
    const value = payload?.current?.temperature_2m
    const unit = payload?.current_units?.temperature_2m
    if (!Number.isFinite(value)) throw new TypeError('temperature_2m must be a finite number')
    if (typeof unit !== 'string' || !unit.trim()) throw new TypeError('temperature unit is missing')
    if (payload?.timezone !== 'Asia/Seoul') throw new TypeError('timezone mismatch')
    const reading = {
      signal_id: SEOUL_SIGNAL_ID,
      normalized_value: value,
      unit,
      source_name: 'Open-Meteo',
      source_url: sourceUrl,
      source_time: normalizeKstLocalTime(payload.current.time),
      fetched_at: fetchedAt,
      record_timezone: 'Asia/Seoul',
      record_date: kstDate(fetchedAt),
    }
    validateNormalizedReading(reading)
    return reading
  } catch (error) {
    if (error instanceof LiveSourceError) throw error
    throw new LiveSourceError('schema_error', 'Open-Meteo 응답 형식이 예상과 다릅니다.')
  }
}

function errorForStatus(status) {
  if (status === 401 || status === 403) return new LiveSourceError('auth', '외부 원천이 요청을 거부했습니다.', status)
  if (status === 429) return new LiveSourceError('rate_limit', '외부 원천 호출 한도에 도달했습니다.', status)
  return new LiveSourceError('upstream', `외부 원천 응답 오류 (${status})`, status)
}

export async function fetchLiveReading(fetchImpl = fetch, now = () => new Date()) {
  const sourceUrl = buildOpenMeteoUrl()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS)
  try {
    const response = await fetchImpl(sourceUrl, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) throw errorForStatus(response.status)
    let raw
    try {
      raw = await response.json()
    } catch {
      throw new LiveSourceError('schema_error', '외부 원천의 JSON을 읽을 수 없습니다.')
    }
    const fetchedAt = now().toISOString()
    return {
      reading: normalizeOpenMeteoPayload(raw, fetchedAt, sourceUrl),
      raw: {
        timezone: raw?.timezone ?? null,
        current_units: raw?.current_units ? { temperature_2m: raw.current_units.temperature_2m ?? null } : null,
        current: raw?.current ? {
          time: raw.current.time ?? null,
          temperature_2m: raw.current.temperature_2m ?? null,
        } : null,
      },
    }
  } catch (error) {
    if (error instanceof LiveSourceError) throw error
    if (error?.name === 'AbortError') throw new LiveSourceError('timeout', '외부 원천 응답이 제한 시간을 넘겼습니다.')
    throw new LiveSourceError('offline', '외부 원천에 연결할 수 없습니다.')
  } finally {
    clearTimeout(timeout)
  }
}
