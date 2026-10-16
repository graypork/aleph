export function calculateMetric(estimatedMinutes,actualMinutes){
  if(!Number.isFinite(estimatedMinutes)||estimatedMinutes<=0||!Number.isFinite(actualMinutes)||actualMinutes<0)throw new Error('INVALID_METRIC_INPUT')
  return Math.round((Math.abs(actualMinutes-estimatedMinutes)/estimatedMinutes*100)*10)/10
}
export function validateObservationDate(recordDate,todaySeoul){return /^\d{4}-\d{2}-\d{2}$/.test(recordDate)&&recordDate<=todaySeoul}
export function canRecordRuleChange(observations,changedAt){
  const rows=[...(observations||[])].sort((a,b)=>a.record_date.localeCompare(b.record_date))
  if(rows.length!==2||rows[0].record_date===rows[1].record_date)return false
  return typeof changedAt==='string'&&changedAt.slice(0,10)>=rows[1].record_date
}
export function canSaveObservation(observations,ruleChange,recordDate){
  const dates=new Set((observations||[]).map(row=>row.record_date))
  const existing=dates.has(recordDate)
  if(!existing&&dates.size>=5)return false
  if(!existing&&dates.size>=2&&!ruleChange)return false
  return true
}
