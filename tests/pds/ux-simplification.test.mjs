import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../../pds/index.html', import.meta.url), 'utf8')
const js = await readFile(new URL('../../pds/app.js', import.meta.url), 'utf8')
const css = await readFile(new URL('../../pds/style.css', import.meta.url), 'utf8')

test('DO is a checklist that completes tasks without timer inputs', () => {
  assert.match(html, /id="do-checklist"/)
  assert.doesNotMatch(html, /id="work-start-btn"/)
  assert.doesNotMatch(html, /id="work-stop-btn"/)
  assert.doesNotMatch(html, /id="active-work-timer"/)
  assert.doesNotMatch(html, /id="worklog-form"/)
  assert.match(js, /function renderDoChecklist\(/)
  assert.match(js, /checkbox\.type='checkbox'/)
  assert.match(js, /toggleTask\(t\)/)
  assert.match(css, /\.do-check-item/)
})

test('PLAN task rows are collapsed summaries that reveal detail on demand', () => {
  assert.match(js, /document\.createElement\('details'\)/)
  assert.match(js, /document\.createElement\('summary'\)/)
  assert.match(css, /\.task-summary/)
  assert.match(css, /\.task-detail/)
})

test('cycle dashboard visualizes completion, task states, and automatic cycle progress', () => {
  assert.match(html, /id="cycle-dashboard"/)
  assert.match(html, /id="completion-ring"/)
  assert.match(html, /id="status-progress"/)
  assert.match(html, /id="cycle-progress"/)
  assert.doesNotMatch(html, /id="time-progress"/)
  assert.match(js, /function renderDashboard\(/)
  assert.match(js, /function getCycleProgress\(/)
  assert.match(css, /\.completion-ring/)
  assert.match(css, /\.status-progress/)
  assert.match(css, /\.cycle-progress/)
})
