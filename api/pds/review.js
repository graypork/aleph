import { getImprovement as getImprovementRecord, getReview as getReviewRecord, saveImprovement as saveImprovementRecord } from './review-store.js'

function send(res,status,body){res.setHeader('Cache-Control','no-store');return res.status(status).json(body)}

export function createReviewHandler({getReview=getReviewRecord,getImprovement=getImprovementRecord,saveImprovement=saveImprovementRecord}={}){
  return async function handler(req,res){
    try{
      if(req.method==='GET'){
        const planId=req.query?.plan_id
        if(!planId) return send(res,400,{error:'PLAN_ID_REQUIRED'})
        const [metrics,saved]=await Promise.all([getReview(String(planId)),getImprovement(String(planId))])
        if(!metrics) return send(res,404,{error:'REVIEW_NOT_FOUND'})
        return send(res,200,{review:{...metrics,overdue_tasks:metrics.delayed_tasks,improvement:saved?.improvement||'',carried_to_plan_id:saved?.carried_to_plan_id||null}})
      }
      if(req.method==='PATCH'||req.method==='POST'){
        const planId=req.body?.plan_id
        const improvement=req.body?.improvement
        if(typeof planId!=='string'||typeof improvement!=='string'||!improvement.trim()) return send(res,400,{error:'INVALID_REVIEW'})
        const input={plan_id:planId,improvement:improvement.trim()}
        if(req.body?.carried_to_plan_id) input.carried_to_plan_id=req.body.carried_to_plan_id
        return send(res,200,{review:await saveImprovement(input)})
      }
      res.setHeader('Allow','GET, POST, PATCH')
      return send(res,405,{error:'METHOD_NOT_ALLOWED'})
    }catch{return send(res,503,{error:'DATABASE_UNAVAILABLE'})}
  }
}

export default createReviewHandler()
