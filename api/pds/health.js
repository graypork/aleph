import { pingSupabase } from '../../src/pds-server/supabase.js'

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json(body)
}

export function createHealthHandler({ ping = pingSupabase } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return send(res, 405, { error: 'METHOD_NOT_ALLOWED' })
    }

    try {
      const { count } = await ping()
      return send(res, 200, {
        ok: true,
        database: 'supabase',
        plans: count,
      })
    } catch {
      return send(res, 503, {
        ok: false,
        error: 'DATABASE_UNAVAILABLE',
      })
    }
  }
}

export default createHealthHandler()
