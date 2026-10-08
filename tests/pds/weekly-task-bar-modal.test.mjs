import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../../pds/index.html', import.meta.url), 'utf8')
const js = await readFile(new URL('../../pds/weekly-bars.js', import.meta.url), 'utf8')
const css = await readFile(new URL('../../pds/weekly-bars.css', import.meta.url), 'utf8')

test('PDS loads the weekly bar interaction module', () => {
  assert.match(html, /weekly-bars\.js/)
})

test('weekly schedule renders one continuous clickable bar with the task title', () => {
  assert.match(js, /weekly-task-bar/)
  assert.match(js, /weekly-task-bar-title/)
  assert.match(js, /title\.textContent=task\.title/)
  assert.match(js, /bar\.style\.gridColumn/)
  assert.match(js, /openTaskModal\(task\)/)
})

test('weekly task bars use priority colors independent from execution state', () => {
  assert.match(js, /high:'priority-high'/)
  assert.match(js, /medium:'priority-medium'/)
  assert.match(js, /low:'priority-low'/)
  assert.match(js, /priority-default/)
  assert.match(css, /\.weekly-task-bar\.priority-high/)
  assert.match(css, /\.weekly-task-bar\.priority-medium/)
  assert.match(css, /\.weekly-task-bar\.priority-low/)
  assert.match(css, /\.weekly-task-bar\.priority-default/)
})

test('weekly task bar exposes hover detail and keyboard-accessible task context', () => {
  assert.match(js, /bar\.title=/)
  assert.match(js, /aria-label/)
  assert.match(css, /\.weekly-task-bar:hover/)
  assert.match(css, /\.weekly-task-bar:focus-visible/)
})

test('clicking a weekly task bar opens a CURRENT PLAN and EXECUTION TASKS modal', () => {
  assert.match(js, /CURRENT PLAN/)
  assert.match(js, /EXECUTION TASKS/)
  assert.match(js, /id="modal-current-plan"/)
  assert.match(js, /id="modal-task-form"/)
  assert.match(js, /function openTaskModal\(/)
  assert.match(js, /showModal\(\)/)
})

test('task modal edits the selected task and refreshes existing PDS screens after save', () => {
  assert.match(js, /name="start_date"/)
  assert.match(js, /name="due_date"/)
  assert.match(js, /name="priority"/)
  assert.match(js, /name="blocker_reason"/)
  assert.match(js, /method:'PATCH'/)
  assert.match(js, /dispatchEvent\(new Event\('change'/)
  assert.match(js, /task-modal-close/)
  assert.match(css, /\.task-modal/)
})
