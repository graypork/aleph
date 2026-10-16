import { userSupabaseRequest } from '../../src/pds-server/supabase.js'
import { requireAuthenticatedUser } from '../../src/pds-server/auth.js'
import { countBlockedTasks } from '../../src/pds-server/review-store.js'

async function rows(path,accessToken){return (await userSupabaseRequest(path,accessToken)).json()}
export function applyBlockedCountsToReviews(reviews,tasks,workLogs){return reviews.map(review=>{const taskIds=new Set(tasks.filter(task=>task.plan_id===review.plan_id&&!task.deleted_at).map(task=>task.id));const planLogs=workLogs.filter(log=>taskIds.has(log.task_id));return{...review,blocked_tasks:countBlockedTasks(planLogs)}})}

export function createExportHandler({authenticate=requireAuthenticatedUser,readRows=rows}={}){
  return async function handler(req,res){
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'METHOD_NOT_ALLOWED'})}
    try{
      const {accessToken}=await authenticate(req)
      const [plans,plan_revisions,tasks,work_logs,completion_events,plan_reviews,rawReviews,experiments,daily_observations,rule_changes]=await Promise.all([
        readRows('plans?select=*&order=created_at.asc',accessToken),
        readRows('plan_revisions?select=*&order=created_at.asc',accessToken),
        readRows('tasks?select=*&order=created_at.asc',accessToken),
        readRows('work_logs?select=*&order=created_at.asc',accessToken),
        readRows('completion_events?select=*&order=completed_at.asc',accessToken),
        readRows('plan_reviews?select=*&order=created_at.asc',accessToken),
        readRows('pds_plan_review?select=*',accessToken),
        readRows('pds_experiments?select=*&order=created_at.asc',accessToken),
        readRows('pds_daily_observations?select=*&order=record_date.asc',accessToken),
        readRows('pds_rule_changes?select=*&order=changed_at.asc',accessToken),
      ])
      const reviews=applyBlockedCountsToReviews(rawReviews,tasks,work_logs)
      res.setHeader('Cache-Control','no-store')
      res.setHeader('Content-Disposition','attachment; filename="pds-export.json"')
      return res.status(200).json({exported_at:new Date().toISOString(),plans,plan_revisions,tasks,work_logs,completion_events,plan_reviews,reviews,experiments,daily_observations,rule_changes})
    }catch(error){if(error?.statusCode===401)return res.status(401).json({error:'AUTH_REQUIRED'});return res.status(503).json({error:'DATABASE_UNAVAILABLE'})}
  }
}
export default createExportHandler()
