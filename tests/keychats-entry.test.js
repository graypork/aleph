import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

function read(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : ''
}

test('public intro keeps the Keychats entry point and /chats proxy rewrites', () => {
  const html = read('index.html')
  const vercel = read('vercel.json')

  assert.match(html, /href=["']\/chats["']/)
  assert.match(html, /Keychats 들어가기/)
  assert.match(vercel, /"source"\s*:\s*"\/chats"/)
  assert.match(vercel, /"destination"\s*:\s*"https:\/\/keychats\.vercel\.app\/chats"/)
  assert.match(vercel, /"source"\s*:\s*"\/chats\/:path\*"/)
})
