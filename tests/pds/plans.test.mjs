import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlansHandler } from '../../api/pds/plans.js'

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

const validPlan = {
  title: 'Bookaive 상기 루프 MVP 완성 및 검증',
  start_date: '2026-10-07',
  end_date: '2026-10-14',
  priority: 'high',
  success_criteria: '상기 규칙에 따라 기록을 선택하고 위젯 노출 및 딥링크 이동을 검증한다.',
  estimated_minutes: 480,
}

test('POST creates a plan with required planning fields', async () => {
  let received
  const handler = createPlansHandler({
    createPlan: async (input) => { received = input; return { id: 'plan-1', ...input } },
  })
  const req = { method: 'POST', body: validPlan, query: {} }
  const res = mockRes()

  await handler(req, res)

  assert.equal(res.statusCode, 201)
  assert.equal(res.body.plan.id, 'plan-1')
  assert.deepEqual(received, validPlan)
})

test('POST rejects missing required fields', async () => {
  const handler = createPlansHandler({ createPlan: async () => { throw new Error('should not run') } })
  const req = { method: 'POST', body: { title: 'incomplete' }, query: {} }
  const res = mockRes()

  await handler(req, res)

  assert.equal(res.statusCode, 400)
  assert.equal(res.body.error, 'INVALID_PLAN')
})

test('GET with id returns current plan and revision history', async () => {
  const handler = createPlansHandler({
    getPlanWithRevisions: async (id) => ({ id, title: 'v2', revisions: [{ title: 'v1' }] }),
  })
  const req = { method: 'GET', query: { id: 'plan-1' } }
  const res = mockRes()

  await handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.plan.title, 'v2')
  assert.equal(res.body.plan.revisions[0].title, 'v1')
})

test('PATCH updates allowed fields and returns revision history', async () => {
  let updated
  const handler = createPlansHandler({
    updatePlan: async (id, patch) => { updated = { id, patch }; return { id, ...validPlan, ...patch } },
    getPlanWithRevisions: async (id) => ({ id, title: '수정된 계획', revisions: [{ title: validPlan.title }] }),
  })
  const req = { method: 'PATCH', query: {}, body: { id: 'plan-1', title: '수정된 계획', estimated_minutes: 540 } }
  const res = mockRes()

  await handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.deepEqual(updated, { id: 'plan-1', patch: { title: '수정된 계획', estimated_minutes: 540 } })
  assert.equal(res.body.plan.revisions[0].title, validPlan.title)
})

test('GET without id lists plans', async () => {
  const handler = createPlansHandler({ listPlans: async () => [{ id: 'plan-1' }] })
  const req = { method: 'GET', query: {} }
  const res = mockRes()

  await handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.plans.length, 1)
})
