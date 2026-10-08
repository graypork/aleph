import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../../pds/index.html', import.meta.url), 'utf8')
const js = await readFile(new URL('../../pds/app.js', import.meta.url), 'utf8')
const css = await readFile(new URL('../../pds/style.css', import.meta.url), 'utf8')

test('weekly schedule renders one continuous clickable bar with the task title', () => {
  assert.match(js, /weekly-task-bar/)
  assert.match(js, /weekly-task-bar-title/)
  assert.match(js, /task\.title/)
  assert.match(js, /gridColumn/)
  assert.match(js, /openTaskModal\(task\)/)
  assert.match(css, /\.weekly-task-bar/)
})

test('weekly task bars use priority colors independent from execution state', () => {
  assert.match(js, /priority-high/)
  assert.match(js, /priority-medium/)
  assert.match(js, /priority-low/)
  assert.match(js, /priority-default/)
  assert.match(css, /\.weekly-task-bar\.priority-high/)
  assert.match(css, /\.weekly-task-bar\.priority-medium/)
  assert.match(css, /\.weekly-task-bar\.priority-low/)
  assert.match(css, /\.weekly-task-bar\.priority-default/)
})

test('weekly task bar exposes hover detail and keyboard-accessible task context', () => {
  assert.match(js, /bar\.title\s*=/)
  assert.match(js, /aria-label/)
  assert.match(css, /\.weekly-task-bar:hover/)
  assert.match(css, /\.weekly-task-bar:focus-visible/)
})

test('clicking a weekly task bar opens a modal with CURRENT PLAN and EXECUTION TASKS', () => {
  assert.match(html, /<dialog[^>]+id="task-modal"/)
  assert.match(html, /CURRENT PLAN/)
  assert.match(html, /EXECUTION TASKS/)
  assert.match(html, /id="modal-current-plan"/)
  assert.match(html, /id="modal-task-form"/)
  assert.match(js, /function openTaskModal\(/)
  assert.match(js, /showModal\(\)/)
})

test('task modal edits the selected task and refreshes schedule data after save', () => {
  assert.match(html, /name="start_date"/)
  assert.match(html, /name="due_date"/)
  assert.match(html, /name="priority"/)
  assert.match(html, /name="blocker_reason"/)
  assert.match(js, /modal-task-form/)
  assert.match(js, /method:'PATCH'/)
  assert.match(js, /loadTasks\(\)/)
  assert.match(js, /task-modal-close/)
  assert.match(css, /\.task-modal/)
})
