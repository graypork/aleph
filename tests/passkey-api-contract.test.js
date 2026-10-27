import test from 'node:test'
import assert from 'node:assert/strict'
import { createPasskeyService } from '../src/passkey-server/service.js'
import { deriveWebAuthnContext, parseCookieHeader } from '../src/passkey-server/config.js'

function memoryStore() {
  const challenges = new Map()
  const credentials = new Map([
    ['miles', []],
    ['sandbox', []],
  ])
  const sessions = new Map()
  let seq = 0

  return {
    async saveChallenge({ kind, userId, challenge, metadata = null }) {
      const id = `ch-${++seq}`
      challenges.set(`${kind}:${userId}:${id}`, { challenge, metadata })
      return { id, challenge }
    },
    async consumeChallenge(kind, userId, id) {
      const key = `${kind}:${userId}:${id}`
      const value = challenges.get(key) ?? null
      challenges.delete(key)
      return value
    },
    async listCredentials(userId) {
      return structuredClone(credentials.get(userId) ?? [])
    },
    async getCredential(userId, id) {
      return structuredClone((credentials.get(userId) ?? []).find((item) => item.id === id) ?? null)
    },
    async saveCredential(userId, credential) {
      const list = credentials.get(userId) ?? []
      const index = list.findIndex((item) => item.id === credential.id)
      const value = { createdAt: '2026-10-27T00:00:00.000Z', ...credential }
      if (index >= 0) list[index] = value
      else list.push(value)
      credentials.set(userId, list)
      return structuredClone(value)
    },
    async deleteCredential(userId, id) {
      const list = credentials.get(userId) ?? []
      const next = list.filter((item) => item.id !== id)
      credentials.set(userId, next)
      return next.length !== list.length
    },
    async createSession(userId) {
      const token = `session-${userId}-${++seq}`
      sessions.set(token, { userId })
      return { token, userId }
    },
    async readSession(token) {
      return structuredClone(sessions.get(token) ?? null)
    },
    async deleteSession(token) {
      return sessions.delete(token)
    },
    privatePayloadFor(userId) {
      return { userId, items: [{ title: `${userId}-private` }] }
    },
  }
}

function fakeWebAuthn() {
  let registrationNo = 0
  let authenticationNo = 0
  let authVerifyCalls = 0
  const registrationInputs = []
  return {
    get authVerifyCalls() { return authVerifyCalls },
    get registrationInputs() { return registrationInputs },
    async generateRegistrationOptions(input) {
      registrationNo += 1
      registrationInputs.push(input)
      return {
        challenge: `reg-challenge-${registrationNo}`,
        user: { id: Buffer.from(input.userID).toString('base64url') },
        excludeCredentials: input.excludeCredentials,
      }
    },
    async verifyRegistrationResponse({ expectedChallenge }) {
      return {
        verified: true,
        registrationInfo: {
          credential: {
            id: `cred-${expectedChallenge}`,
            publicKey: new Uint8Array([1, 2, 3]),
            counter: 0,
            transports: ['internal'],
          },
          credentialDeviceType: 'multiDevice',
          credentialBackedUp: true,
        },
      }
    },
    async generateAuthenticationOptions({ allowCredentials }) {
      authenticationNo += 1
      return { challenge: `auth-challenge-${authenticationNo}`, allowCredentials }
    },
    async verifyAuthenticationResponse({ expectedChallenge, credential }) {
      authVerifyCalls += 1
      assert.ok(expectedChallenge.startsWith('auth-challenge-'))
      assert.equal(credential.id.startsWith('cred-'), true)
      return { verified: true, authenticationInfo: { newCounter: credential.counter + 1 } }
    },
  }
}

const context = { rpID: 'whogh.vercel.app', origin: 'https://whogh.vercel.app' }

test('request context and cookie parsing use the deployed host without inventing another RP', () => {
  assert.deepEqual(deriveWebAuthnContext({ headers: { host: 'whogh.vercel.app', 'x-forwarded-proto': 'https' } }), context)
  assert.deepEqual(parseCookieHeader('a=1; t08_session=abc%20123'), { a: '1', t08_session: 'abc 123' })
})

test('same account uses a stable non-PII WebAuthn user handle', async () => {
  const store = memoryStore()
  const webauthn = fakeWebAuthn()
  const service = createPasskeyService({ store, webauthn })

  const first = await service.startRegistration({ userId: 'miles', name: 'Laptop', sessionUserId: null, context })
  const registered = await service.finishRegistration({ userId: 'miles', challengeId: first.challengeId, response: {}, sessionUserId: null, context })
  await service.startRegistration({ userId: 'miles', name: 'Phone', sessionUserId: 'miles', context })

  assert.equal(registered.ok, true)
  assert.equal(Buffer.from(webauthn.registrationInputs[0].userID).toString('utf8'), 'miles')
  assert.equal(Buffer.from(webauthn.registrationInputs[1].userID).toString('utf8'), 'miles')
  assert.deepEqual([...webauthn.registrationInputs[0].userID], [...webauthn.registrationInputs[1].userID])
})

