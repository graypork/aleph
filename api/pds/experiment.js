import { requireAuthenticatedUser } from '../../src/pds-server/auth.js'
import { calculateMetric, validateObservationDate, canRecordRuleChange, canSaveObservation } from '../../src/pds-server/experiment-rules.js'
import { getExperiment as getExperimentRecord, createExperiment as createExperimentRecord, listObservations as listObservationsRecord, upsertObservation as upsertObservationRecord, getRuleChange as getRuleChangeRecord, createRuleChange as createRuleChangeRecord, INITIAL_EXPERIMENT } from '../../src/pds-server/experiment-store.js'

function send(res,status,body){res.setHeader('Cache-Control','no-store');return res.status(status).json(body)}
export function seoulDate(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
function summary(observations){const values=observations.map(o=>Number(o.metric_value));const sum=Math.round(values.reduce((a,b)=>a+b,0)*10)/10;const average=values.length?Math.round(sum/values.length*10)/10:0;return{count:values.length,sum,average}}

export function createExperimentHandler({authenticate=async()=>({user:{id:'test-user'},accessToken:'test-token'}),getExperiment=getExperimentRecord,createExperiment=createExperimentRecord,listObservations=listObservationsRecord,upsertObservation=upsertObservationRecord,getRuleChange=getRuleChangeRecord,createRuleChange=createRuleChangeRecord,now=()=>new Date()}={}){
  return async function handler(req,res){
    try{
      const {user,accessToken}=await authenticate(req)
      let experiment=await getExperiment(accessToken)
      if(!experiment)experiment=await createExperiment(user.id,accessToken)
      const observations=await listObservations(experiment.id,accessToken)
      const rule_change=await getRuleChange(experiment.id,accessToken)
      if(req.method==='GET')return send(res,200,{experiment,observations,rule_change,summary:summary(observations),initial:INITIAL_EXPERIMENT})
      if(req.method==='POST'&&req.body?.action==='observation'){
        const record_date=String(req.body?.record_date||'')
        const estimated=Number(req.body?.estimated_minutes),actual=Number(req.body?.actual_minutes)
        if(!validateObservationDate(record_date,seoulDate(now())))return send(res,400,{error:'INVALID_OBSERVATION_DATE'})
        if(!canSaveObservation(observations,rule_change,record_date))return send(res,409,{error:observations.length>=5?'FIVE_DAYS_COMPLETE':'RULE_CHANGE_REQUIRED'})
        let metric_value;try{metric_value=calculateMetric(estimated,actual)}catch{return send(res,400,{error:'INVALID_OBSERVATION'})}
        const observation=await upsertObservation({experiment_id:experiment.id,record_date,estimated_minutes:estimated,actual_minutes:actual,metric_value,note:typeof req.body?.note==='string'?req.body.note.trim():null},accessToken)
        return send(res,200,{observation})
      }
      if(req.method==='POST'&&req.body?.action==='rule_change'){
        const sorted=[...observations].sort((a,b)=>a.record_date.localeCompare(b.record_date))
        const changedAt=now().toISOString()
        if(!canRecordRuleChange(sorted,changedAt)||rule_change)return send(res,409,{error:'RULE_CHANGE_NOT_ALLOWED'})
        const reason=String(req.body?.reason||'').trim();if(!reason)return send(res,400,{error:'RULE_CHANGE_REASON_REQUIRED'})
        const change=await createRuleChange({experiment_id:experiment.id,changed_at:changedAt,before_rule:experiment.original_planning_rule,after_rule:'검증이 필요한 작업은 구현 예상시간에 검증시간 30%를 별도로 추가한다.',reason,day1_observation_id:sorted[0].id,day2_observation_id:sorted[1].id},accessToken)
        return send(res,201,{rule_change:change})
      }
      res.setHeader('Allow','GET, POST');return send(res,405,{error:'METHOD_NOT_ALLOWED'})
    }catch(error){if(error?.statusCode===401)return send(res,401,{error:'AUTH_REQUIRED'});return send(res,503,{error:'DATABASE_UNAVAILABLE'})}
  }
}
export default createExperimentHandler({authenticate:requireAuthenticatedUser})
