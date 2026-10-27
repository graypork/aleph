import { sendJson, sessionTokenFromRequest } from './config.js'
import { service } from './runtime.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' })
  }

  try {
    const result = await service.readSession({ sessionToken: sessionTokenFromRequest(req) })
    if (!result.ok) return sendJson(res, result.status, { error: result.error })
    return sendJson(res, 200, { user: result.user, credentialCount: result.credentialCount })
  } catch (error) {
    console.error('passkey-session', error?.message ?? error)
    return sendJson(res, 503, { error: 'PASSKEY_SERVICE_UNAVAILABLE' })
  }
}
