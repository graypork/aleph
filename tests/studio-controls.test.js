import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getExportMime } from '../src/studio/download.js'
import { renderStudioCanvas } from '../src/studio/renderer.js'

const html = readFileSync(new URL('../studio/index.html', import.meta.url), 'utf8')
const studioSource = readFileSync(new URL('../src/studio/studio.js', import.meta.url), 'utf8')
const downloadSource = readFileSync(new URL('../src/studio/download.js', import.meta.url), 'utf8')

test('editor controls expose declared aspect values and safe numeric ranges', () => {
  for (const aspect of ['1:1', '4:5', '9:16']) assert.match(html, new RegExp(`data-aspect=["']${aspect.replace(':', '\\:')}["']`))
  assert.match(html, /id="text-x"[^>]*min="0"[^>]*max="100"/)
  assert.match(html, /id="text-y"[^>]*min="0"[^>]*max="100"/)
  assert.match(html, /id="text-size"[^>]*min="24"[^>]*max="180"/)
})

test('export MIME mapping only permits PNG and JPEG', () => {
  assert.equal(getExportMime('png'), 'image/png')
  assert.equal(getExportMime('jpeg'), 'image/jpeg')
  assert.throws(() => getExportMime('webp'), /지원하지 않는 내보내기 형식/)
})

test('shared renderStudioCanvas sets exact logical dimensions and draws once', () => {
  const calls = []
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      save(){}, restore(){}, clearRect(){}, fillRect(){},
      createLinearGradient(){ return { addColorStop(){} } },
      measureText(value){ return { width: String(value).length * 10 } },
      fillText(...args){ calls.push(args) },
    }),
  }
  renderStudioCanvas(canvas, {
    aspect: '4:5',
    text: { content: '테스트', x: 50, y: 50, size: 72, color: '#ffffff' },
  }, null)
  assert.equal(canvas.width, 1080)
  assert.equal(canvas.height, 1350)
  assert.equal(calls.length, 1)
})

test('preview and export both use the same shared canvas renderer', () => {
  assert.match(studioSource, /renderStudioCanvas\(previewCanvas,\s*state,/)
  assert.match(downloadSource, /renderStudioCanvas\(canvas,\s*state,/)
})
