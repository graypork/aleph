import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const html=await readFile(new URL('../../pds/index.html',import.meta.url),'utf8')
const js=await readFile(new URL('../../pds/app.js',import.meta.url),'utf8')
const css=await readFile(new URL('../../pds/style.css',import.meta.url),'utf8')
test('DO keeps four-state checklist and restores explicit work logs without live timer controls',()=>{assert.match(html,/id="do-checklist"/);assert.match(html,/id="worklog-form"/);assert.match(html,/name="started_at"/);assert.match(html,/name="ended_at"/);assert.match(html,/name="actual_minutes"/);assert.match(html,/name="blocker_reason"/);assert.doesNotMatch(html,/id="work-start-btn"/);assert.doesNotMatch(html,/id="work-stop-btn"/);assert.doesNotMatch(html,/id="active-work-timer"/);assert.match(js,/function renderDoChecklist\(/);assert.match(js,/const DO_STATES=/);assert.match(js,/function setDoState\(/);assert.match(js,/function renderWorkLogs\(/);assert.match(css,/\.do-check-item/);assert.match(css,/\.worklog-row/)})
test('PLAN task rows are collapsed summaries that reveal detail on demand',()=>{assert.match(js,/document\.createElement\('details'\)/);assert.match(js,/document\.createElement\('summary'\)/);assert.match(css,/\.task-summary/);assert.match(css,/\.task-detail/)})
test('cycle dashboard stays compact while SEE owns time comparison',()=>{assert.match(html,/id="cycle-dashboard"/);assert.match(html,/id="completion-ring"/);assert.match(html,/id="status-progress"/);assert.match(html,/id="cycle-progress"/);assert.match(html,/id="time-metrics"/);assert.match(js,/function renderDashboard\(/);assert.match(js,/function getCycleProgress\(/);assert.match(css,/\.time-metrics/)})
