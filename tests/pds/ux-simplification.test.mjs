import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../../pds/index.html', import.meta.url), 'utf8')
const js = await readFile(new URL('../../pds/app.js', import.meta.url), 'utf8')
const css = await readFile(new URL('../../pds/style.css', import.meta.url), 'utf8')

test('DO defaults to a start/stop timer flow instead of four required manual fields', () => {
  assert.match(html, /id="work-start-btn"/)
  assert.match(html, /id="work-stop-btn"/)
  assert.match(html, /id="active-work-timer"/)
  assert.match(js, /function startActiveWork\(/)
  assert.match(js, /function finishActiveWork\(/)
  assert.match(js, /actual_minutes:Math\.max\(1,Math\.round\(\(endedAt-startedAt\)\/60000\)\)/)
})

test('PLAN task rows are collapsed summaries that reveal detail on demand', () => {
  assert.match(js, /document\.createElement\('details'\)/)
  assert.match(js, /document\.createElement\('summary'\)/)
  assert.match(css, /\.task-summary/)
  assert.match(css, /\.task-detail/)
})

test('cycle dashboard visualizes completion, task states, and time usage', () => {
  assert.match(html, /id="cycle-dashboard"/)
  assert.match(html, /id="completion-ring"/)
  assert.match(html, /id="status-progress"/)
  assert.match(html, /id="time-progress"/)
  assert.match(js, /function renderDashboard\(/)
  assert.match(css, /\.completion-ring/)
  assert.match(css, /\.status-progress/)
  assert.match(css, /\.time-progress/)
})
