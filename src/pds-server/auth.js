function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_dzxf7yQs2uiDOq_7CydAKA_aBoh2n6U'

export class AuthError extends Error {
  constructor(message = 'Authentication required', statusCode = 401) {
    super(message)
    this.name = 'AuthError'
    this.statusCode = statusCode
  }
}

export function readBearerToken(req) {
  const raw = req?.headers?.authorization ?? req?.headers?.Authorization ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(String(raw))
  return match?.[1]?.trim() || null
}

export async function requireAuthenticatedUser(req, fetchImpl = fetch) {
  const accessToken = readBearerToken(req)
  if (!accessToken) throw new AuthError()

  const url = `${requireEnv('SUPABASE_URL').replace(/\/$/, '')}/auth/v1/user`
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) throw new AuthError()
  const user = await response.json()
  if (!user?.id) throw new AuthError()
  return { user, accessToken }
}

export async function deleteAuthUser(userId, fetchImpl = fetch) {
  const url = `${requireEnv('SUPABASE_URL').replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(userId)}`
  const secret = requireEnv('SUPABASE_SECRET_KEY')
  const response = await fetchImpl(url, {
    method: 'DELETE',
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
    },
  })
  if (!response.ok) throw new Error(`Auth user deletion failed: ${response.status}`)
}
