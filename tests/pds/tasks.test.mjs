import test from 'node:test'
import assert from 'node:assert/strict'
import { createTasksHandler, sortTasks } from '../../api/pds/tasks.js'

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

test('sortTasks is deterministic: due date, priority, created_at, id', () => {
  const tasks = [
    { id: 'b', due_date: '2026-10-10', priority: 'low', created_at: '2026-10-01T00:00:00Z' },
    { id: 'a', due_date: '2026-10-10', priority: 'high', created_at: '2026-10-02T00:00:00Z' },
    { id: 'c', due_date: '2026-10-09', priority: 'medium', created_at: '2026-10-03T00:00:00Z' },
  ]
  assert.deepEqual(sortTasks(tasks).map((t) => t.id), ['c', 'a', 'b'])
})

test('PATCH complete uses idempotency key exactly once through completion function', async () => {
  let call
  const handler = createTasksHandler({
    completeTask: async (id, key) => { call = { id, key }; return true },
    getTask: async (id) => ({ id, status: 'done' }),
  })
  const req = { method: 'PATCH', body: { id: 'task-1', action: 'complete', idempotency_key: 'complete-task-1' }, query: {} }
  const res = mockRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(call, { id: 'task-1', key: 'complete-task-1' })
  assert.equal(res.body.task.status, 'done')
})

test('PATCH reopen calls reopen function', async () => {
  let called = false
  const handler = createTasksHandler({
    reopenTask: async () => { called = true; return true },
    getTask: async (id) => ({ id, status: 'todo' }),
  })
  const req = { method: 'PATCH', body: { id: 'task-1', action: 'reopen' }, query: {} }
  const res = mockRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(called, true)
  assert.equal(res.body.task.status, 'todo')
})

test('GET filters search/status/priority/tag', async () => {
  const handler = createTasksHandler({
    listTasks: async () => [
      { id: '1', title: 'Widget 검증', description: '', status: 'todo', priority: 'high', tags: ['widget'], due_date: '2026-10-10', created_at: '2026-10-01T00:00:00Z' },
      { id: '2', title: '배포 검증', description: '', status: 'done', priority: 'medium', tags: ['release'], due_date: '2026-10-09', created_at: '2026-10-01T00:00:00Z' },
    ],
  })
  const req = { method: 'GET', query: { plan_id: 'plan-1', q: 'Widget', status: 'todo', priority: 'high', tag: 'widget' } }
  const res = mockRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.tasks.map((t) => t.id), ['1'])
})
