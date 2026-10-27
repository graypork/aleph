import {
  clearSessionCookie,
  deriveWebAuthnContext,
  parseBody,
  sendJson,
  sessionCookie,
  sessionTokenFromRequest,
} from '../src/passkey-server/config.js'
import { service, store } from '../src/passkey-server/runtime.js'

function actionFrom(req) {
  const raw = req?.query?.action
  return Array.isArray(raw) ? raw[0] : raw
}

export default async function handler(req, res) {
  const action = actionFrom(req)
  const body = parseBody(req.body)
  const sessionToken = sessionTokenFromRequest(req)

  try {
    if (action === 'register-options' && req.method === 'POST') {
      const session = sessionToken ? await store.readSession(sessionToken) : null
      const result = await service.startRegistration({
        userId: body.userId,
        name: body.name,
        sessionUserId: session?.userId ?? null,
        context: deriveWebAuthnContext(req),
      })
      if (!result.ok) return sendJson(res, result.status, { error: result.error })
      return sendJson(res, 200, { challengeId: result.challengeId, options: result.options })
    }

    if (action === 'register-verify' && req.method === 'POST') {
      const session = sessionToken ? await store.readSession(sessionToken) : null
      const result = await service.finishRegistration({
        userId: body.userId,
        challengeId: body.challengeId,
        response: body.response,
        sessionUserId: session?.userId ?? null,
        context: deriveWebAuthnContext(req),
      })
      if (!result.ok) return sendJson(res, result.status, { error: result.error })
      res.setHeader('Set-Cookie', sessionCookie(result.sessionToken, req))
      return sendJson(res, 200, { verified: true, credential: result.credential })
    }

    if (action === 'login-options' && req.method === 'POST') {
      const result = await service.startAuthentication({ userId: body.userId, context: deriveWebAuthnContext(req) })
      if (!result.ok) return sendJson(res, result.status, { error: result.error })
      return sendJson(res, 200, { challengeId: result.challengeId, options: result.options })
    }

    if (action === 'login-verify' && req.method === 'POST') {
      const result = await service.finishAuthentication({
        userId: body.userId,
        challengeId: body.challengeId,
        response: body.response,
        context: deriveWebAuthnContext(req),
      })
      if (!result.ok) return sendJson(res, result.status, { error: result.error })
      res.setHeader('Set-Cookie', sessionCookie(result.sessionToken, req))
      return sendJson(res, 200, { verified: true, userId: result.userId })
    }

    if (action === 'session' && req.method === 'GET') {
      const result = await service.readSession({ sessionToken })
      if (!result.ok) return sendJson(res, result.status, { error: result.error })
      return sendJson(res, 200, { user: result.user, credentialCount: result.credentialCount })
    }

    if (action === 'logout' && req.method === 'POST') {
      await service.logout({ sessionToken })
      res.setHeader('Set-Cookie', clearSessionCookie(req))
      return sendJson(res, 200, { loggedOut: true })
    }

    if (action === 'credentials' && req.method === 'GET') {
      const result = await service.listCredentials({ sessionToken })
      if (!result.ok) return sendJson(res, result.status, { error: result.error })
      return sendJson(res, 200, { credentials: result.credentials })
    }

    if (action === 'credentials' && req.method === 'DELETE') {
      const result = await service.deleteCredential({ sessionToken, credentialId: body.credentialId })
      if (!result.ok) return sendJson(res, result.status, { error: result.error })
      return sendJson(res, 200, { deleted: true, remaining: result.remaining, lockedOut: result.lockedOut })
    }

    if (action === 'private' && req.method === 'GET') {
      const strictOwner = typeof req.query?.owner === 'string' ? req.query.owner : null
      const result = await service.readPrivate({ sessionToken, ownerUserId: strictOwner })
      if (!result.ok) return sendJson(res, result.status, { error: result.error })
      return sendJson(res, 200, { data: result.data })
    }

    return sendJson(res, 404, { error: 'PASSKEY_ACTION_NOT_FOUND' })
  } catch (error) {
    console.error('passkey-api', action, error?.message ?? error)
    return sendJson(res, 503, { error: 'PASSKEY_SERVICE_UNAVAILABLE' })
  }
}
