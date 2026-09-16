import { comparisonFor } from '../../src/board/model.js'
import { fetchLiveReading } from '../board-live-adapter.js'
import { createBoardStore } from '../board-store.js'

const ALLOWED_ERROR_CODES = new Set(['timeout', 'auth', 'rate_limit', 'offline', 'schema_error'])

function contractErrorCode(code) {
  return ALLOWED_ERROR_CODES.has(code) ? code : 'offline'
}

function comparisonFromDays(days) {
  const current = days.at(-1)
  if (!current) return { state: 'insufficient', signed: null, direction: null, magnitude: null, unit: null }
  return comparisonFor(days, current)
}

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json(body)
}

export function createBoardLiveHandler({ fetchReading = fetchLiveReading, store = createBoardStore() } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return send(res, 405, { error: 'METHOD_NOT_ALLOWED' })
    }

    try {
      const { reading, raw } = await fetchReading()
      const saved = await store.saveLiveReading(reading, raw)
      const storedForToday = saved.days.find((row) => row.record_date === reading.record_date) ?? null
      const comparison = comparisonFromDays(saved.days)
      return send(res, 200, {
        ok: true,
        reading,
        status: { freshness: 'fresh', error_code: 'none' },
        evidenceDays: saved.days,
        comparison,
        evidenceLocked: saved.evidenceLocked,
        persistedCurrentDate: Boolean(storedForToday),
        rawCheck: {
          raw_value: raw?.current?.temperature_2m ?? null,
          normalized_value: reading.normalized_value,
          stored_value: storedForToday?.normalized_value ?? null,
          display_value: reading.normalized_value,
          unit: reading.unit,
        },
        receipts: store.receiptsFor(saved.days),
        retryable: true,
      })
    } catch (error) {
      let days = []
      let lastGood = null
      try {
        days = await store.listEvidenceDays()
        lastGood = await store.readLastGood()
      } catch {
        // Storage failure should not expose secrets; fall through with no preserved value.
      }
      return send(res, 502, {
        ok: false,
        reading: lastGood?.reading ?? null,
        status: { freshness: 'stale', error_code: contractErrorCode(error?.code) },
        evidenceDays: days,
        comparison: comparisonFromDays(days),
        evidenceLocked: days.length >= 2,
        persistedCurrentDate: false,
        rawCheck: null,
        receipts: store.receiptsFor ? store.receiptsFor(days) : [],
        retryable: true,
      })
    }
  }
}

export default createBoardLiveHandler()
