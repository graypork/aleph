import test from 'node:test'
import assert from 'node:assert/strict'
import { validateTemplateStore } from '../src/studio/template-schema.js'
import { serializeTemplateStore, parseTemplateImport } from '../src/studio/json-transfer.js'

const validTemplate = (overrides = {}) => ({
  id: 'tpl_valid',
  name: '카드',
  aspect: '4:5',
  text: { content: '문구', x: 50, y: 72, size: 72, color: '#ffffff' },
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
  ...overrides,
})

const validStore = () => ({ version: 1, templates: [validTemplate()] })

test('valid JSON round-trip restores the same template store', () => {
  const serialized = serializeTemplateStore(validStore())
  const parsed = parseTemplateImport(serialized)
  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.value, validStore())
})

test('malformed JSON is rejected as syntax before any caller mutation', () => {
  const previous = validStore()
  const snapshot = structuredClone(previous)
  const result = parseTemplateImport('{bad')
  assert.deepEqual(result, {
    ok: false,
    type: 'syntax',
    message: 'JSON 문법이 올바르지 않습니다. 기존 템플릿은 유지됩니다.',
  })
  assert.deepEqual(previous, snapshot)
})

test('missing required fields are rejected as schema errors', () => {
  const value = validStore()
  delete value.templates[0].text.color
  const result = validateTemplateStore(value)
  assert.equal(result.ok, false)
  assert.match(result.error, /형식/)
})

test('invalid aspect, color and numeric ranges are rejected', () => {
  for (const template of [
    validTemplate({ aspect: '2:3' }),
    validTemplate({ text: { content: 'x', x: 50, y: 50, size: 72, color: 'white' } }),
    validTemplate({ text: { content: 'x', x: -1, y: 50, size: 72, color: '#ffffff' } }),
    validTemplate({ text: { content: 'x', x: 50, y: 101, size: 72, color: '#ffffff' } }),
    validTemplate({ text: { content: 'x', x: 50, y: 50, size: 181, color: '#ffffff' } }),
  ]) {
    assert.equal(validateTemplateStore({ version: 1, templates: [template] }).ok, false)
  }
})

test('schema-invalid JSON returns the declared message and does not produce a value', () => {
  const result = parseTemplateImport(JSON.stringify({ version: 1, templates: [{ id: 'x' }] }))
  assert.deepEqual(result, {
    ok: false,
    type: 'schema',
    message: '필수 항목이 빠졌거나 형식이 올바르지 않습니다. 기존 템플릿은 유지됩니다.',
  })
})
