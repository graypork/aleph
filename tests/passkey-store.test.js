import test from 'node:test'
import assert from 'node:assert/strict'
import { createPasskeyStore } from '../src/passkey-server/store.js'

function fakeRedis() {
  const strings = new Map()
  const hashes = new Map()

  return async (command) => {
    const [op, ...args] = command
    switch (String(op).toUpperCase()) {
      case 'SET': {
        strings.set(String(args[0]), String(args[1]))
        return 'OK'
      }
      case 'GET':
        return strings.get(String(args[0])) ?? null
      case 'GETDEL': {
        const key = String(args[0])
        const value = strings.get(key) ?? null
        strings.delete(key)
        return value
      }
      case 'DEL': {
        let removed = 0
        for (const key of args.map(String)) removed += strings.delete(key) ? 1 : 0
        return removed
      }
      case 'HSET': {
        const [key, field, value] = args.map(String)
        const hash = hashes.get(key) ?? new Map()
        const existed = hash.has(field)
        hash.set(field, value)
        hashes.set(key, hash)
        return existed ? 0 : 1
      }
      case 'HGET': {
        const [key, field] = args.map(String)
        return hashes.get(key)?.get(field) ?? null
      }
      case 'HGETALL': {
        const key = String(args[0])
        const hash = hashes.get(key)
        if (!hash) return []
        return [...hash.entries()].flat()
      }
      case 'HDEL': {
        const [key, field] = args.map(String)
        return hashes.get(key)?.delete(field) ? 1 : 0
      }
      default:
        throw new Error(`Unsupported fake redis command: ${command.join(' ')}`)
    }
  }
}

test('challenge is unique-addressable and can be consumed only once', async () => {
  const store = createPasskeyStore(fakeRedis(), {
    createId: (() => {
      const ids = ['challenge-a', 'challenge-b']
      return () => ids.shift()
    })(),
    createSessionToken: () => 'session-token',
  })

  const first = await store.saveChallenge({ kind: 'login', userId: 'miles', challenge: 'abc' })
  const second = await store.saveChallenge({ kind: 'login', userId: 'miles', challenge: 'def' })

  assert.equal(first.id, 'challenge-a')
  assert.equal(second.id, 'challenge-b')
  assert.notEqual(first.id, second.id)

  assert.deepEqual(await store.consumeChallenge('login', 'miles', first.id), {
    challenge: 'abc',
    metadata: null,
  })
  assert.equal(await store.consumeChallenge('login', 'miles', first.id), null)
})

test('credentials are scoped to their owner and can be deleted independently', async () => {
  const store = createPasskeyStore(fakeRedis())

  await store.saveCredential('miles', { id: 'cred-a', name: 'Laptop', publicKey: 'pub-a', counter: 0 })
  await store.saveCredential('miles', { id: 'cred-b', name: 'Phone', publicKey: 'pub-b', counter: 0 })
  await store.saveCredential('sandbox', { id: 'cred-c', name: 'Demo key', publicKey: 'pub-c', counter: 0 })

  assert.equal((await store.listCredentials('miles')).length, 2)
  assert.equal(await store.getCredential('miles', 'cred-c'), null)

  await store.deleteCredential('miles', 'cred-a')
  assert.deepEqual((await store.listCredentials('miles')).map((item) => item.id), ['cred-b'])
  assert.equal((await store.listCredentials('sandbox')).length, 1)
})

test('private payload comes from authenticated owner, not a requested account id', async () => {
  const store = createPasskeyStore(fakeRedis(), {
    createSessionToken: () => 'secret-session',
  })

  const session = await store.createSession('miles')
  assert.equal(session.token, 'secret-session')
  assert.equal((await store.readSession('secret-session')).userId, 'miles')

  const own = store.privatePayloadFor('miles')
  const other = store.privatePayloadFor('sandbox')
  assert.equal(own.userId, 'miles')
  assert.equal(other.userId, 'sandbox')
  assert.notDeepEqual(own.items, other.items)

  await store.deleteSession('secret-session')
  assert.equal(await store.readSession('secret-session'), null)
})
