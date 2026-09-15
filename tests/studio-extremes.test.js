import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const path = new URL('../evidence/card-studio-extreme-inputs.md', import.meta.url)

test('extreme-input evidence contains exactly 12 numbered cases covering required categories', async () => {
  const md = await readFile(path, 'utf8')
  const numbered = [...md.matchAll(/^\|\s*(\d+)\s*\|/gm)].map(match => Number(match[1]))
  assert.deepEqual(numbered, [1,2,3,4,5,6,7,8,9,10,11,12])
  for (const phrase of ['긴 한글', '긴 영문', '한글·영문 혼합', '명시적 줄바꿈', '이모지', '빈 문구', '특수문자', '긴 무공백', '세로 JPEG', '가로 JPEG', '투명 PNG', 'text/plain']) {
    assert.match(md, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('same long-token case records FAIL before and PASS after the wrapping fix', async () => {
  const md = await readFile(path, 'utf8')
  assert.match(md, /긴 무공백[^\n]*FAIL \(수정 전\)/)
  assert.match(md, /긴 무공백[^\n]*PASS \(수정 후\)/)
})
