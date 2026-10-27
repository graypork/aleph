export const SESSION_COOKIE = 't08_session'

export const PASSKEY_USERS = {
  miles: { userId: 'miles', displayName: 'Miles' },
  sandbox: { userId: 'sandbox', displayName: 'Sandbox' },
}

export function passkeyUser(userId) {
  return PASSKEY_USERS[userId] ?? null
}

export function parseBody(body) {
  if (body && typeof body === 'object') return body
  if (typeof body !== 'string') return {}
  try {
    return JSON.parse(body)
  } catch {
    return {}
  }
}

export function parseCookieHeader(header = '') {
  return String(header)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const index = part.indexOf('=')
      if (index < 0) return cookies
      const key = part.slice(0, index).trim()
      const raw = part.slice(index + 1)
      try {
        cookies[key] = decodeURIComponent(raw)
      } catch {
        cookies[key] = raw
      }
      return cookies
    }, {})
}

export function sessionTokenFromRequest(req) {
  return parseCookieHeader(req?.headers?.cookie ?? '')[SESSION_COOKIE] ?? null
}

export function deriveWebAuthnContext(req) {
  const headers = req?.headers ?? {}
  const forwardedHost = String(headers['x-forwarded-host'] ?? '').split(',')[0].trim()
  const host = forwardedHost || String(headers.host ?? 'localhost').trim()
  const proto = String(headers['x-forwarded-proto'] ?? (host.startsWith('localhost') ? 'http' : 'https'))
    .split(',')[0]
    .trim()
  const rpID = host.replace(/:\d+$/, '')
  return { rpID, origin: `${proto}://${host}` }
}

export function sessionCookie(token, req) {
  const { origin } = deriveWebAuthnContext(req)
  const secure = origin.startsWith('https://') ? '; Secure' : ''
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=28800`
}

export function clearSessionCookie(req) {
  const { origin } = deriveWebAuthnContext(req)
  const secure = origin.startsWith('https://') ? '; Secure' : ''
  return `${SESSION_COOKIE}=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0`
}

export function sendJson(res, status, body) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json(body)
}
