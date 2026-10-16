import { userSupabaseRequest } from './supabase.js'
import { listTasks } from './task-store.js'

const LOG_COLUMNS=['id','task_id','started_at','ended_at','actual_minutes','blocker_reason','created_at'].join(',')
const json=response=>response.json()

export async function listWorkLogs(taskId,accessToken){return json(await userSupabaseRequest(`work_logs?task_id=eq.${encodeURIComponent(taskId)}&select=${LOG_COLUMNS}&order=started_at.desc`,accessToken))}
export async function listWorkLogsByPlan(planId,accessToken){const tasks=await listTasks(planId,accessToken);const groups=await Promise.all(tasks.map(async task=>({task,logs:await listWorkLogs(task.id,accessToken)})));return groups.flatMap(({task,logs})=>logs.map(log=>({...log,task_title:task.title,task_estimated_minutes:task.estimated_minutes})))}
export async function createWorkLog(input,accessToken){const rows=await json(await userSupabaseRequest(`work_logs?select=${LOG_COLUMNS}`,accessToken,{method:'POST',body:input,headers:{Prefer:'return=representation'}}));return rows[0]||null}
