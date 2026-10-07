import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorklogsHandler } from '../../api/pds/worklogs.js'
import { createReviewHandler } from '../../api/pds/review.js'

function mockRes(){return{statusCode:200,headers:{},body:undefined,setHeader(k,v){this.headers[k]=v},status(c){this.statusCode=c;return this},json(b){this.body=b;return this}}}

test('POST work log stores execution fields separately', async()=>{
  let received
  const handler=createWorklogsHandler({createWorkLog:async input=>{received=input;return{id:'log-1',...input}}})
  const body={task_id:'task-1',started_at:'2026-10-07T05:20:00+09:00',ended_at:'2026-10-07T06:05:00+09:00',actual_minutes:45,blocker_reason:'day boundary 확인'}
  const res=mockRes(); await handler({method:'POST',body,query:{}},res)
  assert.equal(res.statusCode,201)
  assert.deepEqual(received,body)
})

test('GET review returns aggregate and saved improvement', async()=>{
  const handler=createReviewHandler({getReview:async()=>({plan_id:'p1',total_tasks:6,completed_tasks:4,delayed_tasks:1,blocked_tasks:2,estimated_minutes:480,actual_minutes:610,time_difference_minutes:130}),getImprovement:async()=>({improvement:'검증 시간을 30% 별도 확보'})})
  const res=mockRes(); await handler({method:'GET',query:{plan_id:'p1'}},res)
  assert.equal(res.statusCode,200)
  assert.equal(res.body.review.overdue_tasks,1)
  assert.equal(res.body.review.improvement,'검증 시간을 30% 별도 확보')
})
