import test from 'node:test'
import assert from 'node:assert/strict'
import { createHealthHandler } from '../../api/pds/health.js'

test('health returns 200 when Supabase read succeeds', async () => {
  const handler = createHealthHandler({ ping: async () => ({ count: 0 }) })
  const req = { method: 'GET' }
  const state = { status: null, body: null, headers: {} }
  const res = {
    setHeader(name, value) { state.headers[name] = value },
    status(code) { state.status = code; return this },
    json(body) { state.body = body; return this },
  }

  await handler(req, res)
  assert.equal(state.status, 200)
  assert.deepEqual(state.body, { ok: true, database: 'supabase', plans: 0 })
})

test('health does not expose error details when Supabase read fails', async () => {
  const handler = createHealthHandler({ ping: async () => { throw new Error('secret=do-not-leak') } })
  const req = { method: 'GET' }
  const state = { status: null, body: null }
  const res = {
    setHeader() {},
    status(code) { state.status = code; return this },
    json(body) { state.body = body; return this },
  }

  await handler(req, res)
  assert.equal(state.status, 503)
  assert.deepEqual(state.body, { ok: false, error: 'DATABASE_UNAVAILABLE' })
})
