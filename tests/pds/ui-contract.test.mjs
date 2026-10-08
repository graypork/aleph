import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../../pds/index.html', import.meta.url), 'utf8')
const js = await readFile(new URL('../../pds/app.js', import.meta.url), 'utf8')
const css = await readFile(new URL('../../pds/style.css', import.meta.url), 'utf8')

test('primary journey is PLAN → DO → SEE and tasks live inside PLAN workspace', () => {
  const jumps = [...html.matchAll(/data-jump="([^"]+)"/g)].map((m) => m[1])
  assert.deepEqual(jumps, ['plan', 'do', 'see'])
  assert.match(html, /id="tasks" class="workspace-block"/)
})

test('current plan overview exposes a visual progress dashboard near the top', () => {
  assert.match(html, /id="cycle-dashboard"/)
  assert.match(html, /id="completion-ring"/)
  assert.match(html, /id="status-progress"/)
  assert.match(html, /id="cycle-progress"/)
  assert.match(js, /function renderDashboard\(/)
  assert.match(js, /function getCycleProgress\(/)
})

test('task editing reuses the task form instead of browser prompts', () => {
  assert.match(html, /name="id" type="hidden"/)
  assert.doesNotMatch(js, /\bprompt\s*\(/)
  assert.match(js, /function beginTaskEdit\(/)
})

test('keyboard focus and reduced motion remain explicit', () => {
  assert.match(css, /:focus-visible/)
  assert.match(css, /prefers-reduced-motion/)
})
