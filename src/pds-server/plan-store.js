import { supabaseRequest } from './supabase.js'

const PLAN_COLUMNS = [
  'id','title','start_date','end_date','priority','success_criteria','estimated_minutes','created_at','updated_at',
].join(',')
const REVISION_COLUMNS = [
  'id','plan_id','title','start_date','end_date','priority','success_criteria','estimated_minutes','source_updated_at','created_at',
].join(',')
async function readJson(response){return response.json()}

export async function listPlans(){
  const response=await supabaseRequest(`plans?select=${PLAN_COLUMNS}&order=start_date.asc,created_at.asc`)
  return readJson(response)
}
export async function createPlan(input){
  const response=await supabaseRequest(`plans?select=${PLAN_COLUMNS}`,{method:'POST',body:input,headers:{Prefer:'return=representation'}})
  const rows=await readJson(response);return rows[0]||null
}
export async function updatePlan(id,patch){
  const response=await supabaseRequest(`plans?id=eq.${encodeURIComponent(id)}&select=${PLAN_COLUMNS}`,{method:'PATCH',body:patch,headers:{Prefer:'return=representation'}})
  const rows=await readJson(response);return rows[0]||null
}
export async function getPlanWithRevisions(id){
  const encodedId=encodeURIComponent(id)
  const [planResponse,revisionsResponse]=await Promise.all([
    supabaseRequest(`plans?id=eq.${encodedId}&select=${PLAN_COLUMNS}&limit=1`),
    supabaseRequest(`plan_revisions?plan_id=eq.${encodedId}&select=${REVISION_COLUMNS}&order=created_at.desc`),
  ])
  const [plans,revisions]=await Promise.all([readJson(planResponse),readJson(revisionsResponse)])
  if(!plans[0])return null
  return {...plans[0],revisions}
}
