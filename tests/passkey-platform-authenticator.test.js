import test from 'node:test'
import assert from 'node:assert/strict'
import { createPasskeyService } from '../src/passkey-server/service.js'

test('first passkey prefers the local phone while additional passkeys stay flexible', async () => {
  const credentials = []
  const registrationInputs = []
  let seq = 0

  const store = {
    async listCredentials() {
      return structuredClone(credentials)
    },
    async saveChallenge({ challenge, metadata }) {
      return { id: `challenge-${++seq}`, challenge, metadata }
    },
  }

  const webauthn = {
    async generateRegistrationOptions(input) {
      registrationInputs.push(input)
      return {
        challenge: `registration-${registrationInputs.length}`,
        user: { id: 'bWlsZXM' },
        excludeCredentials: input.excludeCredentials,
      }
    },
  }

  const service = createPasskeyService({ store, webauthn })
  const context = { rpID: 'whogh.vercel.app', origin: 'https://whogh.vercel.app' }

  const first = await service.startRegistration({
    userId: 'miles',
    name: 'Phone passkey',
    sessionUserId: null,
    context,
  })
  assert.equal(first.ok, true)
  assert.equal(registrationInputs[0].preferredAuthenticatorType, 'localDevice')
  assert.equal(registrationInputs[0].authenticatorSelection.authenticatorAttachment, undefined)

  credentials.push({ id: 'existing-passkey', transports: ['internal'] })
  const second = await service.startRegistration({
    userId: 'miles',
    name: 'Second passkey',
    sessionUserId: 'miles',
    context,
  })
  assert.equal(second.ok, true)
  assert.equal(registrationInputs[1].preferredAuthenticatorType, undefined)
  assert.equal(registrationInputs[1].authenticatorSelection.authenticatorAttachment, undefined)
})

test('authentication explicitly prefers the hybrid phone path on desktop', async () => {
  const authenticationInputs = []
  const store = {
    async listCredentials() {
      return [{ id: 'phone-passkey', transports: ['internal'] }]
    },
    async saveChallenge({ challenge }) {
      return { id: 'login-challenge', challenge }
    },
  }

  const webauthn = {
    async generateAuthenticationOptions(input) {
      authenticationInputs.push(input)
      return {
        challenge: 'authentication-1',
        allowCredentials: input.allowCredentials,
      }
    },
  }

  const service = createPasskeyService({ store, webauthn })
  const context = { rpID: 'whogh.vercel.app', origin: 'https://whogh.vercel.app' }

  const result = await service.startAuthentication({ userId: 'miles', context })

  assert.equal(result.ok, true)
  assert.deepEqual(authenticationInputs[0].allowCredentials, [
    { id: 'phone-passkey', transports: ['internal', 'hybrid'] },
  ])
  assert.deepEqual(result.options.hints, ['hybrid'])
})
