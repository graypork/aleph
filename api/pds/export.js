import { supabaseRequest } from '../../src/pds-server/supabase.js'
import { countBlockedTasks } from '../../src/pds-server/review-store.js'

async function rows(path){return (await supabaseRequest(path)).json()}

export function applyBlockedCountsToReviews(reviews,tasks,workLogs){
  return reviews.map(review=>{
    const taskIds=new Set(tasks.filter(task=>task.plan_id===review.plan_id&&!task.deleted_at).map(task=>task.id))
    const planLogs=workLogs.filter(log=>taskIds.has(log.task_id))
    return{...review,blocked_tasks:countBlockedTasks(planLogs)}
  })
}

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET')
    return res.status(405).json({error:'METHOD_NOT_ALLOWED'})
  }
  try{
    const [plans,plan_revisions,tasks,work_logs,completion_events,plan_reviews,rawReviews]=await Promise.all([
      rows('plans?select=*&order=created_at.asc'),
      rows('plan_revisions?select=*&order=created_at.asc'),
      rows('tasks?select=*&order=created_at.asc'),
      rows('work_logs?select=*&order=created_at.asc'),
      rows('completion_events?select=*&order=completed_at.asc'),
      rows('plan_reviews?select=*&order=created_at.asc'),
      rows('pds_plan_review?select=*'),
    ])
    const reviews=applyBlockedCountsToReviews(rawReviews,tasks,work_logs)
    res.setHeader('Cache-Control','no-store')
    res.setHeader('Content-Disposition','attachment; filename="pds-export.json"')
    return res.status(200).json({exported_at:new Date().toISOString(),plans,plan_revisions,tasks,work_logs,completion_events,plan_reviews,reviews})
  }catch{
    return res.status(503).json({error:'DATABASE_UNAVAILABLE'})
  }
}
