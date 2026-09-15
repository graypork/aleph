import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { calculateRecovery } from '../src/game/recovery.js'

const context = {
  pad: { centerX: 600, width: 180 },
  safeLandingSpeed: 4,
  groundY: 330,
  minDescentSpeed: 1.6,
}

const base = {
  mass: 40,
  entrySpeed: 7,
  x: 600,
  y: 320,
  vx: 0,
  vy: 5,
  angle: 0,
  fuel: 50,
  wind: 0,
}

test('default public safe landing speed is 3.5 while difficulty experiment owns its override', async () => {
  const source = await readFile(new URL('../src/game/play.js', import.meta.url), 'utf8')
  const experiment = await readFile(new URL('../src/game/difficulty-test.js', import.meta.url), 'utf8')
  assert.match(source, /DEFAULT_SAFE_LANDING_SPEED\s*=\s*3\.5/)
  assert.doesNotMatch(source, /URLSearchParams|parsedSafeSpeed/)
  assert.match(experiment, /safeSpeed:\s*after \? 4\.0 : 3\.5/)
})

test('descent status is safe, warning, critical around safe speed 4', () => {
  assert.equal(calculateRecovery({ ...base, vy: 4 }, context).status.descent, 'SAFE')
  assert.equal(calculateRecovery({ ...base, vy: 5.5 }, context).status.descent, 'WARNING')
  assert.equal(calculateRecovery({ ...base, vy: 6.7 }, context).status.descent, 'CRITICAL')
})

test('angle status is safe, warning, critical around ±5 degrees', () => {
  assert.equal(calculateRecovery({ ...base, angle: 5 }, context).status.angle, 'SAFE')
  assert.equal(calculateRecovery({ ...base, angle: 8 }, context).status.angle, 'WARNING')
  assert.equal(calculateRecovery({ ...base, angle: 13 }, context).status.angle, 'CRITICAL')
})

test('semantic status colors are green, yellow, and red', async () => {
  const css = await readFile(new URL('../src/game/play.css', import.meta.url), 'utf8')
  assert.match(css, /--safe:\s*#[0-9a-f]{6};/i)
  assert.match(css, /--warning:\s*#[0-9a-f]{6};/i)
  assert.match(css, /--critical:\s*#[0-9a-f]{6};/i)
  assert.match(css, /\.status-safe[^\{]*\{[^}]*color:\s*var\(--safe\)/s)
  assert.match(css, /\.status-warning[^\{]*\{[^}]*color:\s*var\(--warning\)/s)
  assert.match(css, /\.status-critical[^\{]*\{[^}]*color:\s*var\(--critical\)/s)
  assert.match(css, /\.result-safe[^\{]*\{[^}]*color:\s*var\(--safe\)/s)
  assert.match(css, /\.result-warning[^\{]*\{[^}]*color:\s*var\(--warning\)/s)
  assert.match(css, /\.result-critical[^\{]*\{[^}]*color:\s*var\(--critical\)/s)
})

test('landing marker copy is Korean only', async () => {
  const html = await readFile(new URL('../play/index.html', import.meta.url), 'utf8')
  assert.match(html, /<small>예상 착지점<\/small>/)
  assert.doesNotMatch(html, /NO INPUT/i)
})

test('result diagnostics assign semantic classes to descent and angle', async () => {
  const source = await readFile(new URL('../src/game/play.js', import.meta.url), 'utf8')
  assert.match(source, /resultClassForDescent/)
  assert.match(source, /resultClassForAngle/)
  assert.match(source, /class="\$\{resultClassForDescent\(physics\.vy\)\}"/)
  assert.match(source, /class="\$\{resultClassForAngle\(physics\.angle\)\}"/)
})


test('result title uses green class for success and red class for failure', async () => {
  const source = await readFile(new URL('../src/game/play.js', import.meta.url), 'utf8')
  assert.match(source, /stateTitle\.classList\.toggle\('result-title-safe',\s*success\)/)
  assert.match(source, /stateTitle\.classList\.toggle\('result-title-critical',\s*!success\)/)
  assert.match(source, /stateTitle\.classList\.remove\('result-title-safe',\s*'result-title-critical'\)/)
})

test('result title semantic classes map to safe and critical colors', async () => {
  const css = await readFile(new URL('../src/game/play.css', import.meta.url), 'utf8')
  assert.match(css, /\.result-title-safe[^\{]*\{[^}]*color:\s*var\(--safe\)/s)
  assert.match(css, /\.result-title-critical[^\{]*\{[^}]*color:\s*var\(--critical\)/s)
})
