import { passkeyUser } from './config.js'

function encodePublicKey(bytes) {
  return Buffer.from(bytes).toString('base64url')
}

function decodePublicKey(value) {
  return new Uint8Array(Buffer.from(value, 'base64url'))
}

function stableUserHandle(userId) {
  return new TextEncoder().encode(String(userId))
}

function fail(status, error) {
  return { ok: false, status, error }
}

async function authenticatedUserId(store, sessionToken) {
  const session = await store.readSession(sessionToken)
  return session?.userId ?? null
}

export function createPasskeyService({ store, webauthn }) {
  return {
    async startRegistration({ userId, name, sessionUserId, context }) {
      const user = passkeyUser(userId)
      if (!user) return fail(404, 'ACCOUNT_NOT_FOUND')
      if (!String(name ?? '').trim()) return fail(400, 'PASSKEY_NAME_REQUIRED')

      const credentials = await store.listCredentials(userId)
      const isBootstrap = credentials.length === 0
      if (!isBootstrap && sessionUserId !== userId) return fail(401, 'OWNER_SESSION_REQUIRED')

      const options = await webauthn.generateRegistrationOptions({
        rpName: 'Miles Private Area',
        rpID: context.rpID,
        userID: stableUserHandle(userId),
        userName: userId,
        userDisplayName: user.displayName,
        attestationType: 'none',
        excludeCredentials: credentials.map((credential) => ({ id: credential.id, transports: credential.transports ?? [] })),
        authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
      })

      const saved = await store.saveChallenge({
        kind: 'register',
        userId,
        challenge: options.challenge,
        metadata: {
          name: String(name).trim(),
          webAuthnUserID: options.user?.id ?? null,
          isBootstrap,
        },
      })
      return { ok: true, status: 200, challengeId: saved.id, options }
    },

    async finishRegistration({ userId, challengeId, response, sessionUserId = null, context }) {
      const user = passkeyUser(userId)
      if (!user) return fail(404, 'ACCOUNT_NOT_FOUND')
      const challenge = await store.consumeChallenge('register', userId, challengeId)
      if (!challenge) return fail(409, 'CHALLENGE_EXPIRED_OR_USED')

      const isBootstrap = Boolean(challenge.metadata?.isBootstrap)
      if (!isBootstrap && sessionUserId !== userId) return fail(401, 'OWNER_SESSION_REQUIRED')
      if (isBootstrap && (await store.listCredentials(userId)).length > 0) {
        return fail(409, 'ACCOUNT_ALREADY_INITIALIZED')
      }

      let verification
      try {
        verification = await webauthn.verifyRegistrationResponse({
          response,
          expectedChallenge: challenge.challenge,
          expectedOrigin: context.origin,
          expectedRPID: context.rpID,
          requireUserVerification: false,
        })
      } catch {
        return fail(400, 'REGISTRATION_VERIFICATION_FAILED')
      }
      if (!verification?.verified || !verification.registrationInfo) return fail(400, 'REGISTRATION_VERIFICATION_FAILED')

      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo
      const saved = await store.saveCredential(userId, {
        id: credential.id,
        name: challenge.metadata?.name ?? 'Passkey',
        publicKey: encodePublicKey(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ?? response?.response?.transports ?? [],
        webAuthnUserID: challenge.metadata?.webAuthnUserID ?? null,
        deviceType: credentialDeviceType ?? null,
        backedUp: Boolean(credentialBackedUp),
      })
      const session = await store.createSession(userId)
      return {
        ok: true,
        status: 200,
        credential: { id: saved.id, name: saved.name, createdAt: saved.createdAt },
        sessionToken: session.token,
      }
    },

    async startAuthentication({ userId, context }) {
      const user = passkeyUser(userId)
      if (!user) return fail(404, 'ACCOUNT_NOT_FOUND')
      const credentials = await store.listCredentials(userId)
      if (credentials.length === 0) return fail(409, 'NO_PASSKEY_REGISTERED')

      const options = await webauthn.generateAuthenticationOptions({
        rpID: context.rpID,
        allowCredentials: credentials.map((credential) => ({ id: credential.id, transports: credential.transports ?? [] })),
        userVerification: 'preferred',
      })
      const saved = await store.saveChallenge({ kind: 'login', userId, challenge: options.challenge })
      return { ok: true, status: 200, challengeId: saved.id, options }
    },

    async finishAuthentication({ userId, challengeId, response, context }) {
      const user = passkeyUser(userId)
      if (!user) return fail(404, 'ACCOUNT_NOT_FOUND')
      const challenge = await store.consumeChallenge('login', userId, challengeId)
      if (!challenge) return fail(409, 'CHALLENGE_EXPIRED_OR_USED')
      const credential = await store.getCredential(userId, response?.id)
      if (!credential) return fail(403, 'CREDENTIAL_NOT_ALLOWED')

      let verification
      try {
        verification = await webauthn.verifyAuthenticationResponse({
          response,
          expectedChallenge: challenge.challenge,
          expectedOrigin: context.origin,
          expectedRPID: context.rpID,
          credential: {
            id: credential.id,
            publicKey: decodePublicKey(credential.publicKey),
            counter: Number(credential.counter ?? 0),
            transports: credential.transports ?? [],
          },
          requireUserVerification: false,
        })
      } catch {
        return fail(403, 'AUTHENTICATION_VERIFICATION_FAILED')
      }
      if (!verification?.verified) return fail(403, 'AUTHENTICATION_VERIFICATION_FAILED')

      await store.saveCredential(userId, {
        ...credential,
        counter: verification.authenticationInfo?.newCounter ?? credential.counter,
      })
      const session = await store.createSession(userId)
      return { ok: true, status: 200, sessionToken: session.token, userId }
    },

    async readSession({ sessionToken }) {
      const userId = await authenticatedUserId(store, sessionToken)
      if (!userId) return fail(401, 'AUTH_REQUIRED')
      const credentials = await store.listCredentials(userId)
      return { ok: true, status: 200, user: passkeyUser(userId), credentialCount: credentials.length }
    },

    async logout({ sessionToken }) {
      if (sessionToken) await store.deleteSession(sessionToken)
      return { ok: true, status: 200 }
    },

    async listCredentials({ sessionToken }) {
      const userId = await authenticatedUserId(store, sessionToken)
      if (!userId) return fail(401, 'AUTH_REQUIRED')
      const credentials = await store.listCredentials(userId)
      return {
        ok: true,
        status: 200,
        credentials: credentials.map(({ id, name, createdAt, publicKey, transports, backedUp, deviceType }) => ({
          id,
          name,
          createdAt,
          publicKey,
          transports: transports ?? [],
          backedUp: Boolean(backedUp),
          deviceType: deviceType ?? null,
        })),
      }
    },

    async deleteCredential({ sessionToken, credentialId }) {
      const userId = await authenticatedUserId(store, sessionToken)
      if (!userId) return fail(401, 'AUTH_REQUIRED')
      const credential = await store.getCredential(userId, credentialId)
      if (!credential) return fail(404, 'CREDENTIAL_NOT_FOUND')
      await store.deleteCredential(userId, credentialId)
      const credentials = await store.listCredentials(userId)
      return { ok: true, status: 200, remaining: credentials.length, lockedOut: credentials.length === 0 }
    },

    async readPrivate({ sessionToken, ownerUserId = null }) {
      const userId = await authenticatedUserId(store, sessionToken)
      if (!userId) return fail(401, 'AUTH_REQUIRED')
      if (ownerUserId && ownerUserId !== userId) return fail(403, 'CROSS_ACCOUNT_FORBIDDEN')
      return { ok: true, status: 200, data: store.privatePayloadFor(userId) }
    },
  }
}
