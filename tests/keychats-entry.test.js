import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

function read(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : ''
}

test('public intro keeps the Keychats entry point and /chats proxy rewrites', () => {
  const linkSource = read('src/assignment-link.js')
  const linkCss = read('src/assignment-link.css')
  const vercel = read('vercel.json')

  assert.match(linkSource, /href\s*=\s*['"]\/chats['"]|\.href\s*=\s*['"]\/chats['"]/)
  assert.match(linkSource, /Keychats 들어가기/)
  assert.match(linkSource, /keychats-entry-link/)
  assert.match(linkCss, /\.keychats-entry-link\s*\{[\s\S]*background:\s*var\(--accent\)/)
  assert.match(linkCss, /\.keychats-entry-link\s*\{[\s\S]*color:\s*var\(--light\)/)
  assert.match(vercel, /"source"\s*:\s*"\/chats"/)
  assert.match(vercel, /"destination"\s*:\s*"https:\/\/keychats\.vercel\.app\/chats"/)
  assert.match(vercel, /"source"\s*:\s*"\/chats\/:path\*"/)
})

test('Keychats CTA sits in the desktop hero right-side space and returns to flow on smaller screens', () => {
  const linkCss = read('src/assignment-link.css')

  assert.match(linkCss, /\.hero\s*\{[\s\S]*position:\s*relative/)
  assert.match(linkCss, /\.keychats-entry-link\s*\{[\s\S]*position:\s*absolute/)
  assert.match(linkCss, /\.keychats-entry-link\s*\{[\s\S]*right:\s*clamp\(/)
  assert.match(linkCss, /\.keychats-entry-link\s*\{[\s\S]*top:\s*45%/)
  assert.match(linkCss, /@media\s*\(max-width:\s*1000px\)[\s\S]*\.keychats-entry-link\s*\{[\s\S]*position:\s*static/)
})
