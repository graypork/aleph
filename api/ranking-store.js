import {
  encodeRankingScore,
  isValidNickname,
  normalizeNickname,
} from '../src/game/ranking.js'

export const RANKING_KEY = 'recovery:ranking:v1'
export const RECORDS_KEY = 'recovery:ranking:records:v1'

export function validateRankingPayload(payload) {
  const nickname = normalizeNickname(payload?.nickname)
  const quality = Number(payload?.quality)
  const timeSeconds = Number(payload?.timeSeconds)

  if (!isValidNickname(nickname)) return { ok: false, error: 'INVALID_NICKNAME' }
  if (!Number.isInteger(quality) || quality < 0 || quality > 100) return { ok: false, error: 'INVALID_QUALITY' }
  if (!Number.isFinite(timeSeconds) || timeSeconds <= 0 || timeSeconds > 30) return { ok: false, error: 'INVALID_TIME' }

  return {
    ok: true,
    value: {
      nickname,
      quality,
      timeSeconds: Number(timeSeconds.toFixed(2)),
    },
  }
}

export function rankRows(rows) {
  return rows
    .filter(Boolean)
    .map((row) => ({
      nickname: normalizeNickname(row.nickname),
      quality: Number(row.quality),
      timeSeconds: Number(row.timeSeconds),
      updatedAt: row.updatedAt ?? null,
    }))
    .filter((row) => isValidNickname(row.nickname) && Number.isFinite(row.quality) && Number.isFinite(row.timeSeconds))
    .sort((a, b) => encodeRankingScore(b.quality, b.timeSeconds) - encodeRankingScore(a.quality, a.timeSeconds))
    .map((row, index) => ({ rank: index + 1, ...row }))
}

export function createRankingStore(command) {
  return {
    async saveBestRanking(payload) {
      const validation = validateRankingPayload(payload)
      if (!validation.ok) return validation
      const record = {
        ...validation.value,
        updatedAt: new Date().toISOString(),
      }
      const score = encodeRankingScore(record.quality, record.timeSeconds)
      const changed = Number(await command(['ZADD', RANKING_KEY, 'GT', 'CH', score, record.nickname]))
      if (changed === 1) {
        await command(['HSET', RECORDS_KEY, record.nickname, JSON.stringify(record)])
      }
      return { ok: true, improved: changed === 1, record }
    },

    async readTopRankings(limit = 10) {
      const safeLimit = Math.max(1, Math.min(10, Math.floor(Number(limit) || 10)))
      const names = await command(['ZRANGE', RANKING_KEY, 0, safeLimit - 1, 'REV'])
      if (!Array.isArray(names) || names.length === 0) return []
      const values = await command(['HMGET', RECORDS_KEY, ...names])
      const parsed = (Array.isArray(values) ? values : []).map((value) => {
        if (typeof value !== 'string') return null
        try {
          return JSON.parse(value)
        } catch {
          return null
        }
      })
      return rankRows(parsed).slice(0, safeLimit)
    },
  }
}

export async function upstashCommand(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    const error = new Error('RANKING_UNAVAILABLE')
    error.code = 'RANKING_UNAVAILABLE'
    throw error
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })

  if (!response.ok) {
    const error = new Error('RANKING_UNAVAILABLE')
    error.code = 'RANKING_UNAVAILABLE'
    throw error
  }

  const data = await response.json()
  if (data?.error) {
    const error = new Error('RANKING_UNAVAILABLE')
    error.code = 'RANKING_UNAVAILABLE'
    throw error
  }
  return data?.result
}

const defaultStore = createRankingStore(upstashCommand)

export const readTopRankings = defaultStore.readTopRankings
export const saveBestRanking = defaultStore.saveBestRanking
