import { supabaseRequest } from './supabase.js'

async function json(r){return r.json()}

export async function getReview(planId){
  const r=await supabaseRequest(`pds_plan_review?plan_id=eq.${encodeURIComponent(planId)}&select=*&limit=1`)
  const rows=await json(r)
  return rows[0]||null
}

export async function getImprovement(planId){
  const r=await supabaseRequest(`plan_reviews?plan_id=eq.${encodeURIComponent(planId)}&select=id,plan_id,improvement,carried_to_plan_id,created_at,updated_at&limit=1`)
  const rows=await json(r)
  return rows[0]||null
}

export async function saveImprovement(input){
  const r=await supabaseRequest('plan_reviews?on_conflict=plan_id&select=id,plan_id,improvement,carried_to_plan_id,created_at,updated_at',{
    method:'POST',body:input,headers:{Prefer:'resolution=merge-duplicates,return=representation'}
  })
  const rows=await json(r)
  return rows[0]||null
}
