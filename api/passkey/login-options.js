import { deriveWebAuthnContext, parseBody, sendJson } from './config.js'
import { service } from './runtime.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' })
  }

  try {
    const body = parseBody(req.body)
    const result = await service.startAuthentication({
      userId: body.userId,
      context: deriveWebAuthnContext(req),
    })
    if (!result.ok) return sendJson(res, result.status, { error: result.error })
    return sendJson(res, 200, { challengeId: result.challengeId, options: result.options })
  } catch (error) {
    console.error('passkey-login-options', error?.message ?? error)
    return sendJson(res, 503, { error: 'PASSKEY_SERVICE_UNAVAILABLE' })
  }
}
