import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../../pds/index.html', import.meta.url), 'utf8')
const js = await readFile(new URL('../../pds/app.js', import.meta.url), 'utf8')
const css = await readFile(new URL('../../pds/style.css', import.meta.url), 'utf8')

test('PLAN, DO, SEE are mutually exclusive focused screens', () => {
  assert.match(html, /data-stage-screen="plan"/)
  assert.match(html, /data-stage-screen="do"/)
  assert.match(html, /data-stage-screen="see"/)
  assert.match(js, /function setActiveStage\(/)
  assert.match(js, /screen\.hidden=screen\.dataset\.stageScreen!==stage/)
})

test('stage navigation exposes selected state and supports direct stage switching', () => {
  assert.match(html, /data-stage-tab="plan"/)
  assert.match(html, /data-stage-tab="do"/)
  assert.match(html, /data-stage-tab="see"/)
  assert.match(js, /aria-selected/)
})

test('desktop screens use a bounded workspace instead of one continuous page', () => {
  assert.match(css, /\.stage-screen\{[^}]*min-height:calc\(100vh -/s)
  assert.match(css, /\.stage-screen\[hidden\]\{display:none!important\}/)
  assert.match(css, /\.workspace-grid/)
})
