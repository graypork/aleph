import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { countBlockedTasks } from '../../src/pds-server/review-store.js'
import { applyBlockedCountsToReviews } from '../../api/pds/export.js'

const html=await readFile(new URL('../../pds/index.html',import.meta.url),'utf8')
const warning='지금은 로그인이 없어 링크를 아는 사람은 누구나 볼 수 있습니다. 남이 봐도 괜찮은 내용만 넣으세요'

test('submission UI restores work log fields and time comparison',()=>{
  assert.match(html,new RegExp(`>${warning.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}<`))
  assert.match(html,/id="worklog-form"/)
  for(const name of ['task_id','started_at','ended_at','actual_minutes','blocker_reason']) assert.match(html,new RegExp(`name="${name}"`))
  assert.match(html,/id="worklog-list"/)
  assert.match(html,/id="time-metrics"/)
})

test('blocked review count is distinct tasks with blocker work logs',()=>{
  assert.equal(countBlockedTasks([
    {task_id:'a',blocker_reason:'one'},
    {task_id:'a',blocker_reason:'two'},
    {task_id:'b',blocker_reason:'blocked'},
    {task_id:'c',blocker_reason:null},
  ]),2)
})

test('export reviews use the same blocker-worklog definition',()=>{
  const reviews=[{plan_id:'p1',blocked_tasks:0},{plan_id:'p2',blocked_tasks:0}]
  const tasks=[
    {id:'a',plan_id:'p1',deleted_at:null},
    {id:'b',plan_id:'p1',deleted_at:null},
    {id:'c',plan_id:'p2',deleted_at:null},
  ]
  const logs=[
    {task_id:'a',blocker_reason:'one'},
    {task_id:'a',blocker_reason:'two'},
    {task_id:'b',blocker_reason:'blocked'},
    {task_id:'c',blocker_reason:null},
  ]
  assert.deepEqual(applyBlockedCountsToReviews(reviews,tasks,logs).map(r=>r.blocked_tasks),[2,0])
})
