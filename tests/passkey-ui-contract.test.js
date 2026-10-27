import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')
const ui = readFileSync(new URL('../src/passkey-area.js', import.meta.url), 'utf8')

const syntheticPrivateTitles = [
  'Bookaive beta checklist',
  'PM portfolio next steps',
  'Weekly reflection',
  'Demo project note',
  'Demo application list',
  'Demo retrospective',
]

test('unauthenticated public HTML contains no private note payload', () => {
  for (const title of syntheticPrivateTitles) assert.equal(index.includes(title), false)
})

test('main mounts a visibly separate passkey private area', () => {
  assert.match(main, /mountPasskeyArea/)
  assert.match(ui, /PRIVATE \/ PASSKEY/)
  assert.match(ui, /공개 소개와 분리/)
})

test('private notes are fetched only after session state and are not embedded in client source', () => {
  for (const title of syntheticPrivateTitles) assert.equal(ui.includes(title), false)
  assert.match(ui, /api\(['"]session['"]\)/)
  assert.match(ui, /api\(['"]private['"]\)/)
})

test('client uses WebAuthn registration and authentication without a password control', () => {
  assert.match(ui, /startRegistration/)
  assert.match(ui, /startAuthentication/)
  assert.doesNotMatch(ui, /type=["']password["']/i)
})

test('client exposes passkey list, delete, add, logout, and cancellation feedback', () => {
  assert.match(ui, /api\(['"]credentials['"]/)
  assert.match(ui, /api\(['"]logout['"]/)
  assert.match(ui, /등록을 취소/)
  assert.match(ui, /패스키 추가/)
})
