import { isValidNickname, normalizeNickname } from './ranking.js'

export const PLAYER_NICKNAME_KEY = 'recovery-game:player-nickname:v1'

export function loadSessionNickname(storage = globalThis.sessionStorage) {
  try {
    const value = normalizeNickname(storage?.getItem(PLAYER_NICKNAME_KEY))
    return isValidNickname(value) ? value : ''
  } catch {
    return ''
  }
}

export function saveSessionNickname(storage = globalThis.sessionStorage, nickname) {
  const value = normalizeNickname(nickname)
  if (!isValidNickname(value)) return ''
  try {
    storage?.setItem(PLAYER_NICKNAME_KEY, value)
  } catch {}
  return value
}

export async function fetchRankings(fetchImpl = globalThis.fetch) {
  const response = await fetchImpl('/api/ranking', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (!response?.ok) throw new Error('RANKING_UNAVAILABLE')
  const data = await response.json()
  return Array.isArray(data?.rankings) ? data.rankings : []
}

export async function submitRanking(fetchImpl = globalThis.fetch, record) {
  const response = await fetchImpl('/api/ranking', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  })
  if (!response?.ok) throw new Error('RANKING_UNAVAILABLE')
  return response.json()
}
