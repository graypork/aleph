import { getImprovement as getImprovementRecord, getReview as getReviewRecord, saveImprovement as saveImprovementRecord } from '../../src/pds-server/review-store.js'
import { requireAuthenticatedUser } from '../../src/pds-server/auth.js'
function send(res,status,body){res.setHeader('Cache-Control','no-store');return res.status(status).json(body)}

export function createReviewHandler({authenticate=async()=>({user:{id:'test-user'},accessToken:'test-token'}),getReview=getReviewRecord,getImprovement=getImprovementRecord,saveImprovement=saveImprovementRecord}={}){
  return async function handler(req,res){
    try{
      const {accessToken}=await authenticate(req)
      if(req.method==='GET'){
        const planId=req.query?.plan_id
        if(!planId)return send(res,400,{error:'PLAN_ID_REQUIRED'})
        const [metrics,saved]=await Promise.all([getReview(String(planId),accessToken),getImprovement(String(planId),accessToken)])
        if(!metrics)return send(res,404,{error:'REVIEW_NOT_FOUND'})
        return send(res,200,{review:{...metrics,overdue_tasks:metrics.delayed_tasks,improvement:saved?.improvement||'',carried_to_plan_id:saved?.carried_to_plan_id||null}})
      }
      if(req.method==='PATCH'||req.method==='POST'){
        const planId=req.body?.plan_id,improvement=req.body?.improvement
        if(typeof planId!=='string'||typeof improvement!=='string'||!improvement.trim())return send(res,400,{error:'INVALID_REVIEW'})
        const input={plan_id:planId,improvement:improvement.trim()}
        if(req.body?.carried_to_plan_id)input.carried_to_plan_id=req.body.carried_to_plan_id
        const review=await saveImprovement(input,accessToken)
        if(!review)return send(res,404,{error:'PLAN_NOT_FOUND'})
        return send(res,200,{review})
      }
      res.setHeader('Allow','GET, POST, PATCH');return send(res,405,{error:'METHOD_NOT_ALLOWED'})
    }catch(error){if(error?.statusCode===401)return send(res,401,{error:'AUTH_REQUIRED'});return send(res,503,{error:'DATABASE_UNAVAILABLE'})}
  }
}
export default createReviewHandler({authenticate:requireAuthenticatedUser})
