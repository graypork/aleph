import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('board entry exposes live value context, daily history, and refresh action in public markup', async () => {
  const html = await read('board/index.html')
  for (const id of [
    'live-value','live-unit','live-status-badge','live-delta','source-link','source-time','fetched-time','timezone',
    'refresh-live','evidence-progress','daily-history','raw-value','stored-value','display-value',
  ]) assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`)
  assert.match(html, /Open-Meteo/)
  assert.match(html, /Asia\/Seoul/)
  assert.doesNotMatch(html, /로그인|회원가입|OAuth|CAPTCHA|password/i)
})

test('Failure Lab is visibly synthetic and exposes all five distinct failure controls plus retry', async () => {
  const html = await read('board/index.html')
  assert.match(html, /SYNTHETIC TEST DATA/)
  for (const id of ['failure-timeout','failure-auth','failure-rate','failure-offline','failure-schema','replay-retry','replay-reset']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`)
  }
  for (const id of ['synthetic-value','synthetic-freshness','synthetic-error','synthetic-row-count','synthetic-message']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`)
  }
})

test('vite registers board and home navigation links Assignment 04 without removing 02/03', async () => {
  const config = await read('vite.config.js')
  const nav = await read('src/assignment-link.js')
  assert.match(config, /board\s*:\s*resolve\(root,\s*['"]board\/index\.html['"]\)/)
  assert.match(nav, /ASSIGNMENT 02/)
  assert.match(nav, /ASSIGNMENT 03/)
  assert.match(nav, /ASSIGNMENT 04/)
  assert.match(nav, /href\s*=\s*['"]\/board\/['"]/)
})
