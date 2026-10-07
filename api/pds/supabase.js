function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

export async function supabaseRequest(path, {
  method = 'GET',
  body,
  headers = {},
  fetchImpl = fetch,
} = {}) {
  const url = `${requireEnv('SUPABASE_URL').replace(/\/$/, '')}/rest/v1/${path}`
  const secret = requireEnv('SUPABASE_SECRET_KEY')

  const response = await fetchImpl(url, {
    method,
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`)
  }

  return response
}

export async function pingSupabase() {
  const response = await supabaseRequest('plans?select=id&limit=1', {
    headers: {
      Prefer: 'count=exact',
      Range: '0-0',
    },
  })

  const contentRange = response.headers.get('content-range') || '*/0'
  const count = Number(contentRange.split('/').at(-1)) || 0

  return { count }
}
