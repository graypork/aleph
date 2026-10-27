import { clearSessionCookie, sendJson, sessionTokenFromRequest } from './config.js'
import { service } from './runtime.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' })
  }

  try {
    await service.logout({ sessionToken: sessionTokenFromRequest(req) })
    res.setHeader('Set-Cookie', clearSessionCookie(req))
    return sendJson(res, 200, { loggedOut: true })
  } catch (error) {
    console.error('passkey-logout', error?.message ?? error)
    return sendJson(res, 503, { error: 'PASSKEY_SERVICE_UNAVAILABLE' })
  }
}
