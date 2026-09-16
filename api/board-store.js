import { recordIdFor, validateNormalizedReading } from '../src/board/model.js'
import { upstashCommand } from './ranking-store.js'

export const LIVE_DAYS_KEY = 't04:live:days:v1'

const TWO_DAY_UPSERT_SCRIPT = `
local existing = redis.call('HGET', KEYS[1], ARGV[1])
local count = redis.call('HLEN', KEYS[1])
if existing or count < 2 then
  redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
  return 1
end
return 0
`.trim()

function safeParse(value) {
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function parseHashResult(result) {
  if (!result) return []
  if (Array.isArray(result)) {
    const rows = []
    for (let i = 0; i < result.length; i += 2) {
      const parsed = safeParse(result[i + 1])
      if (parsed) rows.push(parsed)
    }
    return rows
  }
  if (typeof result === 'object') {
    return Object.values(result).map(safeParse).filter(Boolean)
  }
  return []
}

export function createBoardStore(command = upstashCommand, now = () => new Date()) {
  async function listEvidenceDays() {
    const result = await command(['HGETALL', LIVE_DAYS_KEY])
    return parseHashResult(result).sort((a, b) => a.record_date.localeCompare(b.record_date))
  }

  async function saveLiveReading(reading, rawSnapshot) {
    validateNormalizedReading(reading)
    const existing = safeParse(await command(['HGET', LIVE_DAYS_KEY, reading.record_date]))
    const serverNow = now().toISOString()
    const row = {
      record_id: existing?.record_id ?? recordIdFor(reading),
      signal_id: reading.signal_id,
      record_date: reading.record_date,
      source_url: reading.source_url,
      source_observed_at: reading.source_time,
      normalized_value: reading.normalized_value,
      unit: reading.unit,
      source_name: reading.source_name,
      first_fetched_at: existing?.first_fetched_at ?? reading.fetched_at,
      last_fetched_at: reading.fetched_at,
      server_created_at: existing?.server_created_at ?? serverNow,
      raw_snapshot: rawSnapshot ?? null,
      reading: structuredClone(reading),
    }
    const changed = Number(await command([
      'EVAL',
      TWO_DAY_UPSERT_SCRIPT,
      '1',
      LIVE_DAYS_KEY,
      reading.record_date,
      JSON.stringify(row),
    ]))
    const days = await listEvidenceDays()
    return {
      persisted: changed === 1,
      evidenceLocked: days.length >= 2,
      row: changed === 1 ? row : null,
      days,
    }
  }

  async function readLastGood() {
    const days = await listEvidenceDays()
    return days.at(-1) ?? null
  }

  function receiptsFor(days) {
    return [...days]
      .sort((a, b) => a.server_created_at.localeCompare(b.server_created_at))
      .map((row) => ({
        kind: 't04_day',
        server_created_at: row.server_created_at,
        payload: {
          source_url: row.source_url,
          source_observed_at: row.source_observed_at,
          normalized_value: row.normalized_value,
          unit: row.unit,
        },
      }))
  }

  return { listEvidenceDays, saveLiveReading, readLastGood, receiptsFor }
}

const defaultStore = createBoardStore()
export const listEvidenceDays = defaultStore.listEvidenceDays
export const saveLiveReading = defaultStore.saveLiveReading
export const readLastGood = defaultStore.readLastGood
export const receiptsFor = defaultStore.receiptsFor
