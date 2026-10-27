import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { upstashCommand } from '../../api/ranking-store.js'

const PREFIX = 't08:passkey'
const CHALLENGE_TTL_SECONDS = 300
const SESSION_TTL_SECONDS = 60 * 60 * 8

const PRIVATE_DATA = {
  miles: {
    userId: 'miles',
    displayName: 'Miles',
    items: [
      { title: 'Bookaive beta checklist', body: 'Synthetic note for assignment evidence.' },
      { title: 'PM portfolio next steps', body: 'Synthetic application-planning note.' },
      { title: 'Weekly reflection', body: 'Synthetic retrospective note.' },
    ],
  },
  sandbox: {
    userId: 'sandbox',
    displayName: 'Sandbox',
    items: [
      { title: 'Demo project note', body: 'Synthetic project note for isolation testing.' },
      { title: 'Demo application list', body: 'Synthetic list for assignment evidence.' },
      { title: 'Demo retrospective', body: 'Synthetic retrospective for the second account.' },
    ],
  },
}

function parseJson(value) {
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function parseHashResult(result) {
  if (!result) return []
  if (Array.isArray(result)) {
    const values = []
    for (let index = 0; index < result.length; index += 2) {
      const parsed = parseJson(result[index + 1])
      if (parsed) values.push(parsed)
    }
    return values
  }
  if (typeof result === 'object') return Object.values(result).map(parseJson).filter(Boolean)
  return []
}

function sessionKey(token) {
  const digest = createHash('sha256').update(String(token)).digest('hex')
  return `${PREFIX}:session:${digest}`
}

function challengeKey(kind, userId, id) {
  return `${PREFIX}:challenge:${kind}:${userId}:${id}`
}

function credentialKey(userId) {
  return `${PREFIX}:credentials:${userId}`
}

export function isKnownPasskeyUser(userId) {
  return Object.hasOwn(PRIVATE_DATA, userId)
}

export function passkeyUser(userId) {
  if (!isKnownPasskeyUser(userId)) return null
  return { userId, displayName: PRIVATE_DATA[userId].displayName }
}

export function createPasskeyStore(command = upstashCommand, options = {}) {
  const createId = options.createId ?? randomUUID
  const createSessionToken = options.createSessionToken ?? (() => randomBytes(32).toString('base64url'))
  const now = options.now ?? (() => new Date())

  return {
    async saveChallenge({ kind, userId, challenge, metadata = null }) {
      const id = createId()
      await command(['SET', challengeKey(kind, userId, id), JSON.stringify({ challenge, metadata }), 'EX', CHALLENGE_TTL_SECONDS])
      return { id, challenge }
    },

    async consumeChallenge(kind, userId, id) {
      if (!kind || !userId || !id) return null
      return parseJson(await command(['GETDEL', challengeKey(kind, userId, id)]))
    },

    async saveCredential(userId, credential) {
      const value = { ...credential, createdAt: credential.createdAt ?? now().toISOString() }
      await command(['HSET', credentialKey(userId), value.id, JSON.stringify(value)])
      return value
    },

    async listCredentials(userId) {
      return parseHashResult(await command(['HGETALL', credentialKey(userId)]))
        .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
    },

    async getCredential(userId, credentialId) {
      return parseJson(await command(['HGET', credentialKey(userId), credentialId]))
    },

    async deleteCredential(userId, credentialId) {
      return Number(await command(['HDEL', credentialKey(userId), credentialId])) === 1
    },

    async createSession(userId) {
      const token = createSessionToken()
      const value = { userId, createdAt: now().toISOString() }
      await command(['SET', sessionKey(token), JSON.stringify(value), 'EX', SESSION_TTL_SECONDS])
      return { token, ...value }
    },

    async readSession(token) {
      if (!token) return null
      return parseJson(await command(['GET', sessionKey(token)]))
    },

    async deleteSession(token) {
      if (!token) return false
      return Number(await command(['DEL', sessionKey(token)])) > 0
    },

    privatePayloadFor(userId) {
      const payload = PRIVATE_DATA[userId]
      return payload ? structuredClone(payload) : null
    },
  }
}

const defaultStore = createPasskeyStore()
export const saveChallenge = defaultStore.saveChallenge
export const consumeChallenge = defaultStore.consumeChallenge
export const saveCredential = defaultStore.saveCredential
export const listCredentials = defaultStore.listCredentials
export const getCredential = defaultStore.getCredential
export const deleteCredential = defaultStore.deleteCredential
export const createSession = defaultStore.createSession
export const readSession = defaultStore.readSession
export const deleteSession = defaultStore.deleteSession
export const privatePayloadFor = defaultStore.privatePayloadFor
