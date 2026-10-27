import { parseBody, sendJson, sessionTokenFromRequest } from './config.js'
import { service } from './runtime.js'

export default async function handler(req, res) {
  try {
    const sessionToken = sessionTokenFromRequest(req)

    if (req.method === 'GET') {
      const result = await service.listCredentials({ sessionToken })
      if (!result.ok) return sendJson(res, result.status, { error: result.error })
      return sendJson(res, 200, { credentials: result.credentials })
    }

    if (req.method === 'DELETE') {
      const body = parseBody(req.body)
      const result = await service.deleteCredential({
        sessionToken,
        credentialId: body.credentialId,
      })
      if (!result.ok) return sendJson(res, result.status, { error: result.error })
      return sendJson(res, 200, { deleted: true, remaining: result.remaining, lockedOut: result.lockedOut })
    }

    res.setHeader('Allow', 'GET, DELETE')
    return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' })
  } catch (error) {
    console.error('passkey-credentials', error?.message ?? error)
    return sendJson(res, 503, { error: 'PASSKEY_SERVICE_UNAVAILABLE' })
  }
}
