import { userSupabaseRequest } from './supabase.js'

export const INITIAL_EXPERIMENT={
  question:'계획한 작업시간과 실제 작업시간의 차이를 줄일 수 있는가?',
  metric_name:'계획 대비 실제 작업시간 오차율',
  unit:'%',
  calculation_rule:'abs(actual_minutes - estimated_minutes) / estimated_minutes * 100',
  missing_value_rule:'유효한 예상/실제 쌍이 없으면 해당 날짜는 미완료로 두고 집계에서 제외한다.',
  duplicate_value_rule:'같은 날짜는 한 건만 집계하며 다시 저장하면 해당 날짜의 기존 값을 갱신한다.',
  outlier_rule:'유난히 큰 값도 원값을 유지하고 note에 이유를 기록한다.',
  rounding_rule:'전체 정밀도로 계산한 뒤 소수점 첫째 자리로 반올림한다.',
  week_start_day:'Monday',
  original_planning_rule:'예상시간은 구현에 직접 필요한 시간만 기준으로 잡는다.',
}
const json=response=>response.json()
export async function getExperiment(accessToken){const rows=await json(await userSupabaseRequest('pds_experiments?select=*&limit=1',accessToken));return rows[0]||null}
export async function createExperiment(ownerId,accessToken){const rows=await json(await userSupabaseRequest('pds_experiments?select=*',accessToken,{method:'POST',body:{owner_id:ownerId,...INITIAL_EXPERIMENT},headers:{Prefer:'return=representation'}}));return rows[0]||null}
export async function listObservations(experimentId,accessToken){return json(await userSupabaseRequest(`pds_daily_observations?experiment_id=eq.${encodeURIComponent(experimentId)}&select=*&order=record_date.asc`,accessToken))}
export async function upsertObservation(input,accessToken){const rows=await json(await userSupabaseRequest('pds_daily_observations?on_conflict=experiment_id,record_date&select=*',accessToken,{method:'POST',body:input,headers:{Prefer:'resolution=merge-duplicates,return=representation'}}));return rows[0]||null}
export async function getRuleChange(experimentId,accessToken){const rows=await json(await userSupabaseRequest(`pds_rule_changes?experiment_id=eq.${encodeURIComponent(experimentId)}&select=*&limit=1`,accessToken));return rows[0]||null}
export async function createRuleChange(input,accessToken){const rows=await json(await userSupabaseRequest('pds_rule_changes?select=*',accessToken,{method:'POST',body:input,headers:{Prefer:'return=representation'}}));return rows[0]||null}
