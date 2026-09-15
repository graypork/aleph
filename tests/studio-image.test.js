import test from 'node:test'
import assert from 'node:assert/strict'
import { isSupportedImageType, validateImageFile, prepareImageFile } from '../src/studio/image-loader.js'

test('PNG and JPEG MIME types are accepted and unsupported files explain rejection', () => {
  assert.equal(isSupportedImageType('image/png'), true)
  assert.equal(isSupportedImageType('image/jpeg'), true)
  assert.equal(isSupportedImageType('text/plain'), false)
  assert.deepEqual(validateImageFile({ type: 'text/plain' }), {
    ok: false,
    reason: '지원하지 않는 파일입니다. PNG 또는 JPEG 파일을 사용해주세요.',
  })
})

test('unsupported input is rejected before decode and leaves caller state untouched', async () => {
  const prior = { image: { source: { width: 10, height: 10 }, fileName: 'before.png', mimeType: 'image/png' } }
  let decodeCalls = 0
  const result = await prepareImageFile(
    { type: 'text/plain', name: 'bad.txt' },
    async () => { decodeCalls += 1; return { width: 20, height: 20 } },
  )
  assert.equal(result.ok, false)
  assert.equal(decodeCalls, 0)
  assert.equal(prior.image.fileName, 'before.png')
  assert.equal(prior.image.source.width, 10)
})

test('valid image becomes a commit-ready candidate only after decode succeeds', async () => {
  const decoded = { width: 1200, height: 800 }
  const result = await prepareImageFile(
    { type: 'image/jpeg', name: 'photo.jpg' },
    async () => decoded,
  )
  assert.deepEqual(result, { ok: true, image: decoded, fileName: 'photo.jpg', mimeType: 'image/jpeg' })
})

test('decode failure reports reason without producing a replacement candidate', async () => {
  const result = await prepareImageFile(
    { type: 'image/png', name: 'broken.png' },
    async () => { throw new Error('decode failed') },
  )
  assert.deepEqual(result, {
    ok: false,
    reason: '이미지를 읽을 수 없습니다. 다른 PNG/JPEG 파일을 사용해주세요.',
  })
})
