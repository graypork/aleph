import { userSupabaseRequest } from './supabase.js'

const PLAN_COLUMNS=['id','title','start_date','end_date','priority','success_criteria','estimated_minutes','created_at','updated_at'].join(',')
const REVISION_COLUMNS=['id','plan_id','title','start_date','end_date','priority','success_criteria','estimated_minutes','source_updated_at','created_at'].join(',')
const json=response=>response.json()

export async function listPlans(accessToken){
  return json(await userSupabaseRequest(`plans?select=${PLAN_COLUMNS}&order=start_date.asc,created_at.asc`,accessToken))
}
export async function createPlan(input,accessToken,ownerId){
  const rows=await json(await userSupabaseRequest(`plans?select=${PLAN_COLUMNS}`,accessToken,{method:'POST',body:{...input,owner_id:ownerId},headers:{Prefer:'return=representation'}}))
  return rows[0]||null
}
export async function updatePlan(id,patch,accessToken){
  const rows=await json(await userSupabaseRequest(`plans?id=eq.${encodeURIComponent(id)}&select=${PLAN_COLUMNS}`,accessToken,{method:'PATCH',body:patch,headers:{Prefer:'return=representation'}}))
  return rows[0]||null
}
export async function getPlanWithRevisions(id,accessToken){
  const encoded=encodeURIComponent(id)
  const [planResponse,revisionsResponse]=await Promise.all([
    userSupabaseRequest(`plans?id=eq.${encoded}&select=${PLAN_COLUMNS}&limit=1`,accessToken),
    userSupabaseRequest(`plan_revisions?plan_id=eq.${encoded}&select=${REVISION_COLUMNS}&order=created_at.desc`,accessToken),
  ])
  const [plans,revisions]=await Promise.all([json(planResponse),json(revisionsResponse)])
  return plans[0]?{...plans[0],revisions}:null
}
