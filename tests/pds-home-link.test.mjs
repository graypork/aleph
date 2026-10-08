import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/assignment-link.js', import.meta.url), 'utf8')

test('portfolio home exposes assignment 06 PlanDoSee link', () => {
  assert.match(source, /assignment06\.href\s*=\s*['"]\/pds\/['"]/)
  assert.match(source, /ASSIGNMENT 06/)
  assert.match(source, /PLANDOSEE DIARY/)
})
