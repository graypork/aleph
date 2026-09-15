import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TEMPLATE_STORAGE_KEY,
  loadTemplateStore,
  saveTemplateStore,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  findTemplate,
} from '../src/studio/templates.js'

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed))
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null },
    setItem(key, value) { data.set(key, String(value)) },
    removeItem(key) { data.delete(key) },
  }
}

const draft = (aspect = '1:1', content = '문구') => ({
  aspect,
  text: { content, x: 50, y: 72, size: 72, color: '#ffffff' },
})

test('creates at least three templates with stable ids and loads by id', () => {
  let store = { version: 1, templates: [] }
  const ids = ['tpl_a', 'tpl_b', 'tpl_c']
  let i = 0
  store = createTemplate(store, draft('1:1', 'A'), 'A', '2026-09-15T00:00:00.000Z', () => ids[i++])
  store = createTemplate(store, draft('4:5', 'B'), 'B', '2026-09-15T00:00:01.000Z', () => ids[i++])
  store = createTemplate(store, draft('9:16', 'C'), 'C', '2026-09-15T00:00:02.000Z', () => ids[i++])
  assert.equal(store.templates.length, 3)
  assert.deepEqual(store.templates.map(item => item.id), ids)
  assert.equal(findTemplate(store, 'tpl_b').text.content, 'B')
})

test('updates by stable id even after array order changes', () => {
  const store = {
    version: 1,
    templates: [
      { id: 'tpl_b', name: 'B', ...draft('4:5', 'old B'), createdAt: 'old', updatedAt: 'old' },
      { id: 'tpl_a', name: 'A', ...draft('1:1', 'A'), createdAt: 'old', updatedAt: 'old' },
    ],
  }
  const updated = updateTemplate(store, 'tpl_b', draft('9:16', 'new B'), '2026-09-15T01:00:00.000Z', 'B2')
  assert.equal(updated.templates[0].id, 'tpl_b')
  assert.equal(updated.templates[0].text.content, 'new B')
  assert.equal(updated.templates[0].name, 'B2')
  assert.equal(updated.templates[1].text.content, 'A')
})

test('delete removes only the selected stable id', () => {
  const store = { version: 1, templates: [
    { id: 'tpl_a', name: 'A', ...draft(), createdAt: 'x', updatedAt: 'x' },
    { id: 'tpl_b', name: 'B', ...draft(), createdAt: 'x', updatedAt: 'x' },
  ] }
  const next = deleteTemplate(store, 'tpl_a')
  assert.deepEqual(next.templates.map(item => item.id), ['tpl_b'])
})

test('saved template mutations survive reload-equivalent storage reads', () => {
  const storage = memoryStorage()
  const store = createTemplate({ version: 1, templates: [] }, draft(), '첫 템플릿', 'now', () => 'tpl_keep')
  saveTemplateStore(storage, store)
  const loaded = loadTemplateStore(storage)
  assert.equal(loaded.templates.length, 1)
  assert.equal(loaded.templates[0].id, 'tpl_keep')
  assert.equal(JSON.parse(storage.getItem(TEMPLATE_STORAGE_KEY)).templates[0].name, '첫 템플릿')
})

test('corrupt localStorage falls back to an empty valid collection', () => {
  const storage = memoryStorage({ [TEMPLATE_STORAGE_KEY]: '{broken' })
  assert.deepEqual(loadTemplateStore(storage), { version: 1, templates: [] })
})

test('parseable but schema-corrupt persisted templates fall back to an empty valid collection', () => {
  const corrupt = {
    version: 1,
    templates: [{
      id: 'tpl_bad',
      name: 'bad',
      aspect: '1:1',
      text: { content: 'x', x: -20, y: 72, size: 72, color: '#ffffff' },
      createdAt: 'x',
      updatedAt: 'x',
    }],
  }
  const storage = memoryStorage({ [TEMPLATE_STORAGE_KEY]: JSON.stringify(corrupt) })
  assert.deepEqual(loadTemplateStore(storage), { version: 1, templates: [] })
})
