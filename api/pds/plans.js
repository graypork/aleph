import {
  createPlan as createPlanRecord,
  getPlanWithRevisions as getPlanWithRevisionsRecord,
  listPlans as listPlansRecord,
  updatePlan as updatePlanRecord,
} from './plan-store.js'

const PRIORITIES = new Set(['low', 'medium', 'high'])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const PLAN_FIELDS = [
  'title',
  'start_date',
  'end_date',
  'priority',
  'success_criteria',
  'estimated_minutes',
]

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json(body)
}

function pickPlanFields(input = {}) {
  return Object.fromEntries(
    PLAN_FIELDS
      .filter((key) => Object.prototype.hasOwnProperty.call(input, key))
      .map((key) => [key, input[key]]),
  )
}

function isValidDate(value) {
  return typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function validatePlan(input, { partial = false } = {}) {
  const required = ['title', 'start_date', 'end_date', 'priority', 'success_criteria', 'estimated_minutes']
  if (!partial && required.some((key) => !Object.prototype.hasOwnProperty.call(input, key))) return false
  if (partial && Object.keys(input).length === 0) return false

  if (Object.prototype.hasOwnProperty.call(input, 'title') &&
      (typeof input.title !== 'string' || input.title.trim() === '')) return false
  if (Object.prototype.hasOwnProperty.call(input, 'success_criteria') &&
      (typeof input.success_criteria !== 'string' || input.success_criteria.trim() === '')) return false
  if (Object.prototype.hasOwnProperty.call(input, 'priority') && !PRIORITIES.has(input.priority)) return false
  if (Object.prototype.hasOwnProperty.call(input, 'start_date') && !isValidDate(input.start_date)) return false
  if (Object.prototype.hasOwnProperty.call(input, 'end_date') && !isValidDate(input.end_date)) return false
  if (Object.prototype.hasOwnProperty.call(input, 'estimated_minutes') &&
      (!Number.isInteger(input.estimated_minutes) || input.estimated_minutes < 0)) return false
  if (input.start_date && input.end_date && input.end_date < input.start_date) return false

  return true
}

export function createPlansHandler({
  listPlans = listPlansRecord,
  createPlan = createPlanRecord,
  updatePlan = updatePlanRecord,
  getPlanWithRevisions = getPlanWithRevisionsRecord,
} = {}) {
  return async function handler(req, res) {
    try {
      if (req.method === 'GET') {
        const id = req.query?.id
        if (id) {
          const plan = await getPlanWithRevisions(String(id))
          if (!plan) return send(res, 404, { error: 'PLAN_NOT_FOUND' })
          return send(res, 200, { plan })
        }
        return send(res, 200, { plans: await listPlans() })
      }

      if (req.method === 'POST') {
        const input = pickPlanFields(req.body)
        if (!validatePlan(input)) return send(res, 400, { error: 'INVALID_PLAN' })
        const plan = await createPlan(input)
        if (!plan) return send(res, 500, { error: 'PLAN_CREATE_FAILED' })
        return send(res, 201, { plan })
      }

      if (req.method === 'PATCH') {
        const id = req.body?.id
        if (typeof id !== 'string' || id.trim() === '') {
          return send(res, 400, { error: 'INVALID_PLAN_ID' })
        }

        const patch = pickPlanFields(req.body)
        if (!validatePlan(patch, { partial: true })) {
          return send(res, 400, { error: 'INVALID_PLAN' })
        }

        const updated = await updatePlan(id, patch)
        if (!updated) return send(res, 404, { error: 'PLAN_NOT_FOUND' })
        const plan = await getPlanWithRevisions(id)
        return send(res, 200, { plan: plan || { ...updated, revisions: [] } })
      }

      res.setHeader('Allow', 'GET, POST, PATCH')
      return send(res, 405, { error: 'METHOD_NOT_ALLOWED' })
    } catch {
      return send(res, 503, { error: 'DATABASE_UNAVAILABLE' })
    }
  }
}

export default createPlansHandler()
