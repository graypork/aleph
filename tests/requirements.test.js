import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const htmlPromise = readFile(new URL('../play/index.html', import.meta.url), 'utf8')
const playPromise = readFile(new URL('../src/game/play.js', import.meta.url), 'utf8')
const cssPromise = readFile(new URL('../src/game/play.css', import.meta.url), 'utf8')
const storagePromise = readFile(new URL('../src/game/storage.js', import.meta.url), 'utf8')

test('C03-C05 public screen exposes rules, controls, and live-state fields', async () => {
  const html = await htmlPromise
  assert.match(html, /게임 규칙과 조작법/)
  assert.match(html, /<kbd>←<\/kbd><kbd>→<\/kbd>/)
  assert.match(html, /<kbd>↑<\/kbd>/)
  assert.match(html, /<kbd>P<\/kbd>/)
  for (const id of ['time-value','mass-value','entry-value','wind-value','recovery-value','position-status','descent-status','angle-status','fuel-status','fuel-value','game-status']) {
    assert.match(html, new RegExp(`id="${id}"`))
  }
})

test('C06/C12 key listeners are registered once and discrete nudge ignores repeats', async () => {
  const source = await playPromise
  assert.equal((source.match(/addEventListener\('keydown'/g) ?? []).length, 1)
  assert.equal((source.match(/addEventListener\('keyup'/g) ?? []).length, 1)
  assert.match(source, /!event\.repeat\s*&&\s*\(event\.code === 'ArrowLeft' \|\| event\.code === 'ArrowRight'\)/)
})

test('C08/C09 retry goes through resetRun and clears current-run inputs/state', async () => {
  const source = await playPromise
  assert.match(source, /gameState === 'SUCCESS' \|\| gameState === 'CRASHED'\) resetRun\(\{ autoStart: true \}\)/)
  assert.match(source, /elapsed = 0/)
  assert.match(source, /nextWindIndex = 0/)
  assert.match(source, /keys\.left = false/)
  assert.match(source, /keys\.right = false/)
  assert.match(source, /keys\.burn = false/)
})

test('C13-C15 resize-safe state, focus auto-pause, and paused update guard exist', async () => {
  const source = await playPromise
  assert.doesNotMatch(source, /addEventListener\('resize'/)
  assert.match(source, /window\.addEventListener\('blur'/)
  assert.match(source, /setPause\('PAUSED', 'FOCUS'\)/)
  assert.match(source, /if \(gameState !== 'PLAYING'\) return/)
  assert.match(source, /lastFrame = performance\.now\(\)/)
})

test('C16/C17 game uses one persistent RAF loop rather than per-run intervals', async () => {
  const source = await playPromise
  assert.doesNotMatch(source, /setInterval\(/)
  assert.doesNotMatch(source, /setTimeout\(/)
  assert.equal((source.match(/requestAnimationFrame\(frame\)/g) ?? []).length, 2)
})

test('C22-C25 storage has declared defaults, validation, and parse failure fallback', async () => {
  const source = await storagePromise
  assert.match(source, /bestRecoveryQuality: 0/)
  assert.match(source, /successfulRecoveries: 0/)
  assert.match(source, /reducedMotion: false/)
  assert.match(source, /JSON\.parse\(raw\)/)
  assert.match(source, /catch \{\s*return \{ \.\.\.DEFAULT_PERSISTENT_STATE \}/s)
})

test('C26/C27 crash effect is tied to crashed state and reduced-motion disables shake', async () => {
  const css = await cssPromise
  const source = await playPromise
  assert.match(source, /gameState = 'CRASHED'/)
  assert.match(source, /elements\.world\.classList\.add\('is-crashed'\)/)
  assert.match(css, /\.world\.is-crashed:not\(\.reduce-motion\)\s*\{\s*animation:\s*crashShake/s)
  assert.match(css, /body\[data-reduced-motion="true"\] \.world\.is-crashed\s*\{\s*animation:none/s)
})

test('C10/C11 CSS prevents horizontal overflow and result overlay clipping', async () => {
  const css = await cssPromise
  assert.match(css, /body\s*\{[^}]*overflow-x:\s*hidden/s)
  assert.match(css, /\.world\s*\{[^}]*min-height:\s*440px/s)
  assert.match(css, /\.state-overlay\s*\{[^}]*overflow-y:\s*auto/s)
  assert.match(css, /\.state-card\s*\{[^}]*max-height:\s*calc\(100% - 32px\)[^}]*overflow-y:\s*auto/s)
})

import { FIXED_TEST_SCENARIOS } from '../src/game/scenario.js'
import { createPhysicsState, stepPhysics, evaluateLanding, DEFAULT_PHYSICS_CONFIG } from '../src/game/physics.js'

test('C07 a complete fixed scenario can reach SUCCESS within 30 seconds', () => {
  const scenario = FIXED_TEST_SCENARIOS[1]
  const pad = { centerX: 600, width: 180 }
  let state = createPhysicsState({
    mass: scenario.mass,
    entrySpeed: scenario.entrySpeed,
    x: scenario.startX,
    y: 70,
    fuel: 100,
    wind: scenario.initialWind,
  })
  let elapsed = 0
  let windIndex = 0
  while (elapsed < 30 && state.y < DEFAULT_PHYSICS_CONFIG.groundY) {
    while (windIndex < scenario.windSchedule.length && elapsed >= scenario.windSchedule[windIndex].at) {
      state.wind = scenario.windSchedule[windIndex].wind
      windIndex += 1
    }
    state = stepPhysics(state, { left: false, right: false, burn: elapsed >= 6.75 }, 1 / 60)
    elapsed += 1 / 60
  }
  const landing = evaluateLanding(state, pad, 4.0)
  assert.ok(elapsed <= 30)
  assert.equal(landing.success, true)
})