test('first credential may bootstrap, but adding another passkey requires owner session at start and verify', async () => {
  const store = memoryStore()
  const webauthn = fakeWebAuthn()
  const service = createPasskeyService({ store, webauthn })

  const first = await service.startRegistration({ userId: 'miles', name: 'Laptop', sessionUserId: null, context })
  assert.equal(first.ok, true)
  assert.equal(first.options.challenge, 'reg-challenge-1')

  const registered = await service.finishRegistration({ userId: 'miles', challengeId: first.challengeId, response: {}, sessionUserId: null, context })
  assert.equal(registered.ok, true)
  assert.ok(registered.sessionToken)

  const denied = await service.startRegistration({ userId: 'miles', name: 'Phone', sessionUserId: null, context })
  assert.deepEqual(denied, { ok: false, status: 401, error: 'OWNER_SESSION_REQUIRED' })

  const allowed = await service.startRegistration({ userId: 'miles', name: 'Phone', sessionUserId: 'miles', context })
  assert.equal(allowed.ok, true)
  assert.equal(allowed.options.excludeCredentials.length, 1)

  const verifyWithoutOwner = await service.finishRegistration({
    userId: 'miles',
    challengeId: allowed.challengeId,
    response: {},
    sessionUserId: null,
    context,
  })
  assert.deepEqual(verifyWithoutOwner, { ok: false, status: 401, error: 'OWNER_SESSION_REQUIRED' })
})

test('authentication challenge is one-time and replay is rejected before signature verification', async () => {
  const store = memoryStore()
  const webauthn = fakeWebAuthn()
  const service = createPasskeyService({ store, webauthn })

  const reg = await service.startRegistration({ userId: 'miles', name: 'Laptop', sessionUserId: null, context })
  await service.finishRegistration({ userId: 'miles', challengeId: reg.challengeId, response: {}, sessionUserId: null, context })

  const login = await service.startAuthentication({ userId: 'miles', context })
  const credentialId = login.options.allowCredentials[0].id
  const response = { id: credentialId }

  const first = await service.finishAuthentication({ userId: 'miles', challengeId: login.challengeId, response, context })
  assert.equal(first.ok, true)
  assert.equal(webauthn.authVerifyCalls, 1)

  const replay = await service.finishAuthentication({ userId: 'miles', challengeId: login.challengeId, response, context })
  assert.deepEqual(replay, { ok: false, status: 409, error: 'CHALLENGE_EXPIRED_OR_USED' })
  assert.equal(webauthn.authVerifyCalls, 1)
})

test('private data and credential deletion are derived from session owner', async () => {
  const store = memoryStore()
  const service = createPasskeyService({ store, webauthn: fakeWebAuthn() })

  const milesReg = await service.startRegistration({ userId: 'miles', name: 'Laptop', sessionUserId: null, context })
  const milesDone = await service.finishRegistration({ userId: 'miles', challengeId: milesReg.challengeId, response: {}, sessionUserId: null, context })
  const sandboxReg = await service.startRegistration({ userId: 'sandbox', name: 'Demo key', sessionUserId: null, context })
  const sandboxDone = await service.finishRegistration({ userId: 'sandbox', challengeId: sandboxReg.challengeId, response: {}, sessionUserId: null, context })

  assert.equal((await service.readPrivate({ sessionToken: milesDone.sessionToken })).data.userId, 'miles')
  assert.equal((await service.readPrivate({ sessionToken: sandboxDone.sessionToken })).data.userId, 'sandbox')

  const crossRead = await service.readPrivate({ sessionToken: milesDone.sessionToken, ownerUserId: 'sandbox' })
  assert.deepEqual(crossRead, { ok: false, status: 403, error: 'CROSS_ACCOUNT_FORBIDDEN' })

  const ignoredClientAccount = await service.readPrivate({ sessionToken: milesDone.sessionToken, ownerUserId: null })
  assert.equal(ignoredClientAccount.data.userId, 'miles')

  const milesCredentials = await service.listCredentials({ sessionToken: milesDone.sessionToken })
  const sandboxCredentialId = (await service.listCredentials({ sessionToken: sandboxDone.sessionToken })).credentials[0].id
  assert.equal(milesCredentials.credentials.some((item) => item.id === sandboxCredentialId), false)

  const crossDelete = await service.deleteCredential({ sessionToken: milesDone.sessionToken, credentialId: sandboxCredentialId })
  assert.deepEqual(crossDelete, { ok: false, status: 404, error: 'CREDENTIAL_NOT_FOUND' })
})
