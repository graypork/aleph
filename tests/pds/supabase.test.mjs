import test from 'node:test'
import assert from 'node:assert/strict'
import { supabaseRequest } from '../../src/pds-server/supabase.js'

test('sb_secret key is sent with apikey header only', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'

  let captured
  const fetchImpl = async (url, options) => {
    captured = { url, options }
    return { ok: true, headers: new Headers() }
  }

  await supabaseRequest('plans?select=id', { fetchImpl })

  assert.equal(captured.options.headers.apikey, 'sb_secret_test')
  assert.equal('Authorization' in captured.options.headers, false)
})
