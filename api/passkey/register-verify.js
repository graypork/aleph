import { deriveWebAuthnContext, parseBody, sendJson, sessionCookie } from './config.js'
import { service } from './runtime.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' })
  }

  try {
    const body = parseBody(req.body)
    const result = await service.finishRegistration({
      userId: body.userId,
      challengeId: body.challengeId,
      response: body.response,
      context: deriveWebAuthnContext(req),
    })
    if (!result.ok) return sendJson(res, result.status, { error: result.error })

    res.setHeader('Set-Cookie', sessionCookie(result.sessionToken, req))
    return sendJson(res, 200, { verified: true, credential: result.credential })
  } catch (error) {
    console.error('passkey-register-verify', error?.message ?? error)
    return sendJson(res, 503, { error: 'PASSKEY_SERVICE_UNAVAILABLE' })
  }
}
