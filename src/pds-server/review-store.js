import { userSupabaseRequest } from './supabase.js'
import { listWorkLogsByPlan } from './worklog-store.js'

const json=response=>response.json()
export function countBlockedTasks(logs){return new Set((logs||[]).filter(log=>typeof log.blocker_reason==='string'&&log.blocker_reason.trim()).map(log=>log.task_id)).size}

export async function getReview(planId,accessToken){const rows=await json(await userSupabaseRequest(`pds_plan_review?plan_id=eq.${encodeURIComponent(planId)}&select=*&limit=1`,accessToken));const metrics=rows[0]||null;if(!metrics)return null;const logs=await listWorkLogsByPlan(planId,accessToken);return{...metrics,blocked_tasks:countBlockedTasks(logs)}}
export async function getImprovement(planId,accessToken){const rows=await json(await userSupabaseRequest(`plan_reviews?plan_id=eq.${encodeURIComponent(planId)}&select=id,plan_id,improvement,carried_to_plan_id,created_at,updated_at&limit=1`,accessToken));return rows[0]||null}
export async function saveImprovement(input,accessToken){const rows=await json(await userSupabaseRequest('plan_reviews?on_conflict=plan_id&select=id,plan_id,improvement,carried_to_plan_id,created_at,updated_at',accessToken,{method:'POST',body:input,headers:{Prefer:'resolution=merge-duplicates,return=representation'}}));return rows[0]||null}
