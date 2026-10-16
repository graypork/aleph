import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('T07 contract fixes auth, ownership, session and five-day rules',async()=>{
  const c=JSON.parse(await readFile(new URL('../../contracts/pds-schema-v3.json',import.meta.url),'utf8'))
  assert.equal(c.version,3)
  assert.equal(c.auth.provider,'Supabase Auth')
  assert.equal(c.auth.password_hashing,'bcrypt')
  assert.equal(c.tables.plans.ownership,'owner_id = auth.uid()')
  assert.deepEqual(c.tables.pds_daily_observations.unique,['experiment_id','record_date'])
  assert.equal(c.experiment.max_days,5)
  assert.equal(c.experiment.rule_change_position,'after Day 2 and before Day 3')
})

test('migration documents session-active RLS and removes anon experiment access',async()=>{
  const s=await readFile(new URL('../../pds/migrations/002_t07_auth_and_experiment.sql',import.meta.url),'utf8')
  assert.match(s,/auth\.sessions/)
  assert.match(s,/auth\.jwt\(\) ->> 'session_id'/)
  assert.match(s,/security_invoker=true/i)
  assert.match(s,/revoke all on table public\.pds_experiments, public\.pds_daily_observations, public\.pds_rule_changes from anon/i)
})
