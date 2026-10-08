import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../../pds/index.html', import.meta.url), 'utf8')
const js = await readFile(new URL('../../pds/app.js', import.meta.url), 'utf8')
const css = await readFile(new URL('../../pds/style.css', import.meta.url), 'utf8')

test('PLAN exposes task date range inputs and a weekly schedule', () => {
  assert.match(html, /name="start_date" type="date"/)
  assert.match(html, /id="weekly-table"/)
  assert.match(js, /function renderWeeklyTable\(/)
  assert.match(js, /task\.start_date/)
  assert.match(css, /\.weekly-table/)
})

test('DO exposes four explicit execution states', () => {
  assert.match(js, /const DO_STATES=/)
  assert.match(js, /done:\{symbol:'V'/)
  assert.match(js, /doing:\{symbol:'△'/)
  assert.match(js, /blocked:\{symbol:'X'/)
  assert.match(js, /todo:\{symbol:'-'/)
  assert.match(js, /function setDoState\(/)
})

test('blocked state has an editable blocker reason in DO and PLAN details', () => {
  assert.match(js, /blocker_reason/)
  assert.match(js, /function saveBlockerReason\(/)
  assert.match(js, /blocker-editor/)
  assert.match(js, /blocked-reason/)
})

test('task dates and execution state are sent through the task API', () => {
  assert.match(js, /start_date:f\.elements\.start_date\.value/)
  assert.match(js, /status/)
  assert.match(js, /blocker_reason/)
})
