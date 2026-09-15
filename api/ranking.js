import { readTopRankings, saveBestRanking, validateRankingPayload } from './ranking-store.js'

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json(body)
}

function parseBody(body) {
  if (typeof body !== 'string') return body ?? {}
  try {
    return JSON.parse(body)
  } catch {
    return {}
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rankings = await readTopRankings(10)
      return send(res, 200, { rankings })
    }

    if (req.method === 'POST') {
      const payload = parseBody(req.body)
      const validation = validateRankingPayload(payload)
      if (!validation.ok) return send(res, 400, { error: validation.error })
      const result = await saveBestRanking(validation.value)
      return send(res, 200, { accepted: true, improved: result.improved })
    }

    res.setHeader('Allow', 'GET, POST')
    return send(res, 405, { error: 'METHOD_NOT_ALLOWED' })
  } catch (error) {
    console.error('ranking-api', error?.message ?? error)
    return send(res, 503, { error: 'RANKING_UNAVAILABLE' })
  }
}
