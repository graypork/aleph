import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('studio entry exposes first-screen image and text editing controls', async () => {
  const html = await read('studio/index.html')
  for (const id of ['image-input','text-input','text-x','text-y','text-size','text-color','aspect-controls','preview-canvas','template-list','studio-status']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`)
  }
  assert.match(html, /PNG|JPEG/)
  assert.match(html, /문구/)
})

test('vite registers studio as a third entry', async () => {
  const config = await read('vite.config.js')
  assert.match(config, /studio\s*:\s*resolve\(root,\s*['"]studio\/index\.html['"]\)/)
})

test('home assignment navigation keeps assignment 02 and adds assignment 03', async () => {
  const source = await read('src/assignment-link.js')
  assert.match(source, /ASSIGNMENT 02/)
  assert.match(source, /href\s*=\s*['"]\/play\/['"]/)
  assert.match(source, /ASSIGNMENT 03/)
  assert.match(source, /href\s*=\s*['"]\/studio\/['"]/)
})

test('studio exposes template CRUD, JSON transfer, and PNG/JPEG export actions without auth UI', async () => {
  const html = await read('studio/index.html')
  for (const id of ['template-name','template-create','template-update','json-export','json-import','download-png','download-jpeg']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`)
  }
  assert.doesNotMatch(html, /로그인|회원가입|OAuth|CAPTCHA|password/i)
})

test('declared invalid-file and invalid-JSON reasons are present in production source', async () => {
  const imageLoader = await read('src/studio/image-loader.js')
  const jsonTransfer = await read('src/studio/json-transfer.js')
  assert.match(imageLoader, /지원하지 않는 파일입니다\. PNG 또는 JPEG 파일을 사용해주세요\./)
  assert.match(imageLoader, /이미지를 읽을 수 없습니다\. 다른 PNG\/JPEG 파일을 사용해주세요\./)
  assert.match(jsonTransfer, /JSON 문법이 올바르지 않습니다\. 기존 템플릿은 유지됩니다\./)
  assert.match(jsonTransfer, /필수 항목이 빠졌거나 형식이 올바르지 않습니다\. 기존 템플릿은 유지됩니다\./)
})

test('new public studio files contain no known personal identifiers or raw secret assignments', async () => {
  const paths = [
    'studio/index.html',
    'src/studio/studio.js',
    'src/studio/studio.css',
    'src/studio/state.js',
    'src/studio/renderer.js',
    'src/studio/image-loader.js',
    'src/studio/download.js',
    'src/studio/templates.js',
    'src/studio/template-schema.js',
    'src/studio/json-transfer.js',
    'evidence/card-studio-extreme-inputs.md',
    'evidence/card-studio-rights.md',
  ]
  const combined = (await Promise.all(paths.map(read))).join('\n')
  assert.doesNotMatch(combined, /황건희|Geonhee|hgh0759|miles@/i)
  assert.doesNotMatch(combined, /(API_KEY|SECRET|TOKEN|PASSWORD)\s*=\s*["'][^"']+["']/i)
})

test('assignment handoff guide exists and names the final public route', async () => {
  const guide = await read('APPLY-FIX-ASSIGNMENT-03.md')
  assert.match(guide, /https:\/\/whogh\.vercel\.app\/studio\//)
  assert.match(guide, /node --test tests\/\*\.test\.js/)
  assert.match(guide, /npm run build/)
})
