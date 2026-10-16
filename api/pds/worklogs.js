import { createWorkLog as createWorkLogRecord, listWorkLogs as listWorkLogsRecord, listWorkLogsByPlan as listWorkLogsByPlanRecord } from '../../src/pds-server/worklog-store.js'
import { requireAuthenticatedUser } from '../../src/pds-server/auth.js'

function send(res,status,body){res.setHeader('Cache-Control','no-store');return res.status(status).json(body)}
function validIso(value){return typeof value==='string'&&!Number.isNaN(Date.parse(value))}
function valid(input){return typeof input.task_id==='string'&&input.task_id&&validIso(input.started_at)&&validIso(input.ended_at)&&input.ended_at>=input.started_at&&Number.isInteger(input.actual_minutes)&&input.actual_minutes>=0&&(input.blocker_reason==null||typeof input.blocker_reason==='string')}

export function createWorklogsHandler({authenticate=async()=>({user:{id:'test-user'},accessToken:'test-token'}),createWorkLog=createWorkLogRecord,listWorkLogs=listWorkLogsRecord,listWorkLogsByPlan=listWorkLogsByPlanRecord}={}){
  return async function handler(req,res){
    try{
      const {accessToken}=await authenticate(req)
      if(req.method==='GET'){
        if(req.query?.plan_id)return send(res,200,{work_logs:await listWorkLogsByPlan(String(req.query.plan_id),accessToken)})
        if(req.query?.task_id)return send(res,200,{work_logs:await listWorkLogs(String(req.query.task_id),accessToken)})
        return send(res,400,{error:'PLAN_OR_TASK_ID_REQUIRED'})
      }
      if(req.method==='POST'){
        const input={task_id:req.body?.task_id,started_at:req.body?.started_at,ended_at:req.body?.ended_at,actual_minutes:req.body?.actual_minutes,blocker_reason:req.body?.blocker_reason??null}
        if(!valid(input))return send(res,400,{error:'INVALID_WORK_LOG'})
        const work_log=await createWorkLog(input,accessToken)
        if(!work_log)return send(res,404,{error:'TASK_NOT_FOUND'})
        return send(res,201,{work_log})
      }
      res.setHeader('Allow','GET, POST');return send(res,405,{error:'METHOD_NOT_ALLOWED'})
    }catch(error){if(error?.statusCode===401)return send(res,401,{error:'AUTH_REQUIRED'});return send(res,503,{error:'DATABASE_UNAVAILABLE'})}
  }
}
export default createWorklogsHandler({authenticate:requireAuthenticatedUser})
