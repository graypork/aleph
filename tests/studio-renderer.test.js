import test from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultStudioState } from '../src/studio/state.js'
import { getAspectDimensions, computeCoverRect, wrapText } from '../src/studio/renderer.js'

test('default studio state is serializable and uses declared text defaults', () => {
  const state = createDefaultStudioState()
  assert.deepEqual(state, {
    aspect: '1:1',
    text: { content: '오늘의 한 줄', x: 50, y: 72, size: 72, color: '#ffffff' },
    image: { source: null, fileName: '', mimeType: '' },
  })
  assert.doesNotThrow(() => JSON.stringify(state))
})

test('all aspect ratios resolve to exact export dimensions', () => {
  assert.deepEqual(getAspectDimensions('1:1'), { width: 1080, height: 1080 })
  assert.deepEqual(getAspectDimensions('4:5'), { width: 1080, height: 1350 })
  assert.deepEqual(getAspectDimensions('9:16'), { width: 1080, height: 1920 })
  assert.throws(() => getAspectDimensions('2:3'), /지원하지 않는 화면비/)
})

test('cover geometry center-crops without distorting source aspect ratio', () => {
  assert.deepEqual(computeCoverRect(2000, 1000, 1080, 1080), { x: -540, y: 0, width: 2160, height: 1080 })
  assert.deepEqual(computeCoverRect(1000, 2000, 1080, 1080), { x: 0, y: -540, width: 1080, height: 2160 })
})

test('wrapText honors explicit line breaks', () => {
  const ctx = { measureText: value => ({ width: Array.from(value).length * 10 }) }
  assert.deepEqual(wrapText(ctx, '첫 줄\n둘째 줄', 500), ['첫 줄', '둘째 줄'])
})

test('wrapText splits an unbroken token at character level instead of overflowing', () => {
  const ctx = { measureText: value => ({ width: Array.from(value).length * 10 }) }
  const lines = wrapText(ctx, 'ABCDEFGHIJK', 40)
  assert.deepEqual(lines, ['ABCD', 'EFGH', 'IJK'])
  assert.ok(lines.every(line => ctx.measureText(line).width <= 40))
})

test('empty text yields no rendered lines', () => {
  const ctx = { measureText: () => ({ width: 0 }) }
  assert.deepEqual(wrapText(ctx, '', 500), [])
})
