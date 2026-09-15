import { validateTemplateStore } from './template-schema.js'

export const JSON_SYNTAX_MESSAGE = 'JSON 문법이 올바르지 않습니다. 기존 템플릿은 유지됩니다.'
export const JSON_SCHEMA_MESSAGE = '필수 항목이 빠졌거나 형식이 올바르지 않습니다. 기존 템플릿은 유지됩니다.'

export function serializeTemplateStore(store) {
  const validation = validateTemplateStore(store)
  if (!validation.ok) throw new Error(JSON_SCHEMA_MESSAGE)
  return JSON.stringify(validation.value, null, 2)
}

export function parseTemplateImport(text) {
  let parsed
  try {
    parsed = JSON.parse(String(text))
  } catch {
    return { ok: false, type: 'syntax', message: JSON_SYNTAX_MESSAGE }
  }

  const validation = validateTemplateStore(parsed)
  if (!validation.ok) return { ok: false, type: 'schema', message: JSON_SCHEMA_MESSAGE }
  return { ok: true, value: validation.value }
}
