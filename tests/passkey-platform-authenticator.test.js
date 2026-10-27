import test from 'node:test'
import assert from 'node:assert/strict'
import { createPasskeyService } from '../src/passkey-server/service.js'

test('first passkey prefers a remote phone while additional passkeys stay flexible', async () => {
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
  assert.equal(registrationInputs[0].preferredAuthenticatorType, 'remoteDevice')
  assert.equal(registrationInputs[0].authenticatorSelection.authenticatorAttachment, undefined)

  credentials.push({ id: 'existing-passkey', transports: ['hybrid'] })
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
