import { supabaseRequest } from './supabase.js'
import { listTasks } from './task-store.js'

const LOG_COLUMNS=['id','task_id','started_at','ended_at','actual_minutes','blocker_reason','created_at'].join(',')
async function json(r){return r.json()}

export async function listWorkLogs(taskId){
  const r=await supabaseRequest(`work_logs?task_id=eq.${encodeURIComponent(taskId)}&select=${LOG_COLUMNS}&order=started_at.desc`)
  return json(r)
}

export async function listWorkLogsByPlan(planId){
  const tasks=await listTasks(planId)
  const groups=await Promise.all(tasks.map(async task=>({task,logs:await listWorkLogs(task.id)})))
  return groups.flatMap(({task,logs})=>logs.map(log=>({...log,task_title:task.title,task_estimated_minutes:task.estimated_minutes})))
}

export async function createWorkLog(input){
  const r=await supabaseRequest(`work_logs?select=${LOG_COLUMNS}`,{method:'POST',body:input,headers:{Prefer:'return=representation'}})
  const rows=await json(r)
  return rows[0]||null
}
