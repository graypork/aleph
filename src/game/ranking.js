export function normalizeNickname(value) {
  return String(value ?? '').trim().toUpperCase()
}

export function isValidNickname(value) {
  return /^[A-Z0-9_-]{2,12}$/.test(normalizeNickname(value))
}

export function encodeRankingScore(quality, timeSeconds) {
  const qualityInt = Math.round(Number(quality))
  const millis = Math.round(Number(timeSeconds) * 1000)
  return qualityInt * 1_000_000 + (1_000_000 - millis)
}

export function isBetterRecord(next, current) {
  if (!current) return true
  return encodeRankingScore(next.quality, next.timeSeconds) > encodeRankingScore(current.quality, current.timeSeconds)
}
