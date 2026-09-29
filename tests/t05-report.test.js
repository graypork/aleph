import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('T05 public report exposes required A/B chronology and aggregate metrics', async () => {
  const html = await read('handoff/index.html')
  for (const value of [
    '387f21c2243055e3bd825a0059892dda3fd3e43f',
    '6da1129ef98e8b2b2a15556a6057b9768fe16021',
    '2e1c8f82d561775ea538fad3e5e7fb00509f8820',
    '3분 18초',
    '약 4분',
    '160 / 160',
    '10 / 10',
  ]) assert.match(html, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})

test('T05 public report contains all ten frozen check IDs without model or service names', async () => {
  const html = await read('handoff/index.html')
  for (let i = 1; i <= 10; i += 1) {
    assert.match(html, new RegExp(`T05-FIX-${String(i).padStart(2, '0')}`))
  }
  assert.doesNotMatch(html, /GPT|Claude|Gemini|OpenAI|Anthropic/i)
})

test('T05 public report has exactly four verification lines and three judgment lines', async () => {
  const html = await read('handoff/index.html')
  const verification = html.match(/class="exact-lines verification-lines"[\s\S]*?<\/ol>/)?.[0] ?? ''
  const judgment = html.match(/class="exact-lines judgment-lines"[\s\S]*?<\/ol>/)?.[0] ?? ''
  assert.equal((verification.match(/<li>/g) ?? []).length, 4)
  assert.equal((judgment.match(/<li>/g) ?? []).length, 3)
})

test('published handoff preserves exact seven-section document and frozen version id', async () => {
  const handoff = await read('public/t05/T05-A-HANDOFF.md')
  for (const heading of ['## 1. 목표','## 2. 현재 상태','## 3. 실행 명령','## 4. 통과 검사','## 5. 남은 문제','## 6. 다음 행동','## 7. 건드리지 말 것']) {
    assert.match(handoff, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(handoff, /6da1129ef98e8b2b2a15556a6057b9768fe16021/)
})
