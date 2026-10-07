import { supabaseRequest } from './supabase.js'

const TASK_COLUMNS = ['id','plan_id','title','description','due_date','priority','tags','estimated_minutes','status','deleted_at','created_at','updated_at'].join(',')

async function json(response) { return response.json() }

export async function listTasks(planId) {
  const r = await supabaseRequest(`tasks?plan_id=eq.${encodeURIComponent(planId)}&deleted_at=is.null&select=${TASK_COLUMNS}`)
  return json(r)
}

export async function getTask(id) {
  const r = await supabaseRequest(`tasks?id=eq.${encodeURIComponent(id)}&select=${TASK_COLUMNS}&limit=1`)
  const rows = await json(r)
  return rows[0] || null
}

export async function createTask(input) {
  const r = await supabaseRequest(`tasks?select=${TASK_COLUMNS}`, { method:'POST', body:input, headers:{ Prefer:'return=representation' } })
  const rows = await json(r)
  return rows[0] || null
}

export async function updateTask(id, patch) {
  const r = await supabaseRequest(`tasks?id=eq.${encodeURIComponent(id)}&select=${TASK_COLUMNS}`, { method:'PATCH', body:patch, headers:{ Prefer:'return=representation' } })
  const rows = await json(r)
  return rows[0] || null
}

export async function softDeleteTask(id) {
  return updateTask(id, { deleted_at: new Date().toISOString() })
}

export async function completeTask(id, key) {
  const r = await supabaseRequest('rpc/pds_complete_task', { method:'POST', body:{ p_task_id:id, p_idempotency_key:key } })
  return json(r)
}

export async function reopenTask(id) {
  const r = await supabaseRequest('rpc/pds_reopen_task', { method:'POST', body:{ p_task_id:id } })
  return json(r)
}
