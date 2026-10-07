import { createWorkLog as createWorkLogRecord, listWorkLogs as listWorkLogsRecord, listWorkLogsByPlan as listWorkLogsByPlanRecord } from './worklog-store.js'

function send(res,status,body){res.setHeader('Cache-Control','no-store');return res.status(status).json(body)}
function validIso(v){return typeof v==='string'&&!Number.isNaN(Date.parse(v))}
function valid(input){return typeof input.task_id==='string'&&input.task_id&&validIso(input.started_at)&&validIso(input.ended_at)&&input.ended_at>=input.started_at&&Number.isInteger(input.actual_minutes)&&input.actual_minutes>=0&&(input.blocker_reason==null||typeof input.blocker_reason==='string')}

export function createWorklogsHandler({createWorkLog=createWorkLogRecord,listWorkLogs=listWorkLogsRecord,listWorkLogsByPlan=listWorkLogsByPlanRecord}={}){
  return async function handler(req,res){
    try{
      if(req.method==='GET'){
        if(req.query?.plan_id) return send(res,200,{work_logs:await listWorkLogsByPlan(String(req.query.plan_id))})
        if(req.query?.task_id) return send(res,200,{work_logs:await listWorkLogs(String(req.query.task_id))})
        return send(res,400,{error:'PLAN_OR_TASK_ID_REQUIRED'})
      }
      if(req.method==='POST'){
        const input={task_id:req.body?.task_id,started_at:req.body?.started_at,ended_at:req.body?.ended_at,actual_minutes:req.body?.actual_minutes,blocker_reason:req.body?.blocker_reason??null}
        if(!valid(input)) return send(res,400,{error:'INVALID_WORK_LOG'})
        const work_log=await createWorkLog(input)
        if(!work_log) return send(res,500,{error:'WORK_LOG_CREATE_FAILED'})
        return send(res,201,{work_log})
      }
      res.setHeader('Allow','GET, POST')
      return send(res,405,{error:'METHOD_NOT_ALLOWED'})
    }catch{return send(res,503,{error:'DATABASE_UNAVAILABLE'})}
  }
}

export default createWorklogsHandler()
