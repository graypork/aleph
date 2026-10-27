import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import { createPasskeyStore } from './store.js'
import { createPasskeyService } from './service.js'

export const store = createPasskeyStore()

export const service = createPasskeyService({
  store,
  webauthn: {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
  },
})
