import { userSupabaseRequest } from './supabase.js'

const TASK_COLUMNS=['id','plan_id','title','description','start_date','due_date','priority','tags','estimated_minutes','status','blocker_reason','deleted_at','created_at','updated_at'].join(',')
const json=response=>response.json()

export async function listTasks(planId,accessToken){return json(await userSupabaseRequest(`tasks?plan_id=eq.${encodeURIComponent(planId)}&deleted_at=is.null&select=${TASK_COLUMNS}`,accessToken))}
export async function getTask(id,accessToken){const rows=await json(await userSupabaseRequest(`tasks?id=eq.${encodeURIComponent(id)}&select=${TASK_COLUMNS}&limit=1`,accessToken));return rows[0]||null}
export async function createTask(input,accessToken){const rows=await json(await userSupabaseRequest(`tasks?select=${TASK_COLUMNS}`,accessToken,{method:'POST',body:input,headers:{Prefer:'return=representation'}}));return rows[0]||null}
export async function updateTask(id,patch,accessToken){const rows=await json(await userSupabaseRequest(`tasks?id=eq.${encodeURIComponent(id)}&select=${TASK_COLUMNS}`,accessToken,{method:'PATCH',body:patch,headers:{Prefer:'return=representation'}}));return rows[0]||null}
export async function softDeleteTask(id,accessToken){return updateTask(id,{deleted_at:new Date().toISOString()},accessToken)}
export async function completeTask(id,key,accessToken){return json(await userSupabaseRequest('rpc/pds_complete_task',accessToken,{method:'POST',body:{p_task_id:id,p_idempotency_key:key}}))}
export async function reopenTask(id,accessToken){return json(await userSupabaseRequest('rpc/pds_reopen_task',accessToken,{method:'POST',body:{p_task_id:id}}))}
