import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3'

export const AUTH_ERROR_MESSAGE = '이메일 또는 비밀번호를 확인해 주세요.'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://rluscctcdfqrrfaxdeya.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_dzxf7yQs2uiDOq_7CydAKA_aBoh2n6U'

export const authClient = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

function requireClient() {
  if (!authClient) throw new Error('Authentication is not configured')
  return authClient
}

export async function getSession() {
  const client = requireClient()
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  return data.session ?? null
}

export async function getAccessToken() {
  return (await getSession())?.access_token ?? null
}

export async function signUp(email, password) {
  const client = requireClient()
  const { data, error } = await client.auth.signUp({ email, password })
  if (error) throw new Error(AUTH_ERROR_MESSAGE)
  return data
}

export async function signIn(email, password) {
  const client = requireClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(AUTH_ERROR_MESSAGE)
  return data
}

export async function signOut() {
  const client = requireClient()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export async function changePassword(currentPassword, newPassword) {
  const client = requireClient()
  const { error } = await client.auth.updateUser({ password: newPassword, currentPassword })
  if (error) throw new Error('비밀번호를 변경할 수 없습니다.')
  const { error: signOutError } = await client.auth.signOut()
  if (signOutError) throw signOutError
}

export function onAuthChange(callback) {
  const client = requireClient()
  return client.auth.onAuthStateChange((event, session) => callback(event, session))
}
